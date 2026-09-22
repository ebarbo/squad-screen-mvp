import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_FIXTURE } from '~/data/demo/fixture';
import { PLAYER_A_ID } from '~/data/demo/squad';
import {
  RunResultSchema,
  ScenarioResultSchema,
  checkReferentialIntegrity,
  findFabricatedConfidence,
} from '@/domain/contracts';
import { ModelClient } from '@/server/models/client';
import { ProviderError } from '@/server/models/errors';
import { DEFAULT_COMPARISON_MODEL_ID, DEFAULT_MODEL_ID } from '@/server/config/env';
import { generate, listFixtures, reevaluateRun } from '@/server/runs/service';
import { clearRuns } from '@/server/runs/store';

const stubConfig = {
  mode: 'stub' as const,
  apiKey: null,
  baseUrl: 'https://api.studio.nebius.com/v1',
  modelId: DEFAULT_MODEL_ID,
  comparisonModelId: DEFAULT_COMPARISON_MODEL_ID,
  timeoutMs: 5000,
  maxRetries: 2,
  priceInputPerMTok: null,
  priceOutputPerMTok: null,
};

const client = () => ModelClient.create(stubConfig);

beforeEach(() => {
  clearRuns();
});

describe('fixtures endpoint', () => {
  it('lists the one fixture with its data modes and provenance', () => {
    const fixtures = listFixtures();
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]!.id).toBe(DEMO_FIXTURE.id);
    expect(fixtures[0]!.data_modes).toContain('synthetic');
    expect(fixtures[0]!.provenance_note).toMatch(/fictional/i);
  });
});

describe('the core demo loop', () => {
  it('generates, re-evaluates, and explains what changed', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    expect(RunResultSchema.safeParse(base).success).toBe(true);
    expect(base.recommendations.length).toBeGreaterThan(0);

    const scenario = await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });
    expect(ScenarioResultSchema.safeParse(scenario).success).toBe(true);

    // The point of the demo: advice that depended on Player A is gone, and the
    // change is explained rather than merely happening.
    const withdrawn = scenario.changes.filter((change) => change.change_type === 'withdrawn');
    expect(withdrawn.length).toBeGreaterThan(0);
    expect(withdrawn[0]!.reason.length).toBeGreaterThan(0);
  });

  it('produces an action that needs both opponent evidence and own-squad context', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const recommendation = base.recommendations[0]!;

    const cited = recommendation.evidence_ids.map(
      (id) => base.evidence.find((item) => item.id === id)!,
    );
    const categories = new Set(cited.map((item) => item.category));

    expect(categories.has('tactical_observation')).toBe(true);
    expect(categories.has('capability')).toBe(true);
    expect(recommendation.player_actions.length).toBeGreaterThan(0);
  });

  it('respects the staff-supplied minute limit', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const action = base.recommendations[0]!.player_actions.find((entry) => entry.player_id === PLAYER_A_ID);
    expect(action?.planned_minutes).toBeLessThanOrEqual(45);
  });

  it('cites only evidence the run carries', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const problems = checkReferentialIntegrity({
      recommendations: base.recommendations,
      evidence: base.evidence,
    });
    // With no player or constraint list supplied, only evidence references are
    // resolvable, so this asserts specifically that no citation is invented.
    expect(problems.filter((problem) => problem.kind === 'unknown_evidence_id')).toEqual([]);
  });

  it('never states a confidence figure anywhere in a response', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    expect(findFabricatedConfidence(base)).toEqual([]);
  });
});

describe('scenario immutability', () => {
  it('reuses the parent evidence snapshot', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const scenario = await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });
    expect(scenario.evidence_snapshot_id).toBe(base.evidence_snapshot_id);
  });

  it('leaves the base run readable and unchanged, so reset works', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const before = JSON.stringify(base.recommendations);

    await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });

    expect(JSON.stringify(base.recommendations)).toBe(before);
  });

  it('survives repeated toggles without drifting', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });

    for (let i = 0; i < 3; i += 1) {
      const scenario = await reevaluateRun({
        runId: base.run_id,
        overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
        client: client(),
      });
      expect(scenario.evidence_snapshot_id).toBe(base.evidence_snapshot_id);
      expect(scenario.parent_run_id).toBe(base.run_id);
    }
  });

  it('proposes no action for the player assumed unavailable', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const scenario = await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });

    for (const recommendation of scenario.recommendations) {
      for (const action of recommendation.player_actions) {
        expect(action.player_id).not.toBe(PLAYER_A_ID);
      }
    }
  });

  it('offers a genuinely different action rather than the same advice with a new name', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const scenario = await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });

    if (scenario.recommendations.length > 0) {
      expect(scenario.recommendations[0]!.action).not.toBe(base.recommendations[0]!.action);
    }
  });

  it('keeps withdrawn advice inspectable with its evidence', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const scenario = await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });

    expect(scenario.withdrawn_recommendations.length).toBeGreaterThan(0);
    for (const withdrawn of scenario.withdrawn_recommendations) {
      expect(withdrawn.status).toBe('withdrawn');
      for (const id of withdrawn.evidence_ids) {
        expect(scenario.evidence.some((item) => item.id === id)).toBe(true);
      }
    }
  });

  it('enforces constraints against the scenario squad, not the factual one', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    const scenario = await reevaluateRun({
      runId: base.run_id,
      overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
      client: client(),
    });

    const assumption = scenario.applied_assumptions[0]!;
    expect(assumption.player_id).toBe(PLAYER_A_ID);
    expect(assumption.is_hypothetical).toBe(true);
    // The factual value is retained, which is what makes reset possible and lets
    // the UI say "assumed unavailable, record says available".
    expect(assumption.replaces_factual_availability).toBe('available');
    expect(base.recommendations.length).toBeGreaterThan(0);
  });
});

describe('failure modes', () => {
  it('rejects an unknown fixture with a structured error', async () => {
    await expect(generate({ fixtureId: 'fx_not_real', client: client() })).rejects.toMatchObject({
      code: 'unknown_fixture',
      retryable: false,
    });
  });

  it('rejects an unknown run with a structured error', async () => {
    await expect(
      reevaluateRun({
        runId: 'run_base_9999',
        overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
        client: client(),
      }),
    ).rejects.toMatchObject({ code: 'unknown_run', retryable: false });
  });

  it('explains that runs do not survive a restart', async () => {
    try {
      await reevaluateRun({
        runId: 'run_base_9999',
        overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
        client: client(),
      });
    } catch (error) {
      expect((error as ProviderError).remediation).toMatch(/in memory/i);
    }
  });

  it('rejects an assumption about a player who is not in the squad', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    await expect(
      reevaluateRun({
        runId: base.run_id,
        overrides: [{ player_id: 'pl_ghost', availability: 'unavailable' }],
        client: client(),
      }),
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('fails rather than fabricating when no provider is configured', () => {
    expect(() => ModelClient.create({ ...stubConfig, mode: 'live' })).toThrow(ProviderError);
  });
});

describe('abstention', () => {
  it('returns no recommendation when the supporting observation is absent', async () => {
    const base = await generate({
      fixtureId: DEMO_FIXTURE.id,
      variant: 'missing_tactical_support',
      client: client(),
    });

    expect(base.recommendations).toHaveLength(0);
    expect(base.abstention_note).not.toBeNull();
    expect(base.warnings.some((warning) => warning.code === 'abstained')).toBe(true);
  });

  it('still returns the full evidence set when abstaining, so the drawer works', async () => {
    const base = await generate({
      fixtureId: DEMO_FIXTURE.id,
      variant: 'missing_tactical_support',
      client: client(),
    });
    expect(base.evidence.length).toBeGreaterThan(0);
  });
});

describe('constraint enforcement across the whole run', () => {
  it('proposes no action above a staff-supplied limit in any variant', async () => {
    for (const variant of ['complete_evidence', 'conflicting_availability', 'unavailable_player_a'] as const) {
      const base = await generate({ fixtureId: DEMO_FIXTURE.id, variant, client: client() });

      // The service already enforces this; re-checking here proves the guarantee
      // holds at the boundary a consumer actually sees, for every packet.
      const squad = base.recommendations.flatMap((recommendation) => recommendation.player_actions);
      for (const action of squad) {
        if (action.player_id === PLAYER_A_ID && action.planned_minutes !== null) {
          expect(action.planned_minutes).toBeLessThanOrEqual(45);
        }
      }

      expect(findFabricatedConfidence(base)).toEqual([]);
    }
  });

  it('reports the unresolved opponent availability conflict as a warning', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    expect(base.warnings.some((warning) => warning.code === 'evidence_conflict')).toBe(true);
  });

  it('reports syndicated copies as collapsed', async () => {
    const base = await generate({ fixtureId: DEMO_FIXTURE.id, client: client() });
    expect(base.warnings.some((warning) => warning.code === 'duplicate_origin_collapsed')).toBe(true);
  });
});
