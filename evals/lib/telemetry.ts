/**
 * Metric handling for the harness.
 *
 * One rule governs this file: a figure that was not measured is `null` with a
 * stated reason. Nothing here estimates latency from tokens, tokens from text
 * length, or cost from anything other than reported usage multiplied by an
 * explicitly configured price. See rubric.md §4.
 */

export interface PricingBasis {
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  source: string;
}

/**
 * Only `live` is a measurement. `stub` is the model adapter's own offline
 * transport, `recorded` is a saved real response, `authored` is a fixture
 * written by hand. Everything except `live` is reported as unmeasured.
 */
export type OutputOrigin = 'live' | 'stub' | 'recorded' | 'authored';

export interface EvalTelemetry {
  origin: OutputOrigin;
  model_id: string;
  prompt_version: string;
  /** Wall clock around the provider call. */
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  /** Retries preceding the final attempt. */
  retries: number | null;
  /** Total provider calls including retries and failures. */
  calls: number | null;
  pricing_basis: PricingBasis | null;
  estimated_inference_cost_usd: number | null;
  /** Keyed by the field that is null; every null field has an entry. */
  unavailable_reasons: Record<string, string>;
}

const METRIC_FIELDS = [
  'duration_ms',
  'input_tokens',
  'output_tokens',
  'retries',
  'calls',
  'estimated_inference_cost_usd',
] as const;

/** Telemetry for output that never produced a real measurement. Every metric is null. */
export function unmeasuredTelemetry(
  origin: Exclude<OutputOrigin, 'live'>,
  model_id: string,
  prompt_version: string,
  reason: string,
): EvalTelemetry {
  return {
    origin,
    model_id,
    prompt_version,
    duration_ms: null,
    input_tokens: null,
    output_tokens: null,
    retries: null,
    calls: null,
    pricing_basis: null,
    estimated_inference_cost_usd: null,
    unavailable_reasons: Object.fromEntries(METRIC_FIELDS.map((f) => [f, reason])),
  };
}

export interface CostEstimate {
  usd: number | null;
  reason: string | null;
}

export function estimateInferenceCost(
  input_tokens: number | null,
  output_tokens: number | null,
  pricing: PricingBasis | null,
): CostEstimate {
  if (pricing === null) {
    return {
      usd: null,
      reason:
        'No pricing basis configured (SQUAD_SCREEN_PRICE_INPUT_PER_MTOK / SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK unset).',
    };
  }
  if (input_tokens === null || output_tokens === null) {
    return {
      usd: null,
      reason: 'Provider did not report token usage, so cost cannot be computed from usage.',
    };
  }
  const usd =
    (input_tokens * pricing.input_usd_per_mtok + output_tokens * pricing.output_usd_per_mtok) /
    1_000_000;
  return { usd, reason: null };
}

/** Reads the pricing basis from the environment. Absent or unparseable means absent. */
export function pricingBasisFromEnv(env: NodeJS.ProcessEnv = process.env): PricingBasis | null {
  const input = Number(env.SQUAD_SCREEN_PRICE_INPUT_PER_MTOK);
  const output = Number(env.SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK);
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;
  return {
    input_usd_per_mtok: input,
    output_usd_per_mtok: output,
    source: 'SQUAD_SCREEN_PRICE_INPUT_PER_MTOK / SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK',
  };
}

export interface AggregateMetric {
  value: number | null;
  /** Runs that contributed a value. Zero means the aggregate is not measured. */
  measured_runs: number;
  total_runs: number;
  reason: string | null;
}

/**
 * Sums a metric across runs. Partial coverage never silently becomes a total:
 * if any run is missing the field the aggregate is null and says how many runs
 * were missing it.
 */
export function sumMetric(
  runs: readonly EvalTelemetry[],
  field: (typeof METRIC_FIELDS)[number],
): AggregateMetric {
  const values = runs.map((r) => r[field]).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return {
      value: null,
      measured_runs: 0,
      total_runs: runs.length,
      reason: `No run reported ${field}.`,
    };
  }
  if (values.length < runs.length) {
    return {
      value: null,
      measured_runs: values.length,
      total_runs: runs.length,
      reason: `${runs.length - values.length} of ${runs.length} runs did not report ${field}; a partial sum would misstate the total.`,
    };
  }
  return {
    value: values.reduce((a, b) => a + b, 0),
    measured_runs: values.length,
    total_runs: runs.length,
    reason: null,
  };
}

/** Median rather than mean: two repeats per case make the mean noise-sensitive. */
export function medianMetric(
  runs: readonly EvalTelemetry[],
  field: (typeof METRIC_FIELDS)[number],
): AggregateMetric {
  const values = runs
    .map((r) => r[field])
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (values.length === 0) {
    return {
      value: null,
      measured_runs: 0,
      total_runs: runs.length,
      reason: `No run reported ${field}.`,
    };
  }
  const mid = Math.floor(values.length / 2);
  const upper = values[mid] as number;
  const lower = values[mid - 1] ?? upper;
  const value = values.length % 2 === 0 ? (lower + upper) / 2 : upper;
  return {
    value,
    measured_runs: values.length,
    total_runs: runs.length,
    reason:
      values.length < runs.length
        ? `${runs.length - values.length} of ${runs.length} runs did not report ${field}; the median covers the rest.`
        : null,
  };
}

/** Renders a metric for a report cell. Never prints a number that was not measured. */
export function formatMetric(metric: AggregateMetric, unit = ''): string {
  if (metric.value === null) return 'not measured';
  const rendered = Number.isInteger(metric.value)
    ? String(metric.value)
    : metric.value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return unit ? `${rendered}${unit}` : rendered;
}
