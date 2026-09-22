/**
 * Evidence rules (EWE-64).
 *
 * This is where the system decides what it believes, and — more importantly —
 * what it refuses to decide. Three rules, applied in order:
 *
 *   1. **Collapse shared origins.** Two outlets carrying one agency report are
 *      one source. Counting them twice would manufacture corroboration out of
 *      syndication, which is the single easiest way for a system like this to
 *      be confidently wrong.
 *
 *   2. **Supersede within an origin.** When one source updates itself, the later
 *      record wins and the earlier is marked `stale` — not deleted. The
 *      disagreement stays inspectable.
 *
 *   3. **Leave cross-origin disagreement unresolved.** When two independent
 *      sources contradict each other and no documented rule settles it, both
 *      are marked `disputed` and the conflict is surfaced. There is deliberately
 *      no averaging step here: a blended number would hide exactly the thing an
 *      analyst needs to see.
 */
import type { DerivedMetric, EvidenceConflict, EvidenceItem, Warning } from '@/domain/contracts';
import { readAvailability } from './adapters';

export interface RuleResult {
  readonly evidence: readonly EvidenceItem[];
  readonly conflicts: readonly EvidenceConflict[];
  readonly warnings: readonly Warning[];
  /** Distinct origins backing each subject, after collapsing duplicates. */
  readonly corroboration: ReadonlyMap<string, number>;
}

function claimKey(item: EvidenceItem): string {
  return `${item.source.origin_id}::${item.source.excerpt.trim().toLowerCase()}`;
}

/**
 * Collapse records that repeat one original report.
 *
 * Two items are duplicates when they share an origin *and* carry substantially
 * the same excerpt. Sharing an origin alone is not enough: a club site
 * legitimately publishes several distinct statements.
 */
function collapseSharedOrigins(items: readonly EvidenceItem[]): {
  kept: EvidenceItem[];
  warnings: Warning[];
} {
  const byClaim = new Map<string, EvidenceItem[]>();

  for (const item of items) {
    const key = claimKey(item);
    const group = byClaim.get(key);
    if (group === undefined) byClaim.set(key, [item]);
    else group.push(item);
  }

  const kept: EvidenceItem[] = [];
  const warnings: Warning[] = [];

  for (const group of byClaim.values()) {
    if (group.length === 1) {
      kept.push(group[0]!);
      continue;
    }

    // Keep the earliest publication: it is the one closest to the original
    // reporting, and the later copies add no independent information.
    const ordered = [...group].sort(
      (a, b) => new Date(a.published_at ?? a.observed_at).getTime() - new Date(b.published_at ?? b.observed_at).getTime(),
    );
    const canonical = ordered[0]!;
    const duplicates = ordered.slice(1);

    kept.push({
      ...canonical,
      check_notes:
        `One source. ${duplicates.length} further outlet(s) carry the same text under origin ` +
        `${canonical.source.origin_id} (${duplicates.map((d) => d.source.name).join(', ')}), ` +
        'so they are not counted as independent corroboration.',
    });

    warnings.push({
      code: 'duplicate_origin_collapsed',
      message:
        `${group.length} items share origin ${canonical.source.origin_id} and the same excerpt; ` +
        'they are counted as one source.',
      related_ids: group.map((item) => item.id),
    });
  }

  return { kept, warnings };
}

interface AvailabilityClaim {
  readonly item: EvidenceItem;
  readonly availability: string;
}

/** Apply supersession and disagreement rules to availability claims. */
function resolveAvailability(items: readonly EvidenceItem[]): {
  statuses: Map<string, { status: EvidenceItem['status']; note: string; conflictsWith: string[] }>;
  conflicts: EvidenceConflict[];
  warnings: Warning[];
} {
  const statuses = new Map<string, { status: EvidenceItem['status']; note: string; conflictsWith: string[] }>();
  const conflicts: EvidenceConflict[] = [];
  const warnings: Warning[] = [];

  const bySubject = new Map<string, AvailabilityClaim[]>();
  for (const item of items) {
    const availability = readAvailability(item);
    if (availability === null || item.subject_id === null) continue;
    const group = bySubject.get(item.subject_id) ?? [];
    group.push({ item, availability });
    bySubject.set(item.subject_id, group);
  }

  for (const [subjectId, claims] of bySubject) {
    if (claims.length < 2) continue;

    const distinct = new Set(claims.map((claim) => claim.availability));
    if (distinct.size < 2) continue; // Agreement needs no adjudication.

    const sameOrigin = new Set(claims.map((claim) => claim.item.source.origin_id)).size === 1;

    if (sameOrigin) {
      // One source updating itself. Documented freshness rule: later wins.
      const ordered = [...claims].sort(
        (a, b) => new Date(b.item.observed_at).getTime() - new Date(a.item.observed_at).getTime(),
      );
      const [newest, ...superseded] = ordered;

      statuses.set(newest!.item.id, {
        status: 'accepted',
        note: 'Most recent availability record from this source.',
        conflictsWith: superseded.map((claim) => claim.item.id),
      });

      for (const claim of superseded) {
        statuses.set(claim.item.id, {
          status: 'stale',
          note:
            `Superseded by a later record from the same source (${newest!.item.source.record_id ?? newest!.item.id}). ` +
            'Retained so the change remains inspectable.',
          conflictsWith: [newest!.item.id],
        });
      }

      conflicts.push({
        evidence_ids: ordered.map((claim) => claim.item.id),
        subject_id: subjectId,
        summary: `Availability for ${subjectId} changed within one source: ${ordered
          .map((claim) => claim.availability)
          .join(' <- ')}.`,
        resolution: 'Later record from the same source takes precedence; earlier record marked stale, not removed.',
      });
    } else {
      // Independent sources disagreeing. Nothing here settles it, so nothing
      // pretends to.
      for (const claim of claims) {
        statuses.set(claim.item.id, {
          status: 'disputed',
          note: 'Contradicted by another independent source. No documented rule resolves this disagreement.',
          conflictsWith: claims.filter((other) => other.item.id !== claim.item.id).map((other) => other.item.id),
        });
      }

      conflicts.push({
        evidence_ids: claims.map((claim) => claim.item.id),
        subject_id: subjectId,
        summary: `Independent sources disagree on availability for ${subjectId}: ${claims
          .map((claim) => `${claim.item.source.name} says ${claim.availability}`)
          .join('; ')}.`,
        resolution: null,
      });

      warnings.push({
        code: 'evidence_conflict',
        message: `Unresolved availability disagreement for ${subjectId}. Both records are shown.`,
        related_ids: claims.map((claim) => claim.item.id),
      });
    }
  }

  return { statuses, conflicts, warnings };
}

export function applyEvidenceRules(items: readonly EvidenceItem[]): RuleResult {
  const { kept, warnings: dedupWarnings } = collapseSharedOrigins(items);
  const { statuses, conflicts, warnings: conflictWarnings } = resolveAvailability(kept);

  const evidence = kept.map((item) => {
    // An item can be both a collapsed duplicate and a disputed claim. Those are
    // two independent facts about it, so the notes accumulate rather than the
    // later rule overwriting the earlier one.
    const dedupNote = item.check_notes === 'Not yet evaluated.' ? null : item.check_notes;
    const decision = statuses.get(item.id);

    if (decision === undefined) {
      const accepted = 'Checked against the supplied source. Accepted means the excerpt says this, not that it is true.';
      return {
        ...item,
        status: 'accepted' as const,
        check_notes: dedupNote === null ? accepted : `${dedupNote} ${accepted}`,
      };
    }

    return {
      ...item,
      status: decision.status,
      conflicts_with: decision.conflictsWith,
      check_notes: dedupNote === null ? decision.note : `${dedupNote} ${decision.note}`,
    };
  });

  // Corroboration counts distinct origins, so syndicated copies cannot inflate it.
  const corroboration = new Map<string, number>();
  for (const item of evidence) {
    if (item.subject_id === null) continue;
    const origins = new Set<string>();
    for (const other of evidence) {
      if (other.subject_id === item.subject_id && other.category === item.category) {
        origins.add(other.source.origin_id);
      }
    }
    corroboration.set(`${item.subject_id}::${item.category}`, origins.size);
  }

  return {
    evidence,
    conflicts,
    warnings: [...dedupWarnings, ...conflictWarnings],
    corroboration,
  };
}

/**
 * Compute descriptive metrics in code from explicitly bounded samples.
 *
 * Every figure states its denominator and how many matches it came from. A
 * model is never asked to produce a number, because a number produced by a
 * model is a number nobody counted.
 */
export function deriveMetrics(items: readonly EvidenceItem[]): DerivedMetric[] {
  const metrics: DerivedMetric[] = [];

  for (const item of items) {
    if (item.value === null || typeof item.value !== 'object') continue;

    const value = item.value as Record<string, unknown>;
    const high = value.high_positions;
    const reviewed = value.build_ups_reviewed;
    const matches = value.matches_sampled;

    if (typeof high === 'number' && typeof reviewed === 'number' && typeof matches === 'number') {
      if (reviewed === 0) continue; // No denominator, no rate.
      metrics.push({
        label: 'Opponent full-back advanced beyond halfway, share of reviewed build-ups',
        value: Number(((high / reviewed) * 100).toFixed(1)),
        unit: '% of reviewed build-ups',
        sample_size: matches,
        window: `${matches} reviewed match(es), counted over ${reviewed} build-up sequences`,
        evidence_ids: [item.id],
      });
    }
  }

  return metrics;
}
