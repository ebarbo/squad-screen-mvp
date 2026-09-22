import { describe, expect, it } from 'vitest';
import {
  ChangeSchema,
  EvidenceItemSchema,
  ModelSynthesisSchema,
  RecommendationSchema,
  RunResultSchema,
  ScenarioResultSchema,
  assertNoFabricatedConfidence,
  checkReferentialIntegrity,
  findConstraintViolations,
  findFabricatedConfidence,
} from '@/domain/contracts';
import {
  exampleAbstainingRunResult,
  exampleEvidence,
  examplePlayers,
  exampleRecommendation,
  exampleRunResult,
  exampleScenarioResult,
  invalidExamples,
} from '@/domain/examples';

describe('valid contract examples', () => {
  it('validates the generation response', () => {
    expect(RunResultSchema.safeParse(exampleRunResult).success).toBe(true);
  });

  it('validates the abstaining response with zero recommendations', () => {
    const parsed = RunResultSchema.safeParse(exampleAbstainingRunResult);
    expect(parsed.success).toBe(true);
    expect(exampleAbstainingRunResult.recommendations).toHaveLength(0);
    expect(exampleAbstainingRunResult.abstention_note).not.toBeNull();
  });

  it('validates the scenario response', () => {
    expect(ScenarioResultSchema.safeParse(exampleScenarioResult).success).toBe(true);
  });

  it('validates every evidence item', () => {
    for (const item of exampleEvidence) {
      expect(EvidenceItemSchema.safeParse(item).success).toBe(true);
    }
  });

  it('keeps the scenario snapshot identical to the base run snapshot', () => {
    expect(exampleScenarioResult.evidence_snapshot_id).toBe(exampleRunResult.evidence_snapshot_id);
  });

  it('retains withdrawn advice so its evidence stays inspectable', () => {
    const withdrawn = exampleScenarioResult.withdrawn_recommendations;
    expect(withdrawn).toHaveLength(1);
    expect(withdrawn[0]!.status).toBe('withdrawn');
    expect(withdrawn[0]!.evidence_ids.length).toBeGreaterThan(0);
  });

  it('marks scenario assumptions as hypothetical and records what they replace', () => {
    const assumption = exampleScenarioResult.applied_assumptions[0]!;
    expect(assumption.is_hypothetical).toBe(true);
    expect(assumption.replaces_factual_availability).toBe('available');
  });
});

describe('referential integrity', () => {
  it('accepts a run that cites only evidence it carries', () => {
    const problems = checkReferentialIntegrity({
      recommendations: exampleRunResult.recommendations,
      evidence: exampleRunResult.evidence,
      players: examplePlayers,
      constraints: examplePlayers.flatMap((p) => (p.staff_constraint ? [p.staff_constraint] : [])),
    });
    expect(problems).toEqual([]);
  });

  it('rejects an unknown evidence reference', () => {
    const { payload } = invalidExamples.unknownEvidenceReference!;
    const run = payload as typeof exampleRunResult;
    const problems = checkReferentialIntegrity({
      recommendations: run.recommendations,
      evidence: run.evidence,
      players: examplePlayers,
    });
    expect(problems.map((p) => p.kind)).toContain('unknown_evidence_id');
  });

  it('rejects a prior recommendation ID that is not in the parent run', () => {
    const { payload } = invalidExamples.unknownPriorRecommendation!;
    const input = payload as {
      recommendations: typeof exampleRunResult.recommendations;
      evidence: typeof exampleEvidence;
      priorRecommendationIds: string[];
    };
    const problems = checkReferentialIntegrity({
      recommendations: input.recommendations,
      evidence: input.evidence,
      priorRecommendationIds: input.priorRecommendationIds,
    });
    expect(problems.map((p) => p.kind)).toContain('unknown_prior_recommendation_id');
  });

  it('rejects an action naming a player who is not in the squad', () => {
    const problems = checkReferentialIntegrity({
      recommendations: [
        {
          ...exampleRecommendation,
          player_actions: [{ player_id: 'pl_example_ghost', planned_minutes: 20, role: 'Substitute' }],
        },
      ],
      evidence: exampleEvidence,
      players: examplePlayers,
    });
    expect(problems.map((p) => p.kind)).toContain('unknown_player_id');
  });
});

describe('recommendation count', () => {
  it('allows zero to three and rejects four', () => {
    expect(ModelSynthesisSchema.safeParse({ recommendations: [] }).success).toBe(true);
    const { payload } = invalidExamples.tooManyRecommendations!;
    expect(RunResultSchema.safeParse(payload).success).toBe(false);
  });
});

describe('fabricated confidence', () => {
  it('rejects a confidence field on a recommendation', () => {
    const { payload } = invalidExamples.fabricatedConfidence!;
    expect(findFabricatedConfidence(payload).length).toBeGreaterThan(0);
    expect(() => assertNoFabricatedConfidence(payload)).toThrow(/Fabricated confidence/);
  });

  it('catches a confidence figure buried in prose', () => {
    const { payload } = invalidExamples.confidenceInProse!;
    expect(findFabricatedConfidence(payload).length).toBeGreaterThan(0);
  });

  it('leaves honest narrative uncertainty alone', () => {
    expect(findFabricatedConfidence(exampleRunResult)).toEqual([]);
  });

  it('rejects an invented confidence key in model output', () => {
    const result = ModelSynthesisSchema.safeParse({
      recommendations: [
        {
          title: 'x',
          priority: 'high',
          observation: 'x',
          inference: 'x',
          action: 'x',
          trade_off: 'x',
          uncertainty: 'x',
          next_check: 'x',
          evidence_ids: ['ev_example_capability'],
          confidence: 0.84,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('constraint enforcement', () => {
  it('blocks an action for an unavailable player', () => {
    const violations = findConstraintViolations(
      [exampleRecommendation],
      [{ ...examplePlayers[0]!, availability: 'unavailable' }],
    );
    expect(violations.map((v) => v.kind)).toContain('unavailable_player');
  });

  it('blocks minutes above the staff-supplied limit', () => {
    const violations = findConstraintViolations(
      [
        {
          ...exampleRecommendation,
          player_actions: [{ player_id: 'pl_example_a', planned_minutes: 70, role: 'Right wing' }],
        },
      ],
      examplePlayers,
    );
    expect(violations.map((v) => v.kind)).toContain('exceeds_supplied_minutes');
  });

  it('allows minutes at exactly the supplied limit', () => {
    expect(findConstraintViolations([exampleRecommendation], examplePlayers)).toEqual([]);
  });

  it('does not block a player on monitor status', () => {
    const violations = findConstraintViolations(
      [{ ...exampleRecommendation, player_actions: [{ player_id: 'pl_example_a', planned_minutes: 30, role: 'x' }] }],
      [{ ...examplePlayers[0]!, availability: 'monitor' }],
    );
    expect(violations).toEqual([]);
  });

  it('ignores withdrawn recommendations', () => {
    const violations = findConstraintViolations(
      [{ ...exampleRecommendation, status: 'withdrawn' }],
      [{ ...examplePlayers[0]!, availability: 'unavailable' }],
    );
    expect(violations).toEqual([]);
  });
});

describe('malformed references', () => {
  it('rejects a display name used as a player ID', () => {
    const { payload } = invalidExamples.malformedPlayerId!;
    expect(RecommendationSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects a source claiming to be both public and a private record', () => {
    const { payload } = invalidExamples.sourceWithBothUrlAndRecordId!;
    expect(EvidenceItemSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an added change that also claims a prior recommendation', () => {
    const { payload } = invalidExamples.addedChangeWithPriorId!;
    expect(ChangeSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts every well-formed change in the scenario example', () => {
    for (const change of exampleScenarioResult.changes) {
      expect(ChangeSchema.safeParse(change).success).toBe(true);
    }
  });
});
