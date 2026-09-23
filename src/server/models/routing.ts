/**
 * Extraction / synthesis model routing (EWE-77).
 *
 * Routing is optional. The default remains the simpler single-model synthesis
 * path unless a measured comparison shows a useful trade-off. Configuration
 * lives here so the comparison can isolate the routing change from prompt and
 * packet differences.
 */
import {
  DEFAULT_COMPARISON_MODEL_ID,
  DEFAULT_MODEL_ID,
  type ProviderConfig,
} from '@/server/config/env';

export const ROUTING_MODES = ['single', 'extract_then_synthesize'] as const;
export type RoutingMode = (typeof ROUTING_MODES)[number];

/** Default: keep the rehearsed single-model flow until routing proves itself. */
export const DEFAULT_ROUTING_MODE: RoutingMode = 'single';

export interface RoutingConfig {
  readonly mode: RoutingMode;
  /** Model used for end-to-end synthesis in `single` mode, and for synthesis in routed mode. */
  readonly synthesisModelId: string;
  /** Smaller / cheaper model for extraction only. Null when unused. */
  readonly extractionModelId: string | null;
  readonly rationale: string;
}

export interface RoutingDecision {
  readonly config: RoutingConfig;
  /** Stages the caller should invoke, in order. */
  readonly stages: readonly ('extract' | 'synthesize')[];
}

type Env = Record<string, string | undefined>;

function read(env: Env, name: string): string | null {
  const raw = env[name];
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Resolve routing from the environment without inventing a measured benefit.
 *
 * `SQUAD_SCREEN_ROUTING_MODE=extract_then_synthesize` opts into the two-stage
 * path for evaluation. Anything else (including unset) keeps `single`.
 */
export function loadRoutingConfig(
  env: Env = process.env,
  provider?: Pick<ProviderConfig, 'modelId' | 'comparisonModelId'>,
): RoutingConfig {
  const raw = read(env, 'SQUAD_SCREEN_ROUTING_MODE');
  const mode: RoutingMode =
    raw !== null && (ROUTING_MODES as readonly string[]).includes(raw) ? (raw as RoutingMode) : DEFAULT_ROUTING_MODE;

  const synthesisModelId = provider?.modelId ?? read(env, 'SQUAD_SCREEN_MODEL_ID') ?? DEFAULT_MODEL_ID;
  const extractionDefault = provider?.comparisonModelId ?? DEFAULT_COMPARISON_MODEL_ID;
  const extractionModelId =
    mode === 'extract_then_synthesize'
      ? (read(env, 'SQUAD_SCREEN_EXTRACTION_MODEL_ID') ?? extractionDefault)
      : null;

  if (mode === 'single') {
    return {
      mode,
      synthesisModelId,
      extractionModelId: null,
      rationale:
        'Default single-model synthesis. Routing stays off until a measured comparison on identical ' +
        'source packets shows a useful latency/cost/support trade-off (see evals/routing-report.md).',
    };
  }

  return {
    mode,
    synthesisModelId,
    extractionModelId,
    rationale:
      'Opt-in extract-then-synthesize routing for evaluation only. Extraction and synthesis model IDs are ' +
      'recorded separately so token and latency totals can isolate the routing change.',
  };
}

export function planRouting(config: RoutingConfig): RoutingDecision {
  if (config.mode === 'extract_then_synthesize') {
    return { config, stages: ['extract', 'synthesize'] };
  }
  return { config, stages: ['synthesize'] };
}

/**
 * Aggregate telemetry across routing stages.
 *
 * Costs include every model call. Missing usage stays null with a reason — never
 * estimated from response length.
 */
export function aggregateRoutingTelemetry(
  parts: readonly {
    readonly stage: 'extract' | 'synthesize' | 'repair';
    readonly modelId: string;
    readonly durationMs: number;
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly callCount: number;
    readonly retryCount: number;
    readonly estimatedInferenceCostUsd: number | null;
    readonly failed: boolean;
    readonly failureNote: string | null;
  }[],
): {
  readonly totalDurationMs: number;
  readonly totalCallCount: number;
  readonly totalRetryCount: number;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly estimatedInferenceCostUsd: number | null;
  readonly usageNote: string | null;
  readonly failures: readonly string[];
  readonly byStage: readonly { stage: string; modelId: string; durationMs: number; failed: boolean }[];
} {
  let totalDurationMs = 0;
  let totalCallCount = 0;
  let totalRetryCount = 0;
  let inputTokens: number | null = 0;
  let outputTokens: number | null = 0;
  let estimatedInferenceCostUsd: number | null = 0;
  let anyUsageMissing = false;
  let anyCostMissing = false;
  const failures: string[] = [];

  for (const part of parts) {
    totalDurationMs += part.durationMs;
    totalCallCount += part.callCount;
    totalRetryCount += part.retryCount;
    if (part.inputTokens === null || part.outputTokens === null) {
      anyUsageMissing = true;
    } else if (inputTokens !== null && outputTokens !== null) {
      inputTokens += part.inputTokens;
      outputTokens += part.outputTokens;
    }
    if (part.estimatedInferenceCostUsd === null) {
      anyCostMissing = true;
    } else if (estimatedInferenceCostUsd !== null) {
      estimatedInferenceCostUsd += part.estimatedInferenceCostUsd;
    }
    if (part.failed && part.failureNote !== null) failures.push(`${part.stage}: ${part.failureNote}`);
  }

  return {
    totalDurationMs,
    totalCallCount,
    totalRetryCount,
    inputTokens: anyUsageMissing ? null : inputTokens,
    outputTokens: anyUsageMissing ? null : outputTokens,
    estimatedInferenceCostUsd: anyCostMissing ? null : estimatedInferenceCostUsd,
    usageNote: anyUsageMissing
      ? 'One or more stage calls omitted usage; totals left null rather than estimated.'
      : null,
    failures,
    byStage: parts.map((part) => ({
      stage: part.stage,
      modelId: part.modelId,
      durationMs: part.durationMs,
      failed: part.failed,
    })),
  };
}
