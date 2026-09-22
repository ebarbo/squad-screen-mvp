import type {
  DataMode,
  EvidenceItem,
  EvidenceStatus,
  Recommendation,
  RunResult,
  Telemetry,
} from '@/domain/contracts';

/**
 * Derivations for the briefing view. Every number produced here is counted from
 * the response payload. Nothing is scored, scaled or estimated, and there is no
 * progress figure: the run either returned these records or it did not.
 */

/** The contract allows zero to three supported recommendations. */
export const MAX_RECOMMENDATIONS = 3;

export interface RecommendationPartition {
  visible: Recommendation[];
  /** Anything past the contract cap. A non-empty overflow means the response broke the contract. */
  overflow: Recommendation[];
}

export function partitionRecommendations(
  recommendations: readonly Recommendation[] | null | undefined,
): RecommendationPartition {
  const all = recommendations ?? [];
  return {
    visible: all.slice(0, MAX_RECOMMENDATIONS),
    overflow: all.slice(MAX_RECOMMENDATIONS),
  };
}

export interface EvidenceStatusCount {
  status: EvidenceStatus;
  count: number;
}

export interface RunCounts {
  recommendationCount: number;
  proposedCount: number;
  withdrawnCount: number;
  evidenceCount: number;
  /** Distinct `origin_id` values. Two copies of one report count once. */
  distinctOriginCount: number;
  distinctSourceNameCount: number;
  citedEvidenceCount: number;
  uncitedEvidenceCount: number;
  unresolvedConflictCount: number;
  statusCounts: EvidenceStatusCount[];
  dataModes: DataMode[];
  warningCount: number;
}

const STATUS_ORDER: readonly EvidenceStatus[] = [
  'accepted',
  'disputed',
  'stale',
  'missing',
  'unverified',
];

/** Unordered `conflicts_with` pairs, deduplicated so A↔B is counted once. */
export function unresolvedConflictKeys(evidence: readonly EvidenceItem[]): string[] {
  const keys = new Set<string>();
  for (const item of evidence) {
    for (const otherId of item.conflicts_with) {
      keys.add([item.id, otherId].sort().join('::'));
    }
  }
  return [...keys].sort();
}

export function countRun(run: {
  recommendations: readonly Recommendation[];
  evidence: readonly EvidenceItem[];
  warnings: readonly unknown[];
}): RunCounts {
  const { evidence, recommendations } = run;

  const cited = new Set<string>();
  for (const recommendation of recommendations) {
    for (const id of recommendation.evidence_ids) cited.add(id);
  }

  const statusTally = new Map<EvidenceStatus, number>();
  for (const item of evidence) {
    statusTally.set(item.status, (statusTally.get(item.status) ?? 0) + 1);
  }

  const knownIds = new Set(evidence.map((item) => item.id));

  return {
    recommendationCount: recommendations.length,
    proposedCount: recommendations.filter((item) => item.status === 'proposed').length,
    withdrawnCount: recommendations.filter((item) => item.status === 'withdrawn').length,
    evidenceCount: evidence.length,
    distinctOriginCount: new Set(evidence.map((item) => item.source.origin_id)).size,
    distinctSourceNameCount: new Set(evidence.map((item) => item.source.name)).size,
    citedEvidenceCount: evidence.filter((item) => cited.has(item.id)).length,
    uncitedEvidenceCount: evidence.filter((item) => !cited.has(item.id)).length,
    unresolvedConflictCount: unresolvedConflictKeys(evidence).filter((key) =>
      key.split('::').every((id) => knownIds.has(id)),
    ).length,
    statusCounts: STATUS_ORDER.filter((status) => statusTally.has(status)).map((status) => ({
      status,
      count: statusTally.get(status) ?? 0,
    })),
    dataModes: [...new Set(evidence.map((item) => item.data_mode))].sort(),
    warningCount: run.warnings.length,
  };
}

export interface TelemetryRow {
  label: string;
  /** `null` means the provider did not report it. The UI then shows `reason`, never a stand-in value. */
  value: string | null;
  reason: string | null;
}

function formatInteger(value: number | null): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-GB') : null;
}

export function describeTelemetry(telemetry: Telemetry | null): TelemetryRow[] {
  if (telemetry === null) {
    return [{ label: 'Telemetry', value: null, reason: 'No run has been generated yet' }];
  }

  const usageReason = telemetry.usage_note ?? 'The provider did not report usage';

  const rows: ReadonlyArray<readonly [string, string | null, string]> = [
    ['Model', telemetry.model_id, 'Not reported'],
    ['Prompt version', telemetry.prompt_version, 'Not reported'],
    ['Duration', `${(telemetry.duration_ms / 1000).toFixed(2)} s`, 'Not reported'],
    ['Input tokens', formatInteger(telemetry.input_tokens), usageReason],
    ['Output tokens', formatInteger(telemetry.output_tokens), usageReason],
    ['Calls (including retries)', formatInteger(telemetry.call_count), 'Not reported'],
    ['Retries', formatInteger(telemetry.retry_count), 'Not reported'],
    ['Pricing basis', telemetry.pricing_basis, 'Not reported'],
    [
      'Estimated inference cost',
      telemetry.estimated_inference_cost_usd === null
        ? null
        : `$${telemetry.estimated_inference_cost_usd.toFixed(4)}`,
      telemetry.pricing_basis,
    ],
  ];

  return rows.map(([label, value, reason]) => ({
    label,
    value,
    reason: value === null ? reason : null,
  }));
}

export type BriefingOutcome = 'recommended' | 'abstained';

/**
 * Zero recommendations is a supported result, not a failure: the contract
 * requires abstention over padding the list.
 */
export function briefingOutcome(run: { recommendations: readonly Recommendation[] }): BriefingOutcome {
  return run.recommendations.length === 0 ? 'abstained' : 'recommended';
}

/**
 * True when the run did not come from a real provider call. The UI must say so
 * rather than let a stub response read as completed live inference.
 */
export function isStubRun(run: Pick<RunResult, 'telemetry'> | null): boolean {
  return run?.telemetry.transport === 'stub';
}

export function formatTimestamp(value: string | null): string {
  if (value === null || value.length === 0) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const formatted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(parsed);
  return `${formatted} UTC`;
}

export function formatDateOnly(value: string | null): string {
  if (value === null || value.length === 0) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed);
}

export const DATA_MODE_LABEL: Record<DataMode, string> = {
  synthetic: 'Synthetic',
  snapshot: 'Saved snapshot',
  live: 'Live source',
};

export const DATA_MODE_DESCRIPTION: Record<DataMode, string> = {
  synthetic: 'Fictional club-side input written for this demo. Not a real player record.',
  snapshot: 'A dated copy of a public source, retrieved once and then frozen.',
  live: 'Read from the source during this run.',
};
