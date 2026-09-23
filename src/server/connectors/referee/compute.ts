/**
 * Deterministic referee metrics (EWE-78).
 *
 * Cards, fouls and penalties are summed and averaged in code from an explicit
 * match sample. Zero and unknown denominators are handled without inventing
 * rates. Interpretation is optional and never claims a future decision.
 */
import type { DerivedMetric, EvidenceItem } from '@/domain/contracts';
import {
  REFEREE_MATCH_SAMPLE,
  REFEREE_SAMPLE_WINDOW,
  type RefereeMatchRecord,
} from '~/data/referee/sample';

export interface RefereeRate {
  readonly label: string;
  readonly total: number;
  readonly matchesInDenominator: number;
  readonly perMatch: number | null;
  readonly unit: string;
  readonly limitation: string | null;
}

export interface RefereeSummary {
  readonly refereeId: string;
  readonly refereeName: string;
  readonly competition: string;
  readonly window: { readonly from: string; readonly to: string };
  readonly matchCount: number;
  readonly coverageNote: string;
  readonly limitations: string;
  readonly rates: {
    readonly yellowCards: RefereeRate;
    readonly redCards: RefereeRate;
    readonly fouls: RefereeRate;
    readonly penalties: RefereeRate;
  };
  /** Only when a rate is high enough relative to the sample to matter for prep. */
  readonly interpretation: string | null;
}

function sum(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function perMatchRate(total: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number((total / denominator).toFixed(2));
}

function rate(
  label: string,
  total: number,
  denominator: number,
  unit: string,
  limitation: string | null = null,
): RefereeRate {
  return {
    label,
    total,
    matchesInDenominator: denominator,
    perMatch: perMatchRate(total, denominator),
    unit,
    limitation,
  };
}

/**
 * Compute referee context for a competition window.
 *
 * Records outside the competition or window are excluded and counted in
 * coverage notes rather than silently averaged in.
 */
export function computeRefereeSummary(
  records: readonly RefereeMatchRecord[] = REFEREE_MATCH_SAMPLE,
  window: typeof REFEREE_SAMPLE_WINDOW = REFEREE_SAMPLE_WINDOW,
): RefereeSummary {
  const inWindow = records.filter((record) => {
    if (record.competition !== window.competition) return false;
    if (record.referee_id !== window.referee_id) return false;
    const day = record.played_at.slice(0, 10);
    return day >= window.from && day <= window.to;
  });

  const excluded = records.length - inWindow.length;
  const yellows = sum(inWindow.map((record) => record.yellow_cards));
  const reds = sum(inWindow.map((record) => record.red_cards));
  const fouls = sum(inWindow.map((record) => record.fouls));

  const penaltyMatches = inWindow.filter((record) => record.penalties !== null);
  const penalties = sum(penaltyMatches.map((record) => record.penalties as number));
  const unknownPenalties = inWindow.length - penaltyMatches.length;

  const yellowRate = rate('Yellow cards per match', yellows, inWindow.length, 'cards/match');
  const redRate = rate('Red cards per match', reds, inWindow.length, 'cards/match');
  const foulRate = rate('Fouls per match', fouls, inWindow.length, 'fouls/match');
  const penaltyRate = rate(
    'Penalties awarded per match',
    penalties,
    penaltyMatches.length,
    'penalties/match',
    unknownPenalties > 0
      ? `${unknownPenalties} match(es) had unknown penalty counts and were excluded from this denominator.`
      : null,
  );

  // Interpretation only when the sample is non-empty and a prep-relevant pattern
  // is supported — never a prediction of the next match's decisions.
  let interpretation: string | null = null;
  if (inWindow.length >= 4 && yellowRate.perMatch !== null && yellowRate.perMatch >= 4) {
    interpretation =
      `${window.referee_name} averaged ${yellowRate.perMatch} yellow cards per match across ` +
      `${inWindow.length} ${window.competition} matches in ${window.from}–${window.to}. ` +
      'Treat as historical discipline volume for set-piece and challenge planning — not a forecast of any future call.';
  } else if (inWindow.length === 0) {
    interpretation = null;
  }

  return {
    refereeId: window.referee_id,
    refereeName: window.referee_name,
    competition: window.competition,
    window: { from: window.from, to: window.to },
    matchCount: inWindow.length,
    coverageNote:
      excluded === 0
        ? `All ${records.length} supplied records fall inside the competition and date window.`
        : `${inWindow.length} of ${records.length} records used; ${excluded} excluded for competition/date/referee mismatch.`,
    limitations: window.limitations,
    rates: {
      yellowCards: yellowRate,
      redCards: redRate,
      fouls: foulRate,
      penalties: penaltyRate,
    },
    interpretation,
  };
}

/** Convert computed rates into contract DerivedMetric values (code-owned numbers). */
export function refereeSummaryToMetrics(
  summary: RefereeSummary,
  evidenceIds: readonly string[],
): DerivedMetric[] {
  const metrics: DerivedMetric[] = [];
  const windowLabel = `${summary.competition}, ${summary.window.from} to ${summary.window.to}`;

  for (const entry of [
    summary.rates.yellowCards,
    summary.rates.redCards,
    summary.rates.fouls,
    summary.rates.penalties,
  ]) {
    if (entry.perMatch === null) continue;
    metrics.push({
      label: `${summary.refereeName}: ${entry.label}`,
      value: entry.perMatch,
      unit: entry.unit,
      sample_size: entry.matchesInDenominator,
      window: entry.limitation === null ? windowLabel : `${windowLabel}. ${entry.limitation}`,
      evidence_ids: [...evidenceIds],
    });
  }

  return metrics;
}

/**
 * Build a single evidence item that anchors referee metrics.
 *
 * Optional: callers that do not import this module leave the core demo unchanged.
 */
export function buildRefereeEvidenceItem(input: {
  readonly fixtureId: string;
  readonly summary: RefereeSummary;
  readonly retrievedAt: string;
}): EvidenceItem {
  const summary = input.summary;
  const excerpt =
    `${summary.refereeName} (${summary.refereeId}): ${summary.matchCount} matches in ` +
    `${summary.competition} from ${summary.window.from} to ${summary.window.to}. ` +
    `Yellows ${summary.rates.yellowCards.total}, reds ${summary.rates.redCards.total}, ` +
    `fouls ${summary.rates.fouls.total}, penalties ${summary.rates.penalties.total} ` +
    `(denominator ${summary.rates.penalties.matchesInDenominator}). ${summary.limitations}`;

  return {
    id: 'ev_referee_dale_window',
    fixture_id: input.fixtureId,
    subject_type: 'fixture',
    subject_id: null,
    category: 'discipline',
    claim: `Referee sample for ${summary.refereeName} in the documented competition window.`,
    value: {
      referee_id: summary.refereeId,
      match_count: summary.matchCount,
      yellow_total: summary.rates.yellowCards.total,
      red_total: summary.rates.redCards.total,
      foul_total: summary.rates.fouls.total,
      penalty_total: summary.rates.penalties.total,
      penalty_denominator: summary.rates.penalties.matchesInDenominator,
    },
    source: {
      name: 'Bounded referee sample (synthetic)',
      connector: 'referee_sample',
      url: null,
      record_id: 'referee-sample-dale-2026-q3',
      excerpt,
      origin_id: 'org_referee_sample_dale',
    },
    observed_at: `${summary.window.to}T23:59:00Z`,
    published_at: null,
    retrieved_at: input.retrievedAt,
    valid_for_fixture: true,
    data_mode: 'synthetic',
    status: 'accepted',
    conflicts_with: [],
    check_notes:
      'Totals reconcile to the bounded match sample in data/referee/sample.ts. Rates computed in code.',
  };
}
