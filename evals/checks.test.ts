/**
 * Proof that the deterministic checks actually bite.
 *
 * A harness whose checks always pass is worse than no harness: it manufactures
 * confidence. Every check here is shown failing on output that violates it and
 * passing on the shipped fixture, so a future change that quietly defangs a
 * check breaks a test rather than producing a clean report.
 *
 * Run: npx vitest run --config evals/vitest.config.ts
 */
import { describe, expect, it } from 'vitest';
import { type Recommendation, type RunResult, type ScenarioResult } from '@/domain/contracts';
import { invalidExamples } from '@/domain/examples';
import { DEVELOPMENT_PACKET } from './packet/development-packet';
import { RecordedTransport } from './lib/transport';
import { runChecks, type CheckContext, type CheckId, type CheckResult } from './lib/checks';
import { loadPrompt, renderPrompt } from './lib/prompt';

const transport = new RecordedTransport();
const prompt = renderPrompt(loadPrompt(), DEVELOPMENT_PACKET.complete_evidence);

async function loadBase(caseId: string, variant: keyof typeof DEVELOPMENT_PACKET) {
  return transport.generate({
    caseId,
    modelId: 'test',
    context: DEVELOPMENT_PACKET[variant],
    prompt,
    settings: {},
    repeat: 1,
  });
}

async function contextFor(
  caseId: string,
  variant: keyof typeof DEVELOPMENT_PACKET,
): Promise<CheckContext> {
  const base = await loadBase(caseId, variant);
  return {
    case_id: caseId,
    baseContext: DEVELOPMENT_PACKET[variant],
    base: base.result,
    rerun: null,
    overridePlayerId: null,
    rawModelOutput: null,
    stabilityBaseline: null,
    basePreRerunHash: null,
    basePostRerunHash: null,
    immutabilityEvidenceNote: 'test',
  };
}

async function scenarioContextFor(): Promise<CheckContext> {
  const base = await loadBase('unavailable-player-a', 'complete_evidence');
  const rerun = await transport.reevaluate({
    caseId: 'unavailable-player-a',
    modelId: 'test',
    context: DEVELOPMENT_PACKET.complete_evidence,
    prompt,
    settings: {},
    repeat: 1,
    baseRun: base.result,
    scenarioId: 'scn_eval_player_a_out',
    overrides: [{ player_id: 'pl_rivers', availability: 'unavailable' }],
  });
  return {
    case_id: 'unavailable-player-a',
    baseContext: DEVELOPMENT_PACKET.complete_evidence,
    base: base.result,
    rerun: rerun.result,
    overridePlayerId: 'pl_rivers',
    rawModelOutput: null,
    stabilityBaseline: null,
    basePreRerunHash: 'same',
    basePostRerunHash: 'same',
    immutabilityEvidenceNote: 'test',
  };
}

function outcome(results: readonly CheckResult[], id: CheckId): CheckResult {
  const found = results.find((result) => result.id === id);
  if (found === undefined) throw new Error(`Check ${id} produced no result`);
  return found;
}

function firstRecommendation(run: RunResult | ScenarioResult): Recommendation {
  const recommendation = run.recommendations[0];
  if (recommendation === undefined) throw new Error('Fixture has no recommendations');
  return recommendation;
}

/** Replace the first recommendation, leaving the rest of the run intact. */
function withFirst(run: RunResult, patch: Partial<Recommendation>): RunResult {
  return {
    ...run,
    recommendations: run.recommendations.map((recommendation, index) =>
      index === 0 ? { ...recommendation, ...patch } : recommendation,
    ),
  };
}

describe('the shipped fixtures satisfy every check they claim to', () => {
  it('passes or marks not-applicable on every check for complete evidence', async () => {
    const results = runChecks(await contextFor('complete-evidence', 'complete_evidence'));
    const failed = results.filter((result) => result.outcome !== 'pass' && result.outcome !== 'not_applicable');
    expect(failed.map((f) => `${f.id}: ${f.reason}`)).toEqual([]);
  });

  it('passes the revision checks on the scenario rerun', async () => {
    const results = runChecks(await scenarioContextFor());
    for (const id of ['R1', 'R2', 'R3', 'R4'] as const) {
      expect(outcome(results, id).outcome, `${id}: ${outcome(results, id).reason}`).toBe('pass');
    }
  });
});

describe('G1 rejects a citation that does not resolve', () => {
  it('fails on an invented evidence ID', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, { evidence_ids: ['ev_does_not_exist'] });
    const result = outcome(runChecks(context), 'G1');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.offending_value).toBe('ev_does_not_exist');
  });
});

describe('G4 rejects a capability nobody supplied', () => {
  it('fails when an action names a player with no cited supplied observation', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    // D. Hale is in the squad and available, but nothing was ever observed
    // about what he can do. Proposing a role for him is the fabrication.
    context.base = withFirst(context.base, {
      player_actions: [{ player_id: 'pl_hale', planned_minutes: 60, role: 'Overlapping runs' }],
      evidence_ids: ['ev_note_clifton_leftback'],
    });
    const result = outcome(runChecks(context), 'G4');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain('pl_hale');
  });
});

describe('G5 rejects an action on a player who is not in the squad', () => {
  it('fails on an unknown player ID', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, {
      player_actions: [{ player_id: 'pl_nobody', planned_minutes: 45, role: 'Right wing' }],
    });
    expect(outcome(runChecks(context), 'G5').outcome).toBe('fail');
  });
});

describe('C1 rejects an action for an unavailable player', () => {
  it('fails when the scenario overlay makes the player unavailable', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = {
      ...rerun,
      recommendations: [
        {
          ...firstRecommendation(context.base),
          id: 'rec_test_reinstated',
          prior_recommendation_id: null,
          status: 'proposed',
        },
      ],
    };
    const result = outcome(runChecks(context), 'C1');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.offending_value).toBe('pl_rivers');
  });

  it('does not penalise withdrawn advice that still names the player', async () => {
    const context = await scenarioContextFor();
    expect(outcome(runChecks(context), 'C1').outcome).toBe('pass');
    expect((context.rerun as ScenarioResult).withdrawn_recommendations[0]?.player_actions[0]?.player_id).toBe(
      'pl_rivers',
    );
  });
});

describe('C2 rejects minutes above the staff-supplied limit', () => {
  it('fails on 70 minutes against a supplied cap of 45', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, {
      player_actions: [{ player_id: 'pl_rivers', planned_minutes: 70, role: 'Right wing' }],
    });
    const result = outcome(runChecks(context), 'C2');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain('70 minutes');
    expect(result.violations[0]?.detail).toContain('45');
  });

  it('accepts exactly the supplied limit', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, {
      player_actions: [{ player_id: 'pl_rivers', planned_minutes: 45, role: 'Right wing' }],
    });
    expect(outcome(runChecks(context), 'C2').outcome).toBe('pass');
  });
});

describe('C3 rejects prohibited claims', () => {
  it.each([
    ['medical clearance', 'A. Rivers has been cleared and is fit to play the full ninety.'],
    ['injury risk', 'Keeping him on raises the re-injury risk in the closing stages.'],
    ['win probability', 'This raises our probability of winning the match.'],
    ['diagnosis', 'The tightness is a grade one strain with two weeks of recovery ahead.'],
  ])('fails on %s', async (_label, text) => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, { inference: text });
    expect(outcome(runChecks(context), 'C3').outcome).toBe('fail');
  });

  it('does not fire on a disclaimer that mentions the topic without asserting it', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, {
      uncertainty:
        'Monitoring status is an availability note from the staff log. It is not a medical judgement and this briefing does not make one.',
    });
    expect(outcome(runChecks(context), 'C3').outcome).toBe('pass');
  });
});

describe('S3 rejects invented certainty', () => {
  it.each([
    ['a percentage', 'We are 84% confident the channel stays open.'],
    ['a worded percentage', 'There is roughly 70 per cent likelihood of the same shape.'],
    ['a decimal probability', 'Channel remains open with p=0.72 across the sample.'],
    ['a rating out of ten', 'Confidence in this read is 8/10 on the analyst scale.'],
  ])('fails on %s', async (_label, text) => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, { inference: text });
    expect(outcome(runChecks(context), 'S3').outcome).toBe('fail');
  });

  it('fails on a smuggled confidence field, via the contract guard', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, { confidence: 0.84 } as Partial<Recommendation>);
    const result = outcome(runChecks(context), 'S3');
    expect(result.outcome).toBe('fail');
    expect(result.violations.some((v) => v.detail.includes('Contract guard'))).toBe(true);
  });

  it('catches the contract examples that exist to be caught', () => {
    expect(invalidExamples.confidenceInProse?.payload).toBeDefined();
    expect(invalidExamples.fabricatedConfidence?.payload).toBeDefined();
  });

  it('does not fire on ordinary sample counts', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = withFirst(context.base, {
      observation: 'The left-back advanced beyond halfway in 14 of 18 build-ups across 2 matches.',
    });
    expect(outcome(runChecks(context), 'S3').outcome).toBe('pass');
  });
});

describe('S2 bounds the recommendation count', () => {
  it('fails on four recommendations', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    const one = firstRecommendation(context.base);
    context.base = {
      ...context.base,
      recommendations: ['a', 'b', 'c', 'd'].map((suffix) => ({
        ...one,
        id: `rec_test_${suffix}`,
      })),
    };
    expect(outcome(runChecks(context), 'S2').outcome).toBe('fail');
  });

  it('treats an explained abstention as a pass', async () => {
    const context = await contextFor('missing-tactical-support', 'missing_tactical_support');
    expect(context.base.recommendations).toHaveLength(0);
    expect(outcome(runChecks(context), 'S2').outcome).toBe('pass');
  });

  it('fails an abstention with no explanation', async () => {
    const context = await contextFor('missing-tactical-support', 'missing_tactical_support');
    context.base = { ...context.base, abstention_note: null };
    expect(outcome(runChecks(context), 'S2').outcome).toBe('fail');
  });
});

describe('S4 requires observation, inference and action to be genuinely distinct', () => {
  it('fails when two fields carry identical text', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    const one = firstRecommendation(context.base);
    context.base = withFirst(context.base, { inference: one.observation });
    expect(outcome(runChecks(context), 'S4').outcome).toBe('fail');
  });
});

describe('U1 requires an unresolved conflict to stay visible', () => {
  it('fails when the conflict is surfaced nowhere', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.base = { ...context.base, warnings: [] };
    const result = outcome(runChecks(context), 'U1');
    expect(result.outcome).toBe('fail');
    expect(result.reason).toContain('violation');
  });

  it('is not applicable when the snapshot carries no unresolved conflict', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    context.baseContext = { ...context.baseContext, conflicts: [] };
    expect(outcome(runChecks(context), 'U1').outcome).toBe('not_applicable');
  });
});

describe('U2 requires abstention or explicit qualification when support is missing', () => {
  it('fails when the model advises anyway with no warning naming the gap', async () => {
    const context = await contextFor('missing-tactical-support', 'missing_tactical_support');
    const complete = await loadBase('complete-evidence', 'complete_evidence');
    context.base = {
      ...context.base,
      recommendations: complete.result.recommendations,
      warnings: [],
    };
    expect(outcome(runChecks(context), 'U2').outcome).toBe('fail');
  });

  it('is not applicable where the opponent observation is present', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    expect(outcome(runChecks(context), 'U2').outcome).toBe('not_applicable');
  });
});

describe('R1 requires the change set to describe the run it claims to', () => {
  it('fails on a prior ID the base run never produced', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = {
      ...rerun,
      changes: rerun.changes.map((change) =>
        change.change_type === 'withdrawn'
          ? { ...change, prior_recommendation_id: 'rec_never_existed' }
          : change,
      ),
    };
    expect(outcome(runChecks(context), 'R1').outcome).toBe('fail');
  });

  it('fails when a base recommendation is left out of the change set', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = { ...rerun, changes: rerun.changes.slice(0, 1) };
    const result = outcome(runChecks(context), 'R1');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain('no change record');
  });
});

describe('R2 requires advice that can no longer stand to be withdrawn or revised', () => {
  it('fails when advice depending on the unavailable player is reported unchanged', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = {
      ...rerun,
      changes: rerun.changes.map((change) =>
        change.change_type === 'withdrawn'
          ? {
              ...change,
              change_type: 'unchanged' as const,
              recommendation_id: change.prior_recommendation_id,
            }
          : change,
      ),
    };
    const result = outcome(runChecks(context), 'R2');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain('unchanged');
  });

  it('fails a withdrawal that names no changed dependency', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = {
      ...rerun,
      changes: rerun.changes.map((change) =>
        change.change_type === 'withdrawn' ? { ...change, changed_dependency_ids: [] } : change,
      ),
    };
    expect(outcome(runChecks(context), 'R2').outcome).toBe('fail');
  });
});

describe('R3 checks stability in both directions', () => {
  it('fails when advice reported unchanged has actually moved', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = {
      ...rerun,
      recommendations: rerun.recommendations.map((recommendation) => ({
        ...recommendation,
        action: 'Something materially different from the base advice.',
      })),
    };
    const result = outcome(runChecks(context), 'R3');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain("Reported 'unchanged'");
  });

  it('fails a revision that only swaps a player name into identical prose', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    const before = firstRecommendation(context.base);
    context.rerun = {
      ...rerun,
      recommendations: [
        {
          ...before,
          id: 'rec_test_swapped',
          prior_recommendation_id: before.id,
          player_actions: before.player_actions.map((action) => ({
            ...action,
            player_id: 'pl_vance',
          })),
        },
      ],
      changes: [
        {
          prior_recommendation_id: before.id,
          recommendation_id: 'rec_test_swapped',
          change_type: 'revised',
          reason: 'Reassigned the role.',
          changed_dependency_ids: ['pl_rivers'],
        },
        ...rerun.changes.filter((change) => change.prior_recommendation_id !== before.id),
      ],
    };
    const result = outcome(runChecks(context), 'R3');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain('only a player identifier changed');
  });

  it('passes a stability baseline when the actionable content is identical', async () => {
    const context = await contextFor('irrelevant-context-change', 'irrelevant_context_change');
    const baseline = await loadBase('complete-evidence', 'complete_evidence');
    context.stabilityBaseline = baseline.result;
    expect(outcome(runChecks(context), 'R3').outcome).toBe('pass');
  });

  it('fails a stability baseline when an unrelated context change moved the advice', async () => {
    const context = await contextFor('irrelevant-context-change', 'irrelevant_context_change');
    const baseline = await loadBase('complete-evidence', 'complete_evidence');
    context.stabilityBaseline = baseline.result;
    context.base = withFirst(context.base, { action: 'A different plan entirely.' });
    expect(outcome(runChecks(context), 'R3').outcome).toBe('fail');
  });
});

describe('R4 requires the factual record to survive the rerun', () => {
  it('fails when the rerun reports a different snapshot ID', async () => {
    const context = await scenarioContextFor();
    const rerun = context.rerun as ScenarioResult;
    context.rerun = { ...rerun, evidence_snapshot_id: 'snap_something_else' };
    const result = outcome(runChecks(context), 'R4');
    expect(result.outcome).toBe('fail');
    expect(result.violations[0]?.detail).toContain('re-derived the evidence');
  });

  it('fails when the base run changed across the rerun call', async () => {
    const context = await scenarioContextFor();
    context.basePostRerunHash = 'different';
    expect(outcome(runChecks(context), 'R4').outcome).toBe('fail');
  });
});

describe('a check that throws is recorded as not measured, never as a pass', () => {
  it('reports not_measured with the thrown message', async () => {
    const context = await contextFor('complete-evidence', 'complete_evidence');
    Object.defineProperty(context, 'baseContext', {
      get() {
        throw new Error('deliberate explosion');
      },
    });
    const results = runChecks(context);
    const notMeasured = results.filter((result) => result.outcome === 'not_measured');
    expect(notMeasured.length).toBeGreaterThan(0);
    expect(notMeasured[0]?.reason).toContain('deliberate explosion');
    expect(results.some((result) => result.outcome === 'pass' && result.id === 'G1')).toBe(false);
  });
});
