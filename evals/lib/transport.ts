import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  RunResultSchema,
  ScenarioResultSchema,
  type AvailabilityOverride,
  type BaseMatchContext,
  type RunResult,
  type ScenarioResult,
  type Telemetry,
} from '@/domain/contracts';
import { describeConfigProblems, loadProviderConfig } from '@/server/config/env';
import {
  estimateInferenceCost,
  unmeasuredTelemetry,
  type EvalTelemetry,
  type OutputOrigin,
  type PricingBasis,
} from './telemetry';
import { type RenderedPrompt } from './prompt';
import { type TransportMode } from './run-record';
import { recordedDir } from './paths';

export interface GenerateInput {
  caseId: string;
  modelId: string;
  context: BaseMatchContext;
  prompt: RenderedPrompt;
  settings: unknown;
  repeat: number;
}

export interface ReevaluateInput extends GenerateInput {
  baseRun: RunResult;
  scenarioId: string;
  overrides: AvailabilityOverride[];
}

export interface TransportOutput<T> {
  origin: OutputOrigin;
  /** What the model returned, before the server assembled a result. */
  rawModelOutput: unknown;
  result: T;
  telemetry: EvalTelemetry;
}

export interface EvalTransport {
  readonly mode: TransportMode;
  /** One line for the run metadata, naming exactly what produced the output. */
  describe(): string;
  generate(input: GenerateInput): Promise<TransportOutput<RunResult>>;
  reevaluate(input: ReevaluateInput): Promise<TransportOutput<ScenarioResult>>;
}

export class TransportError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

/* -- Telemetry translation ------------------------------------------------ */

/**
 * Translate the adapter's telemetry into the harness's.
 *
 * The single rule this enforces: anything the adapter did not produce with a
 * real provider call reports every metric as null with a reason. The stub
 * transport legitimately reports `duration_ms: 0`; treating that as a measured
 * zero-millisecond latency would be the exact fabrication this project fails on.
 */
export function fromContractTelemetry(
  telemetry: Telemetry,
  pricing: PricingBasis | null,
  origin: OutputOrigin,
): EvalTelemetry {
  if (telemetry.transport !== 'live' || origin !== 'live') {
    return unmeasuredTelemetry(
      origin === 'live' ? 'stub' : origin,
      telemetry.model_id,
      telemetry.prompt_version,
      `Output origin is '${origin}' and the adapter reported transport '${telemetry.transport}'. No provider call was made, so no latency, token count or cost exists to report.`,
    );
  }

  const unavailable: Record<string, string> = {};
  if (telemetry.input_tokens === null || telemetry.output_tokens === null) {
    unavailable.input_tokens =
      telemetry.usage_note ?? 'Provider did not report usage on this call.';
    unavailable.output_tokens = unavailable.input_tokens;
  }

  let cost = telemetry.estimated_inference_cost_usd;
  let costBasis = telemetry.pricing_basis;
  if (cost === null) {
    const estimate = estimateInferenceCost(
      telemetry.input_tokens,
      telemetry.output_tokens,
      pricing,
    );
    cost = estimate.usd;
    if (estimate.reason !== null) {
      unavailable.estimated_inference_cost_usd = estimate.reason;
    } else if (pricing !== null) {
      costBasis = pricing.source;
    }
  }

  return {
    origin: 'live',
    model_id: telemetry.model_id,
    prompt_version: telemetry.prompt_version,
    duration_ms: telemetry.duration_ms,
    input_tokens: telemetry.input_tokens,
    output_tokens: telemetry.output_tokens,
    retries: telemetry.retry_count,
    calls: telemetry.call_count,
    pricing_basis: cost === null ? null : (pricing ?? { input_usd_per_mtok: 0, output_usd_per_mtok: 0, source: costBasis }),
    estimated_inference_cost_usd: cost,
    unavailable_reasons: unavailable,
  };
}

/**
 * Pricing comes only from the configured per-million-token rates. The Token
 * Factory API exposes no pricing or billing endpoint, so there is nothing to
 * look up: without those two variables the cost column stays empty, and it is
 * never derived from token counts or latency.
 */
export function pricingBasis(env: NodeJS.ProcessEnv = process.env): PricingBasis | null {
  // Resolved in stub mode so missing credentials do not mask a price problem.
  const result = loadProviderConfig({ ...env, SQUAD_SCREEN_MODEL_MODE: 'stub' });
  if (!result.ok) return null;
  const { priceInputPerMTok, priceOutputPerMTok } = result.config;
  if (priceInputPerMTok === null || priceOutputPerMTok === null) return null;
  return {
    input_usd_per_mtok: priceInputPerMTok,
    output_usd_per_mtok: priceOutputPerMTok,
    source: 'SQUAD_SCREEN_PRICE_INPUT_PER_MTOK / SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK',
  };
}

/* -- Recorded transport --------------------------------------------------- */

const recordedFixtureSchema = z.object({
  /**
   * `authored` was written by hand and never sent to a provider. `captured` was
   * saved from a real response. Only `captured` may carry telemetry that means
   * anything, and even then the harness reports it as recorded, not measured.
   */
  fixture_kind: z.enum(['authored', 'captured']),
  note: z.string().min(1),
  captured_from: z
    .object({
      model_id: z.string().min(1),
      run_id: z.string().min(1),
      captured_at: z.string().min(1),
    })
    .nullable()
    .default(null),
  /**
   * What the model returned, when the fixture records it. Optional: a fixture
   * that only captures the assembled result still exercises every check except
   * the model-output half of S1.
   */
  model_output: z.unknown().optional(),
  /**
   * The run result with `evidence` omitted. The transport injects the packet's
   * evidence, so a fixture cannot drift out of step with the context it is
   * replayed against, and the files stay readable.
   */
  result: z.record(z.string(), z.unknown()),
});

export type RecordedFixture = z.infer<typeof recordedFixtureSchema>;

function readFixture(caseId: string, kind: 'base' | 'scenario', root?: string): RecordedFixture {
  const file = path.join(recordedDir(root), caseId, `${kind}.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new TransportError(
      'recorded_fixture_missing',
      `No recorded ${kind} output for case '${caseId}'. Expected ${file}. ${error instanceof Error ? error.message : String(error)}`,
      false,
    );
  }
  const parsed = recordedFixtureSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TransportError(
      'recorded_fixture_invalid',
      `Recorded fixture ${file} is malformed:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`,
      false,
    );
  }
  return parsed.data;
}

/**
 * Replays saved output so the harness, the checks and the report can be
 * developed and verified without a provider.
 *
 * Every record it produces is stamped `authored` or `recorded` and carries null
 * metrics with a stated reason, so a recorded run can never be mistaken for a
 * measurement — which is the whole point of EWE-71's requirement that the
 * harness consume recorded output *and clearly identify it*.
 */
export class RecordedTransport implements EvalTransport {
  readonly mode: TransportMode = 'recorded';

  constructor(private readonly root?: string) {}

  describe(): string {
    return 'Recorded transport: replaying saved fixtures from evals/recorded. No provider was contacted and no metric was measured.';
  }

  async generate(input: GenerateInput): Promise<TransportOutput<RunResult>> {
    const fixture = readFixture(input.caseId, 'base', this.root);
    const result = parseResult(
      RunResultSchema,
      { ...fixture.result, evidence: input.context.evidence },
      input.caseId,
      'base',
    );
    return this.wrap(fixture, result, result.telemetry);
  }

  async reevaluate(input: ReevaluateInput): Promise<TransportOutput<ScenarioResult>> {
    const fixture = readFixture(input.caseId, 'scenario', this.root);
    const result = parseResult(
      ScenarioResultSchema,
      { ...fixture.result, evidence: input.context.evidence },
      input.caseId,
      'scenario',
    );
    return this.wrap(fixture, result, result.telemetry);
  }

  private wrap<T>(
    fixture: RecordedFixture,
    result: T,
    telemetry: Telemetry,
  ): TransportOutput<T> {
    const origin: OutputOrigin = fixture.fixture_kind === 'captured' ? 'recorded' : 'authored';
    return {
      origin,
      rawModelOutput: fixture.model_output,
      result,
      telemetry: unmeasuredTelemetry(
        origin,
        telemetry.model_id,
        telemetry.prompt_version,
        origin === 'authored'
          ? 'Authored fixture: written by hand for development and never sent to a provider, so no latency, token count or cost exists.'
          : `Recorded fixture captured from ${fixture.captured_from?.model_id ?? 'an earlier run'}. Replaying it measures nothing; re-run in live mode to measure.`,
      ),
    };
  }
}

function parseResult<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: z.ZodError } },
  value: unknown,
  caseId: string,
  kind: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new TransportError(
      'recorded_fixture_invalid',
      `Recorded ${kind} result for case '${caseId}' does not satisfy the contract:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`,
      false,
    );
  }
  return parsed.data;
}

/* -- Live transport ------------------------------------------------------- */

interface IntelligenceModule {
  generateRecommendations?: (args: {
    context: BaseMatchContext;
    modelId: string;
    promptText: string;
    promptVersion: string;
    settings: unknown;
  }) => Promise<{ result: RunResult; rawModelOutput: unknown }>;
}

interface ScenariosModule {
  reevaluateScenario?: (args: {
    baseContext: BaseMatchContext;
    baseRun: RunResult;
    scenarioId: string;
    overrides: AvailabilityOverride[];
    modelId: string;
    promptText: string;
    promptVersion: string;
    settings: unknown;
  }) => Promise<{ result: ScenarioResult; rawModelOutput: unknown }>;
}

/**
 * Calls the real pipeline: the synthesis service (EWE-65) and the scenario
 * rerun (EWE-66), which in turn drive the Token Factory adapter (EWE-63).
 *
 * The harness deliberately does not talk to the provider itself. Measuring a
 * bespoke call path would compare models on something the product does not
 * ship, and EWE-73 has to distinguish model choice from workflow architecture.
 *
 * Every failure here is loud. A missing key, a missing module and a provider
 * timeout each produce a distinct typed error, and none of them falls back to
 * recorded output: a failed live call must never be reported as a success.
 */
export class LiveTransport implements EvalTransport {
  readonly mode: TransportMode = 'live';

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  describe(): string {
    const result = loadProviderConfig(this.env);
    const baseUrl = result.ok ? result.config.baseUrl : '(unresolved)';
    return `Live transport: real calls through the project's model adapter to ${baseUrl}.`;
  }

  private assertConfigured(): void {
    const result = loadProviderConfig(this.env);
    if (!result.ok) {
      throw new TransportError(
        'missing_configuration',
        describeConfigProblems(result.problems),
        false,
      );
    }
    if (result.config.mode !== 'live') {
      throw new TransportError(
        'missing_configuration',
        `SQUAD_SCREEN_MODEL_MODE is '${result.config.mode}'. A measured comparison requires live mode; the stub transport produces labeled offline output and no metrics.`,
        false,
      );
    }
  }

  async generate(input: GenerateInput): Promise<TransportOutput<RunResult>> {
    this.assertConfigured();
    const module = await loadModule<IntelligenceModule>(
      '@/server/intelligence',
      'EWE-65 (grounded synthesis service)',
    );
    if (typeof module.generateRecommendations !== 'function') {
      throw new TransportError(
        'missing_pipeline',
        "src/server/intelligence exists but exports no 'generateRecommendations'. The evaluation harness calls the product's own synthesis path; see evals/README.md for the expected signature.",
        false,
      );
    }
    const { result, rawModelOutput } = await module.generateRecommendations({
      context: input.context,
      modelId: input.modelId,
      promptText: input.prompt.text,
      promptVersion: input.prompt.version,
      settings: input.settings,
    });
    return {
      origin: result.telemetry.transport === 'live' ? 'live' : 'stub',
      rawModelOutput,
      result,
      telemetry: fromContractTelemetry(
        result.telemetry,
        pricingBasis(this.env),
        result.telemetry.transport === 'live' ? 'live' : 'stub',
      ),
    };
  }

  async reevaluate(input: ReevaluateInput): Promise<TransportOutput<ScenarioResult>> {
    this.assertConfigured();
    const module = await loadModule<ScenariosModule>(
      '@/server/scenarios',
      'EWE-66 (immutable what-if rerun)',
    );
    if (typeof module.reevaluateScenario !== 'function') {
      throw new TransportError(
        'missing_pipeline',
        "src/server/scenarios exists but exports no 'reevaluateScenario'. See evals/README.md for the expected signature.",
        false,
      );
    }
    const { result, rawModelOutput } = await module.reevaluateScenario({
      baseContext: input.context,
      baseRun: input.baseRun,
      scenarioId: input.scenarioId,
      overrides: input.overrides,
      modelId: input.modelId,
      promptText: input.prompt.text,
      promptVersion: input.prompt.version,
      settings: input.settings,
    });
    return {
      origin: result.telemetry.transport === 'live' ? 'live' : 'stub',
      rawModelOutput,
      result,
      telemetry: fromContractTelemetry(
        result.telemetry,
        pricingBasis(this.env),
        result.telemetry.transport === 'live' ? 'live' : 'stub',
      ),
    };
  }
}

async function loadModule<T>(specifier: string, owner: string): Promise<T> {
  try {
    return (await import(/* @vite-ignore */ specifier)) as T;
  } catch (error) {
    throw new TransportError(
      'missing_pipeline',
      `Cannot import ${specifier}, which is delivered by ${owner}. A live comparison runs the product's own pipeline, so it cannot proceed until that module exists. Nothing was measured. Underlying error: ${error instanceof Error ? error.message : String(error)}`,
      false,
    );
  }
}

export function createTransport(mode: TransportMode, env = process.env): EvalTransport {
  return mode === 'live' ? new LiveTransport(env) : new RecordedTransport();
}
