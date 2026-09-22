/**
 * Package entry point for `@/server/scenarios`.
 *
 * `reevaluateScenario` is a thin facade over the shipping what-if path, added
 * for the evaluation harness (EWE-71). The overlay, the frozen snapshot and the
 * change classification are the product's own, so a measured stability or
 * immutability result describes the product rather than the harness.
 */
import type { AvailabilityOverride, BaseMatchContext, RunResult, ScenarioResult } from '@/domain/contracts';
import { ModelClient } from '@/server/models/client';
import { nextRunId } from '@/server/runs/store';
import { reevaluate } from './reevaluate';

export { reevaluate, type ReevaluateInput, type ReevaluateOutput } from './reevaluate';
export { applyAvailabilityOverlay, UnknownPlayerError, type OverlayResult } from './overlay';
export { classifyChanges, type ClassifyInput, type ClassifyResult } from './changes';

export interface ReevaluateScenarioInput {
  readonly baseContext: BaseMatchContext;
  readonly baseRun: RunResult;
  readonly scenarioId: string;
  readonly overrides: readonly AvailabilityOverride[];
  readonly modelId: string;
  readonly promptText: string;
  readonly promptVersion: string;
  /** Accepted for interface compatibility; the scenario path reads none of it. */
  readonly settings?: unknown;
}

export interface ReevaluateScenarioOutput {
  readonly result: ScenarioResult;
  readonly rawModelOutput: unknown;
}

export async function reevaluateScenario(
  input: ReevaluateScenarioInput,
): Promise<ReevaluateScenarioOutput> {
  const client = ModelClient.create();

  // The base run arrives from the caller rather than the in-memory store: the
  // harness holds its own base run, and requiring a store lookup would couple a
  // measurement to server state that outlives neither a restart nor a process.
  return reevaluate({
    baseContext: input.baseContext,
    baseRunId: input.baseRun.run_id,
    baseRecommendations: input.baseRun.recommendations,
    scenarioId: input.scenarioId,
    scenarioRunId: nextRunId('scenario'),
    overrides: input.overrides,
    client,
    prompt: { text: input.promptText, version: input.promptVersion },
    modelId: input.modelId,
  });
}
