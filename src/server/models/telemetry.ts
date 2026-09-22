/**
 * Telemetry assembly.
 *
 * The governing rule: a number is reported only if it was observed. Token counts
 * come from the provider's `usage` object and from nowhere else — never
 * estimated from response length, which would badly misreport a reasoning model
 * that spends most of its completion tokens in a separate `reasoning` field.
 * When usage is absent the counts are null and `usage_note` says why.
 *
 * Cost is likewise derived only from an explicitly supplied price basis. This
 * API exposes no pricing endpoint, so if the operator has not entered prices
 * from the console, the honest answer is null with a reason.
 */
import type { Telemetry } from '@/domain/contracts';
import type { ProviderConfig } from '@/server/config/env';

export interface RawUsage {
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  /** Populated when the provider omitted or partially reported usage. */
  readonly note: string | null;
}

export const USAGE_UNAVAILABLE: RawUsage = {
  input_tokens: null,
  output_tokens: null,
  note: 'The provider did not return a usage object for this call.',
};

/**
 * Read usage from an OpenAI-compatible response.
 *
 * Reasoning models report their chain-of-thought tokens inside
 * `completion_tokens`, which is what we want: cost follows billed tokens, not
 * visible output.
 */
export function readUsage(usage: unknown): RawUsage {
  if (usage === null || typeof usage !== 'object') return USAGE_UNAVAILABLE;

  const record = usage as Record<string, unknown>;
  const input = typeof record.prompt_tokens === 'number' ? record.prompt_tokens : null;
  const output = typeof record.completion_tokens === 'number' ? record.completion_tokens : null;

  if (input === null && output === null) return USAGE_UNAVAILABLE;

  return {
    input_tokens: input,
    output_tokens: output,
    note:
      input === null || output === null
        ? 'The provider reported usage only partially; missing counts are null rather than assumed zero.'
        : null,
  };
}

/** Sum usage across every attempt, so retries are counted rather than discarded. */
export function sumUsage(attempts: readonly RawUsage[]): RawUsage {
  if (attempts.length === 0) return USAGE_UNAVAILABLE;

  const anyReported = attempts.some((a) => a.input_tokens !== null || a.output_tokens !== null);
  if (!anyReported) {
    // Keep the most specific explanation available. "No provider call was made"
    // says something quite different from "the provider omitted usage", and the
    // difference matters when reading a benchmark table.
    return { ...USAGE_UNAVAILABLE, note: attempts[0]?.note ?? USAGE_UNAVAILABLE.note };
  }

  const partial = attempts.some((a) => a.input_tokens === null || a.output_tokens === null);

  const total = (pick: (usage: RawUsage) => number | null): number | null => {
    const values = attempts.map(pick).filter((value): value is number => value !== null);
    return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
  };

  return {
    input_tokens: total((a) => a.input_tokens),
    output_tokens: total((a) => a.output_tokens),
    note: partial
      ? `Usage aggregated across ${attempts.length} call(s); at least one did not report complete counts.`
      : null,
  };
}

export interface CostEstimate {
  readonly usd: number | null;
  readonly basis: string;
}

/**
 * Estimate inference cost, or explain why it cannot be estimated.
 *
 * This is inference cost only. It is not total operating cost, and it must not
 * be presented as one.
 */
export function estimateCost(usage: RawUsage, config: ProviderConfig): CostEstimate {
  const { priceInputPerMTok, priceOutputPerMTok } = config;

  if (priceInputPerMTok === null || priceOutputPerMTok === null) {
    return {
      usd: null,
      basis:
        'Not estimated: SQUAD_SCREEN_PRICE_INPUT_PER_MTOK and SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK are unset. ' +
        'This API exposes no pricing endpoint, so prices must be taken from the Nebius console rather than inferred.',
    };
  }

  if (usage.input_tokens === null || usage.output_tokens === null) {
    return {
      usd: null,
      basis: 'Not estimated: the provider did not report complete token usage, so a cost would be a guess.',
    };
  }

  const usd =
    (usage.input_tokens / 1_000_000) * priceInputPerMTok + (usage.output_tokens / 1_000_000) * priceOutputPerMTok;

  return {
    usd,
    basis:
      `Inference only, from supplied prices: $${priceInputPerMTok}/Mtok input, $${priceOutputPerMTok}/Mtok output. ` +
      'Excludes all non-inference operating cost.',
  };
}

export interface BuildTelemetryInput {
  readonly modelId: string;
  readonly promptVersion: string;
  readonly transport: 'live' | 'stub';
  readonly durationMs: number;
  readonly attempts: readonly RawUsage[];
  readonly retryCount: number;
  readonly config: ProviderConfig;
}

export function buildTelemetry(input: BuildTelemetryInput): Telemetry {
  const usage = sumUsage(input.attempts);
  const cost = estimateCost(usage, input.config);

  return {
    model_id: input.modelId,
    prompt_version: input.promptVersion,
    transport: input.transport,
    duration_ms: Math.round(input.durationMs),
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    usage_note: usage.note,
    call_count: Math.max(1, input.attempts.length),
    retry_count: input.retryCount,
    pricing_basis: cost.basis,
    estimated_inference_cost_usd: cost.usd,
  };
}

/**
 * Rate-limit state as reported by the provider on each response.
 *
 * Read live rather than hard-coded: quotas differ per account and change
 * without notice, and a stale constant is worse than no number.
 */
export interface RateLimitSnapshot {
  readonly requestsRemaining: number | null;
  readonly tokensRemaining: number | null;
  /** Seconds until the request quota resets. */
  readonly resetRequestsSeconds: number | null;
  /** Seconds until the token quota resets. */
  readonly resetTokensSeconds: number | null;
}

const DURATION_UNIT_SECONDS: Record<string, number> = {
  ns: 1e-9,
  us: 1e-6,
  'µs': 1e-6,
  ms: 1e-3,
  s: 1,
  m: 60,
  h: 3600,
};

/**
 * Parse a duration in seconds.
 *
 * The reset headers carry Go-style duration strings — `"1s"`, `"500ms"`,
 * `"1m30s"` — not bare numbers, so `Number()` yields NaN and silently discards a
 * value the provider did report. Treating an observed value as unobserved is the
 * same class of error as inventing one, just in the other direction.
 *
 * A bare number is accepted and read as seconds, since not every provider uses
 * the suffixed form.
 */
export function parseDurationSeconds(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;

  const text = raw.trim();
  if (text.length === 0) return null;

  const bare = Number(text);
  if (Number.isFinite(bare)) return bare;

  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g)];
  if (matches.length === 0) return null;

  let seconds = 0;
  for (const match of matches) {
    const amount = Number(match[1]);
    const unit = DURATION_UNIT_SECONDS[match[2]!];
    if (!Number.isFinite(amount) || unit === undefined) return null;
    seconds += amount * unit;
  }

  return seconds;
}

export function readRateLimit(headers: Headers | undefined): RateLimitSnapshot {
  const count = (name: string): number | null => {
    const raw = headers?.get(name);
    if (raw === null || raw === undefined) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const duration = (name: string): number | null => parseDurationSeconds(headers?.get(name));

  return {
    requestsRemaining: count('x-ratelimit-remaining-requests'),
    tokensRemaining: count('x-ratelimit-remaining-tokens'),
    resetRequestsSeconds: duration('x-ratelimit-reset-requests'),
    resetTokensSeconds: duration('x-ratelimit-reset-tokens'),
  };
}
