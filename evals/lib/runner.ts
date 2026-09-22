import {
  type AvailabilityOverride,
  type BaseMatchContext,
  type ClubPlayer,
  type EvidenceItem,
  type PlayerId,
  type Recommendation,
  type RunResult,
  type ScenarioResult,
} from '@/domain/contracts';
import { type EvalCase, expectationFor } from './case-schema';
import { CHECK_IDS, runChecks, type CheckContext } from './checks';
import { fingerprintInput, sha256, type InputFingerprint } from './fingerprint';
import { type ReviewRow } from './human-review';
import { loadPrompt, renderPrompt } from './prompt';
import { resolveVariant, type ResolvedPacket } from '../packet';
import { type EvalSettings } from './settings';
import {
  TransportError,
  type EvalTransport,
  type TransportOutput,
} from './transport';
import { unmeasuredTelemetry, type EvalTelemetry } from './telemetry';
import {
  type CaseRunRecord,
  type ExpectationDelta,
  type ModelUnderTest,
  type StructuredError,
} from './run-record';

export interface RunOneInput {
  evalCase: EvalCase;
  model: ModelUnderTest;
  repeat: number;
  settings: EvalSettings;
  transport: EvalTransport;
  /**
   * The completed run this case declares as its stability baseline, for the
   * same model and repeat. Null when the case declares none, or when the
   * baseline itself did not complete.
   */
  stabilityBaseline: RunResult | null;
}

/** The override target, resolved from the data rather than hard-coded in a case file. */
export interface ResolvedOverride {
  player: ClubPlayer | null;
  reason: string;
}

export function resolveOverrideTarget(
  evalCase: EvalCase,
  context: BaseMatchContext,
  baseRecommendations: readonly Recommendation[],
): ResolvedOverride {
  const scenario = evalCase.scenario;
  if (scenario === null) return { player: null, reason: 'Generate-only case; no override applies.' };

  const players = [...context.own_team.players].sort((a, b) => a.id.localeCompare(b.id));

  if (scenario.override_target.resolve_by === 'supplied_minutes_constraint') {
    const candidates = players.filter((player) => player.staff_constraint?.max_minutes != null);
    const player = candidates[0] ?? null;
    return {
      player,
      reason:
        player === null
          ? 'No player in this fixture carries a staff-supplied max_minutes, so Player A cannot be identified without hard-coding an ID.'
          : `Resolved to ${player.display_name} (${player.id}): the player carrying a staff-supplied limit of ${player.staff_constraint?.max_minutes} minutes.`,
    };
  }

  const referenced = new Set<string>();
  for (const recommendation of baseRecommendations) {
    for (const action of recommendation.player_actions) referenced.add(action.player_id);
    for (const dependency of recommendation.depends_on) referenced.add(dependency);
  }
  const candidates = players.filter(
    (player) => player.availability === 'available' && !referenced.has(player.id),
  );
  const player = candidates[0] ?? null;
  return {
    player,
    reason:
      player === null
        ? 'Every available player is referenced by a base recommendation, so no genuinely irrelevant change exists in this fixture. Substituting a referenced player would test something else.'
        : `Resolved to ${player.display_name} (${player.id}): available, and referenced by no base recommendation.`,
  };
}

function toReviewRows(
  evalCase: EvalCase,
  model: ModelUnderTest,
  repeat: number,
  phase: string,
  recommendations: readonly Recommendation[],
  evidence: readonly EvidenceItem[],
): ReviewRow[] {
  const byId = new Map(evidence.map((item) => [item.id, item]));
  return recommendations.map((recommendation) => ({
    case_id: evalCase.case_id,
    model_label: model.label,
    repeat,
    phase,
    recommendation_id: recommendation.id,
    claim: recommendation.observation,
    cited_evidence_ids: recommendation.evidence_ids.join(' '),
    cited_excerpts: recommendation.evidence_ids
      .map((id) => {
        const item = byId.get(id);
        return item === undefined ? `${id}: (unresolved)` : `${id}: ${item.source.excerpt}`;
      })
      .join(' || '),
    entailment_verdict: '',
    reviewer: '',
    reviewed_at: '',
    note: '',
  }));
}

function errorRecord(
  evalCase: EvalCase,
  model: ModelUnderTest,
  repeat: number,
  transport: EvalTransport,
  fingerprint: InputFingerprint,
  error: StructuredError,
  telemetry: EvalTelemetry,
  status: CaseRunRecord['status'],
): CaseRunRecord {
  return {
    case_id: evalCase.case_id,
    model_label: model.label,
    model_id: model.model_id,
    repeat,
    transport_mode: transport.mode,
    output_origin: 'authored',
    input_fingerprint: fingerprint,
    resolved_override_player_id: null,
    status,
    error,
    telemetry: { base: telemetry, rerun: null },
    // An absent check is never a passed check: every ID is recorded as
    // not_measured with the reason the run failed.
    checks: CHECK_IDS.map((id) => ({
      id,
      title: `Check ${id}`,
      outcome: 'not_measured' as const,
      reason: `The run did not complete (${error.code}), so this check never ran.`,
      violations: [],
    })),
    expectation_deltas: CHECK_IDS.filter(
      (id) => expectationFor(evalCase, id) !== 'not_measured',
    ).map((id) => ({
      check_id: id,
      expected: expectationFor(evalCase, id),
      actual: 'not_measured' as const,
    })),
    review_rows: [],
  };
}

export interface RunOneOutput {
  record: CaseRunRecord;
  packet: ResolvedPacket;
  /** Exposed so a later case can use this run as its stability baseline. */
  baseRun: RunResult | null;
}

export async function runOneCase(input: RunOneInput): Promise<RunOneOutput> {
  const { evalCase, model, repeat, settings, transport } = input;
  const packet = await resolveVariant(evalCase.fixture_variant);
  const prompt = loadPrompt();
  const basePrompt = renderPrompt(prompt, packet.context);

  const fingerprint = fingerprintInput({
    case_id: evalCase.case_id,
    match_context: packet.context,
    scenario: evalCase.scenario,
    prompt_text: basePrompt.text,
    prompt_version: basePrompt.version,
    output_schema: 'ModelSynthesisSchema@domain/contracts',
    settings,
  });

  const placeholderTelemetry = unmeasuredTelemetry(
    'authored',
    model.model_id,
    basePrompt.version,
    'The run did not reach a provider.',
  );

  let baseOutput: TransportOutput<RunResult>;
  try {
    baseOutput = await transport.generate({
      caseId: evalCase.case_id,
      modelId: model.model_id,
      context: packet.context,
      prompt: basePrompt,
      settings,
      repeat,
    });
  } catch (error) {
    return {
      packet,
      baseRun: null,
      record: errorRecord(
        evalCase,
        model,
        repeat,
        transport,
        fingerprint,
        toStructuredError(error),
        placeholderTelemetry,
        error instanceof TransportError && error.code === 'missing_configuration'
          ? 'not_measured'
          : 'provider_error',
      ),
    };
  }

  let rerunOutput: TransportOutput<ScenarioResult> | null = null;
  let override: ResolvedOverride = { player: null, reason: 'Generate-only case.' };
  let basePreRerunHash: string | null = null;
  let basePostRerunHash: string | null = null;
  let immutabilityNote =
    'Only the snapshot identity carried by the result was available to compare.';

  if (evalCase.phase === 'generate_then_reevaluate' && evalCase.scenario !== null) {
    override = resolveOverrideTarget(evalCase, packet.context, baseOutput.result.recommendations);
    if (override.player === null) {
      return {
        packet,
        baseRun: baseOutput.result,
        record: errorRecord(
          evalCase,
          model,
          repeat,
          transport,
          fingerprint,
          {
            code: 'override_target_unresolvable',
            message: override.reason,
            retryable: false,
          },
          baseOutput.telemetry,
          'not_measured',
        ),
      };
    }

    const overrides: AvailabilityOverride[] = [
      {
        player_id: override.player.id,
        availability: evalCase.scenario.override_target.availability,
      },
    ];
    const scenarioPrompt = renderPrompt(
      prompt,
      packet.context,
      baseOutput.result.recommendations,
      overrides,
    );

    basePreRerunHash = sha256(baseOutput.result);
    try {
      rerunOutput = await transport.reevaluate({
        caseId: evalCase.case_id,
        modelId: model.model_id,
        context: packet.context,
        prompt: scenarioPrompt,
        settings,
        repeat,
        baseRun: baseOutput.result,
        scenarioId: evalCase.scenario.scenario_id,
        overrides,
      });
    } catch (error) {
      return {
        packet,
        baseRun: baseOutput.result,
        record: errorRecord(
          evalCase,
          model,
          repeat,
          transport,
          fingerprint,
          toStructuredError(error),
          baseOutput.telemetry,
          'provider_error',
        ),
      };
    }
    basePostRerunHash = sha256(baseOutput.result);
    immutabilityNote =
      transport.mode === 'live'
        ? 'The base run was hashed before and after the rerun call, so a pipeline that mutated it would be detected.'
        : 'Recorded replay: no pipeline ran, so this confirms the fixture is self-consistent rather than that a live rerun left the base alone.';
  }

  const subject = rerunOutput?.result ?? baseOutput.result;
  const checkContext: CheckContext = {
    case_id: evalCase.case_id,
    baseContext: packet.context,
    base: baseOutput.result,
    rerun: rerunOutput?.result ?? null,
    overridePlayerId: (override.player?.id ?? null) as PlayerId | null,
    rawModelOutput: (rerunOutput ?? baseOutput).rawModelOutput,
    stabilityBaseline: input.stabilityBaseline,
    basePreRerunHash,
    basePostRerunHash,
    immutabilityEvidenceNote: immutabilityNote,
  };

  const checks = runChecks(checkContext);
  const expectation_deltas: ExpectationDelta[] = checks
    .filter((check) => check.outcome !== expectationFor(evalCase, check.id))
    .map((check) => ({
      check_id: check.id,
      expected: expectationFor(evalCase, check.id),
      actual: check.outcome,
    }));

  return {
    packet,
    baseRun: baseOutput.result,
    record: {
      case_id: evalCase.case_id,
      model_label: model.label,
      model_id: model.model_id,
      repeat,
      transport_mode: transport.mode,
      output_origin: (rerunOutput ?? baseOutput).origin,
      input_fingerprint: fingerprint,
      resolved_override_player_id: override.player?.id ?? null,
      status: 'completed',
      error: null,
      telemetry: { base: baseOutput.telemetry, rerun: rerunOutput?.telemetry ?? null },
      checks,
      expectation_deltas,
      review_rows: toReviewRows(
        evalCase,
        model,
        repeat,
        rerunOutput === null ? 'generate' : 'reevaluate',
        subject.recommendations,
        subject.evidence,
      ),
    },
  };
}

function toStructuredError(error: unknown): StructuredError {
  if (error instanceof TransportError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  return {
    code: 'harness_error',
    message: error instanceof Error ? error.message : String(error),
    retryable: false,
  };
}
