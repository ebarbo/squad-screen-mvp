/**
 * Scenario re-evaluation (EWE-66).
 *
 * Takes a completed base run, applies an availability assumption to a copy of
 * its context, re-runs synthesis only, and reports what changed. The base run's
 * recommendations and evidence snapshot are untouched.
 *
 * Note what is *not* here: no source adapter is invoked, no extraction repeats,
 * nothing is re-fetched. The re-run reuses the frozen snapshot, which is both
 * faster and the only way the comparison means anything — if the evidence moved
 * underneath, a changed recommendation would tell you nothing about the
 * assumption.
 */
import type {
  AvailabilityOverride,
  BaseMatchContext,
  Recommendation,
  ScenarioResult,
  Warning,
} from '@/domain/contracts';
import type { ModelClient } from '@/server/models/client';
import { synthesize } from '@/server/intelligence/synthesize';
import { classifyChanges } from './changes';
import { applyAvailabilityOverlay } from './overlay';

export interface ReevaluateInput {
  readonly baseContext: BaseMatchContext;
  readonly baseRunId: string;
  readonly baseRecommendations: readonly Recommendation[];
  readonly scenarioId: string;
  readonly scenarioRunId: string;
  readonly overrides: readonly AvailabilityOverride[];
  readonly client: ModelClient;
  /** Held fixed by the evaluation harness so a comparison isolates model choice. */
  readonly prompt?: { readonly text: string; readonly version: string };
  /**
   * The model under test. Must be threaded through: a comparison that generated
   * with one model and re-evaluated with another would attribute the scenario
   * result to the wrong one.
   */
  readonly modelId?: string;
}

export interface ReevaluateOutput {
  readonly result: ScenarioResult;
  /** What the model returned, before the change classification ran. */
  readonly rawModelOutput: unknown;
}

export async function reevaluate(input: ReevaluateInput): Promise<ReevaluateOutput> {
  const overlay = applyAvailabilityOverlay(input.baseContext, input.overrides, {
    scenarioId: input.scenarioId,
    parentRunId: input.baseRunId,
  });

  const synthesis = await synthesize({
    context: overlay.context,
    client: input.client,
    runId: input.scenarioRunId,
    priorRecommendations: input.baseRecommendations,
    ...(input.prompt === undefined ? {} : { prompt: input.prompt }),
    ...(input.modelId === undefined ? {} : { modelId: input.modelId }),
  });

  const { changes, withdrawn } = classifyChanges({
    prior: input.baseRecommendations,
    current: synthesis.recommendations,
  });

  const warnings: Warning[] = [...overlay.warnings, ...synthesis.warnings];

  // The assumption produced no visible difference. That is a legitimate result,
  // but it is worth saying out loud rather than letting a judge assume the
  // scenario silently failed.
  if (changes.every((change) => change.change_type === 'unchanged')) {
    warnings.push({
      code: 'abstained',
      message: 'The assumption did not change any proposed action.',
      related_ids: overlay.assumptions.map((assumption) => assumption.player_id),
    });
  }

  return {
    result: {
      run_id: input.scenarioRunId,
      parent_run_id: input.baseRunId,
      scenario_id: input.scenarioId,
      evidence_snapshot_id: overlay.context.evidence_snapshot_id,
      applied_assumptions: [...overlay.assumptions],
      recommendations: [...synthesis.recommendations],
      changes: [...changes],
      withdrawn_recommendations: [...withdrawn],
      evidence: [...overlay.context.evidence],
      abstention_note: synthesis.abstentionNote,
      warnings,
      telemetry: synthesis.telemetry,
    },
    rawModelOutput: synthesis.rawModelOutput,
  };
}
