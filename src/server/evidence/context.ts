/**
 * Evidence snapshot and match context (EWE-64).
 *
 * The snapshot ID is a content hash of the evidence set, which gives the
 * immutability invariant teeth: if a scenario re-run produced a different
 * snapshot ID, the base facts moved, and that is a bug rather than a nuance.
 * Comparing IDs is enough to detect it.
 *
 * Contexts are deep-frozen before they leave this module. Freezing is what turns
 * "we intend not to mutate the base run" into something the runtime enforces —
 * the scenario layer has to copy, because it cannot write.
 */
import { createHash } from 'node:crypto';
import type {
  BaseMatchContext,
  ClubPlayer,
  DerivedMetric,
  EvidenceConflict,
  EvidenceItem,
  Fixture,
  MissingInformation,
  PlayerCapability,
  StaffConstraint,
  Team,
  Warning,
} from '@/domain/contracts';
import type { RosterEntry } from '~/data/demo/squad';
import type { SourceRecord } from '~/data/sources/types';
import { adaptRecords, readAvailability } from './adapters';
import { applyEvidenceRules, deriveMetrics } from './rules';

/**
 * Deterministic ID over the evidence that matters to a consumer. Retrieval time
 * is excluded on purpose: re-reading the same sources should not invalidate a
 * snapshot.
 */
export function computeSnapshotId(evidence: readonly EvidenceItem[]): string {
  const material = [...evidence]
    .map((item) => `${item.id}|${item.status}|${item.claim}|${item.source.origin_id}|${item.observed_at}`)
    .sort()
    .join('\n');

  return `snap_${createHash('sha256').update(material).digest('hex').slice(0, 16)}`;
}

/** Recursively freeze, so a nested write fails as loudly as a top-level one. */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return Object.freeze(value);
}

function buildPlayers(roster: readonly RosterEntry[], evidence: readonly EvidenceItem[]): ClubPlayer[] {
  return roster.map((entry) => {
    const own = evidence.filter((item) => item.subject_id === entry.id);

    // Availability comes from the accepted record. A disputed or stale record
    // deliberately does not set it: when sources disagree, the honest state is
    // "monitor", not whichever record happened to be read last.
    const availabilityItems = own.filter((item) => item.category === 'availability');
    const accepted = availabilityItems.find((item) => item.status === 'accepted');
    const disputed = availabilityItems.some((item) => item.status === 'disputed');

    const availability = disputed ? 'monitor' : (readAvailability(accepted ?? availabilityItems[0] ?? own[0]!) ?? 'monitor');

    const constraintItem = own.find((item) => item.category === 'constraint');
    let constraint: StaffConstraint | null = null;
    if (constraintItem !== undefined) {
      const raw = constraintItem.value;
      const maxMinutes =
        raw !== null && typeof raw === 'object' && typeof raw.max_minutes === 'number' ? raw.max_minutes : null;
      constraint = {
        id: `con_${entry.id.replace(/^pl_/, '')}_minutes`,
        player_id: entry.id,
        max_minutes: maxMinutes,
        note: constraintItem.claim,
        evidence_ids: [constraintItem.id],
      };
    }

    const capabilities: PlayerCapability[] = own
      .filter((item) => item.category === 'capability')
      .map((item) => {
        const raw = item.value;
        const label =
          raw !== null && typeof raw === 'object' && typeof raw.capability === 'string' ? raw.capability : 'observed';
        return { label, detail: item.claim, evidence_ids: [item.id] };
      });

    return {
      id: entry.id,
      display_name: entry.display_name,
      position: entry.position,
      availability,
      staff_constraint: constraint,
      capabilities,
      availability_evidence_ids: availabilityItems.map((item) => item.id),
    };
  });
}

/**
 * Record what the packet does not contain.
 *
 * A player who is available but has no capability observation is the case that
 * matters: the system can say he is available and must not say what he is good
 * at, because nobody wrote it down.
 */
function findMissingInformation(players: readonly ClubPlayer[], conflicts: readonly EvidenceConflict[]): MissingInformation[] {
  const missing: MissingInformation[] = [];

  for (const player of players) {
    if (player.availability !== 'unavailable' && player.capabilities.length === 0) {
      missing.push({
        topic: `No supplied capability observation for ${player.display_name}`,
        detail:
          `${player.display_name} is selectable, but the packet contains no coach or analyst observation of what he ` +
          'does well. Any role proposed for him would be unsupported.',
        would_be_resolved_by: 'A staff observation recorded against this player.',
      });
    }
  }

  for (const conflict of conflicts) {
    if (conflict.resolution === null) {
      missing.push({
        topic: `Unresolved disagreement about ${conflict.subject_id ?? 'the fixture'}`,
        detail: conflict.summary,
        would_be_resolved_by: 'A later authoritative statement, or the published team sheet.',
      });
    }
  }

  return missing;
}

export interface BuildContextInput {
  readonly fixture: Fixture;
  readonly ownTeam: Team;
  readonly opponentTeam: Team;
  readonly roster: readonly RosterEntry[];
  readonly records: readonly SourceRecord[];
  readonly asOf: string;
  readonly retrievedAt: string;
}

export interface BuildContextResult {
  readonly context: BaseMatchContext;
  readonly warnings: readonly Warning[];
  readonly derivedMetrics: readonly DerivedMetric[];
}

export function buildBaseContext(input: BuildContextInput): BuildContextResult {
  const { evidence: adapted, excludedAfterCutoff } = adaptRecords(input.records, {
    fixtureId: input.fixture.id,
    informationCutoff: input.fixture.information_cutoff,
    retrievedAt: input.retrievedAt,
  });

  const { evidence, conflicts, warnings: ruleWarnings } = applyEvidenceRules(adapted);
  const derivedMetrics = deriveMetrics(evidence);
  const players = buildPlayers(input.roster, evidence);
  const missingInformation = findMissingInformation(players, conflicts);

  const warnings: Warning[] = [...ruleWarnings];

  if (excludedAfterCutoff.length > 0) {
    warnings.push({
      code: 'stale_evidence',
      message: `${excludedAfterCutoff.length} record(s) were excluded for falling after the information cutoff.`,
      related_ids: [...excludedAfterCutoff],
    });
  }

  if (missingInformation.length > 0) {
    warnings.push({
      code: 'missing_evidence',
      message: `${missingInformation.length} gap(s) in the packet are recorded and shown.`,
      related_ids: [],
    });
  }

  const context: BaseMatchContext = {
    kind: 'base',
    fixture: input.fixture,
    evidence_snapshot_id: computeSnapshotId(evidence),
    as_of: input.asOf,
    own_team: { team: input.ownTeam, players },
    opponent: {
      team: input.opponentTeam,
      observations: evidence
        .filter((item) => item.subject_type === 'opponent' || item.subject_id === input.opponentTeam.id)
        .map((item) => item.id),
      derived_metrics: derivedMetrics,
    },
    external_context: evidence.filter((item) => item.data_mode === 'snapshot').map((item) => item.id),
    evidence: [...evidence],
    constraints: players.flatMap((player) => (player.staff_constraint === null ? [] : [player.staff_constraint])),
    conflicts: [...conflicts],
    missing_information: missingInformation,
  };

  return { context: deepFreeze(context), warnings, derivedMetrics };
}
