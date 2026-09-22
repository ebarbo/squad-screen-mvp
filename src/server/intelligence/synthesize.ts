/**
 * Grounded synthesis (EWE-65).
 *
 * The model proposes; this module decides what survives. Everything the prompt
 * asks for is re-checked here in code, because a model asserting that it
 * respected a minute limit is not evidence that it did.
 *
 * A recommendation is dropped, not silently repaired, when it fails a check. A
 * dropped recommendation always produces a warning explaining why — the operator
 * needs to know that advice was withheld, and on what grounds.
 */
import {
  ModelSynthesisSchema,
  checkReferentialIntegrity,
  findConstraintViolations,
  findFabricatedConfidence,
  type MatchContext,
  type ModelRecommendation,
  type Recommendation,
  type Telemetry,
  type Warning,
} from '@/domain/contracts';
import type { ModelClient } from '@/server/models/client';
import { buildSynthesisPrompt, PROMPT_VERSION, SYNTHESIS_SYSTEM_PROMPT } from './prompt';
import { synthesizeOffline } from './stub';

export interface SynthesisInput {
  readonly context: MatchContext;
  readonly client: ModelClient;
  readonly runId: string;
  readonly priorRecommendations?: readonly Recommendation[];
  readonly modelId?: string;
}

export interface SynthesisResult {
  readonly recommendations: readonly Recommendation[];
  readonly abstentionNote: string | null;
  readonly warnings: readonly Warning[];
  readonly telemetry: Telemetry;
}

/**
 * Give each proposal a stable ID.
 *
 * Derived from the run and position rather than random, so a re-run of the same
 * inputs produces comparable IDs and an eval diff stays readable.
 */
function assignId(runId: string, index: number): string {
  return `rec_${runId.replace(/^run_/, '')}_${index + 1}`;
}

function toRecommendation(proposal: ModelRecommendation, runId: string, index: number): Recommendation {
  return {
    id: assignId(runId, index),
    prior_recommendation_id: proposal.prior_recommendation_id,
    title: proposal.title,
    priority: proposal.priority,
    observation: proposal.observation,
    inference: proposal.inference,
    action: proposal.action,
    trade_off: proposal.trade_off,
    uncertainty: proposal.uncertainty,
    next_check: proposal.next_check,
    evidence_ids: [...proposal.evidence_ids],
    depends_on: [...proposal.depends_on],
    player_actions: proposal.player_actions.map((action) => ({ ...action })),
    status: 'proposed',
  };
}

export async function synthesize(input: SynthesisInput): Promise<SynthesisResult> {
  const { context, client, runId } = input;

  const response = await client.complete({
    schema: ModelSynthesisSchema,
    schemaName: 'squad_screen_synthesis',
    systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
    userPrompt: buildSynthesisPrompt({ context, priorRecommendations: input.priorRecommendations }),
    promptVersion: PROMPT_VERSION,
    modelId: input.modelId,
    stubResponse: () => synthesizeOffline(context),
  });

  const warnings: Warning[] = [];

  if (response.repaired) {
    warnings.push({
      code: 'model_output_repaired',
      message: 'The first response failed schema validation and was regenerated. All attempts are counted in telemetry.',
      related_ids: [],
    });
  }

  const proposed = response.value.recommendations.map((proposal, index) => toRecommendation(proposal, runId, index));

  // --- Check 1: every citation resolves, and every reference is real. --------
  const priorIds = input.priorRecommendations?.map((recommendation) => recommendation.id);
  const integrityProblems = checkReferentialIntegrity({
    recommendations: proposed,
    evidence: context.evidence,
    players: context.own_team.players,
    constraints: context.constraints,
    ...(priorIds === undefined ? {} : { priorRecommendationIds: priorIds }),
  });

  // --- Check 2: constraints the staff supplied, enforced in code. -----------
  const violations = findConstraintViolations(proposed, context.own_team.players);

  // --- Check 3: no confidence figure, as a field or buried in prose. --------
  const fabricated = findFabricatedConfidence(proposed);

  const rejected = new Set<string>();

  for (const problem of integrityProblems) {
    rejected.add(problem.recommendation_id);
    warnings.push({
      code: 'missing_evidence',
      message: `Recommendation withheld: ${problem.message}`,
      related_ids: [problem.reference],
    });
  }

  for (const violation of violations) {
    rejected.add(violation.recommendation_id);
    warnings.push({
      code: 'constraint_blocked_action',
      message: `Recommendation withheld: ${violation.message}`,
      related_ids: [violation.player_id],
    });
  }

  if (fabricated.length > 0) {
    // This one is not per-recommendation: a model that invented a score
    // anywhere has misunderstood the task, and the whole response is suspect.
    for (const recommendation of proposed) rejected.add(recommendation.id);
    warnings.push({
      code: 'missing_evidence',
      message:
        'Response withheld: it stated a numeric confidence, which this system cannot produce. ' +
        fabricated.join('; '),
      related_ids: [],
    });
  }

  const accepted = proposed.filter((recommendation) => !rejected.has(recommendation.id));

  let abstentionNote = response.value.abstention_note;
  if (rejected.size > 0) {
    const withheld =
      `${rejected.size} proposed recommendation(s) were withheld by post-generation checks. ` +
      'The reasons are listed in warnings.';
    abstentionNote = abstentionNote === null ? withheld : `${abstentionNote} ${withheld}`;
  }

  if (accepted.length === 0 && abstentionNote === null) {
    abstentionNote = 'No recommendation is supported by the available evidence.';
  }

  if (accepted.length === 0) {
    warnings.push({
      code: 'abstained',
      message: 'No recommendation survived the evidence and constraint checks.',
      related_ids: [],
    });
  }

  return {
    recommendations: accepted,
    abstentionNote,
    warnings,
    telemetry: response.telemetry,
  };
}
