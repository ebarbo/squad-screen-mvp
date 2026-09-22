import { type InputFingerprint, type FingerprintMismatch } from './fingerprint';
import { type CheckResult, type CheckId, type CheckOutcome } from './checks/types';
import { type EvalTelemetry, type AggregateMetric, type OutputOrigin } from './telemetry';
import { type EntailmentSummary, type ReviewRow } from './human-review';

/** How output was obtained. Carried into every record so a report can never blur the two. */
export type TransportMode = 'live' | 'recorded';

export interface ModelUnderTest {
  /** Stable slot name used in tables: the model ID may be long or change. */
  label: string;
  model_id: string;
  /** Where the ID came from, e.g. an env var name or `--models`. */
  source: string;
}

export interface StructuredError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface ExpectationDelta {
  check_id: CheckId;
  expected: CheckOutcome;
  actual: CheckOutcome;
}

export interface CaseRunRecord {
  case_id: string;
  model_label: string;
  model_id: string;
  repeat: number;
  transport_mode: TransportMode;
  /**
   * Stamped on every record and printed in every table, so output that never
   * came from a provider can never be mistaken for a measurement.
   */
  output_origin: OutputOrigin;
  input_fingerprint: InputFingerprint;
  /** Which player the scenario overrode, resolved at run time. */
  resolved_override_player_id: string | null;
  status: 'completed' | 'provider_error' | 'not_measured';
  error: StructuredError | null;
  telemetry: { base: EvalTelemetry; rerun: EvalTelemetry | null };
  checks: CheckResult[];
  /** Checks whose outcome differed from the case's declared expectation. */
  expectation_deltas: ExpectationDelta[];
  review_rows: ReviewRow[];
}

export interface ModelAggregate {
  model_label: string;
  model_id: string;
  runs: number;
  completed: number;
  errored: number;
  checks_passed: number;
  checks_failed: number;
  checks_not_applicable: number;
  checks_not_measured: number;
  /** Cases where every applicable check passed on every repeat. */
  cases_fully_compliant: number;
  cases_total: number;
  median_duration_ms: AggregateMetric;
  total_input_tokens: AggregateMetric;
  total_output_tokens: AggregateMetric;
  total_retries: AggregateMetric;
  total_calls: AggregateMetric;
  total_estimated_cost_usd: AggregateMetric;
}

export interface EvalRunReport {
  run_id: string;
  harness_version: string;
  started_at: string;
  finished_at: string;
  transport_mode: TransportMode;
  node_version: string;
  settings: unknown;
  prompt_version: string;
  models: ModelUnderTest[];
  case_ids: string[];
  repeats: number;
  /** Non-null only when every model saw byte-identical input. */
  shared_input_fingerprint: string | null;
  fingerprint_mismatches: FingerprintMismatch[];
  runs: CaseRunRecord[];
  aggregates: ModelAggregate[];
  human_review: EntailmentSummary;
  /** Printed verbatim at the top of every rendered report. */
  disclosures: string[];
}

export function tallyOutcomes(checks: readonly CheckResult[]): Record<CheckOutcome, number> {
  return {
    pass: checks.filter((c) => c.outcome === 'pass').length,
    fail: checks.filter((c) => c.outcome === 'fail').length,
    not_applicable: checks.filter((c) => c.outcome === 'not_applicable').length,
    not_measured: checks.filter((c) => c.outcome === 'not_measured').length,
  };
}

/**
 * A case counts as compliant only when no repeat failed and nothing went
 * unmeasured. `not_measured` is not a pass, so it disqualifies the case.
 */
export function isFullyCompliant(runs: readonly CaseRunRecord[]): boolean {
  if (runs.length === 0) return false;
  return runs.every(
    (run) =>
      run.status === 'completed' &&
      run.checks.every((c) => c.outcome === 'pass' || c.outcome === 'not_applicable'),
  );
}
