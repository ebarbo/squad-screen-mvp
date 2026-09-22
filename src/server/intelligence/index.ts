/**
 * Package entry point for `@/server/intelligence`.
 *
 * `generateRecommendations` is a thin facade over the shipping synthesis path,
 * added for the evaluation harness (EWE-71). It reimplements nothing: the
 * validation, constraint enforcement and telemetry a measured run reports are
 * the same code the product runs, which is what lets EWE-73 claim it measured
 * the product rather than a bespoke call path built for benchmarking.
 *
 * The one thing the caller supplies is the prompt. The harness holds that fixed
 * across models so its comparison isolates model choice from prompt wording.
 */
import type { BaseMatchContext, RunResult } from '@/domain/contracts';
import { ModelClient } from '@/server/models/client';
import { nextRunId } from '@/server/runs/store';
import { synthesize } from './synthesize';

export { synthesize, type SynthesisInput, type SynthesisResult } from './synthesize';
export { buildSynthesisPrompt, PROMPT_VERSION, SYNTHESIS_SYSTEM_PROMPT } from './prompt';
export { synthesizeOffline } from './stub';

export interface GenerateRecommendationsInput {
  readonly context: BaseMatchContext;
  readonly modelId: string;
  readonly promptText: string;
  readonly promptVersion: string;
  /** Accepted for interface compatibility; synthesis reads none of it. */
  readonly settings?: unknown;
}

export interface GenerateRecommendationsOutput {
  readonly result: RunResult;
  readonly rawModelOutput: unknown;
}

export async function generateRecommendations(
  input: GenerateRecommendationsInput,
): Promise<GenerateRecommendationsOutput> {
  // Constructed per call rather than shared: a comparison run switches models
  // between calls, and configuration is resolved fresh each time.
  const client = ModelClient.create();
  const runId = nextRunId('base');

  const synthesis = await synthesize({
    context: input.context,
    client,
    runId,
    modelId: input.modelId,
    prompt: { text: input.promptText, version: input.promptVersion },
  });

  return {
    result: {
      run_id: runId,
      fixture_id: input.context.fixture.id,
      evidence_snapshot_id: input.context.evidence_snapshot_id,
      as_of: input.context.as_of,
      recommendations: [...synthesis.recommendations],
      evidence: [...input.context.evidence],
      abstention_note: synthesis.abstentionNote,
      warnings: [...synthesis.warnings],
      telemetry: synthesis.telemetry,
    },
    rawModelOutput: synthesis.rawModelOutput,
  };
}
