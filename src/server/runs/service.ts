/**
 * Generation and scenario orchestration (EWE-67).
 *
 * One place that composes adapters, context, model and validation, so the API
 * routes, the headless demo command and the evaluation harness all exercise the
 * same path. A bug that only reproduces through the browser is a bug nobody can
 * debug at 14:00 on demo day.
 */
import {
  type AvailabilityOverride,
  type FixtureSummary,
  type RunResult,
  type ScenarioResult,
} from '@/domain/contracts';
import { AS_OF, DEMO_FIXTURE, OPPONENT_TEAM, OWN_TEAM } from '~/data/demo/fixture';
import { NORTHGATE_ROSTER } from '~/data/demo/squad';
import { BASE_SOURCE_RECORDS, getVariant, type VariantId } from '~/data/demo/variants';
import type { SourceRecord } from '~/data/sources/types';
import { buildBaseContext } from '@/server/evidence/context';
import { synthesize } from '@/server/intelligence/synthesize';
import { ModelClient } from '@/server/models/client';
import { ProviderError } from '@/server/models/errors';
import { reevaluate } from '@/server/scenarios/reevaluate';
import { UnknownPlayerError } from '@/server/scenarios/overlay';
import { getRun, nextRunId, nextScenarioId, saveRun } from './store';

export function listFixtures(): FixtureSummary[] {
  return [
    {
      id: DEMO_FIXTURE.id,
      competition: DEMO_FIXTURE.competition,
      label: `${DEMO_FIXTURE.home_team.name} v ${DEMO_FIXTURE.away_team.name}`,
      kickoff_at: DEMO_FIXTURE.kickoff_at,
      information_cutoff: DEMO_FIXTURE.information_cutoff,
      data_modes: [...DEMO_FIXTURE.data_modes],
      provenance_note: DEMO_FIXTURE.provenance_note,
    },
  ];
}

export function unknownFixture(fixtureId: string): ProviderError {
  return new ProviderError('unknown_fixture', `No fixture ${fixtureId} is available.`, {
    retryable: false,
    remediation: `This build serves one fixture: ${DEMO_FIXTURE.id}. Call GET /api/fixtures to list it.`,
  });
}

export function unknownRun(runId: string): ProviderError {
  return new ProviderError('unknown_run', `No run ${runId} is known to this server.`, {
    retryable: false,
    remediation:
      'Runs are held in memory and do not survive a restart. Generate a base run first, then re-evaluate it.',
  });
}

export interface GenerateOptions {
  readonly fixtureId: string;
  /** Selects an alternative source packet. Used by the evaluation harness. */
  readonly variant?: VariantId;
  readonly client?: ModelClient;
  readonly modelId?: string;
}

export async function generate(options: GenerateOptions): Promise<RunResult> {
  if (options.fixtureId !== DEMO_FIXTURE.id) throw unknownFixture(options.fixtureId);

  const records: readonly SourceRecord[] =
    options.variant === undefined ? BASE_SOURCE_RECORDS : getVariant(options.variant).records;

  const { context, warnings: contextWarnings } = buildBaseContext({
    fixture: DEMO_FIXTURE,
    ownTeam: OWN_TEAM,
    opponentTeam: OPPONENT_TEAM,
    roster: NORTHGATE_ROSTER,
    records,
    asOf: AS_OF,
    retrievedAt: new Date().toISOString(),
  });

  const client = options.client ?? ModelClient.create();
  const runId = nextRunId('base');

  const synthesis = await synthesize({
    context,
    client,
    runId,
    ...(options.modelId === undefined ? {} : { modelId: options.modelId }),
  });

  const result: RunResult = {
    run_id: runId,
    fixture_id: context.fixture.id,
    evidence_snapshot_id: context.evidence_snapshot_id,
    as_of: context.as_of,
    recommendations: [...synthesis.recommendations],
    evidence: [...context.evidence],
    abstention_note: synthesis.abstentionNote,
    warnings: [...contextWarnings, ...synthesis.warnings],
    telemetry: synthesis.telemetry,
  };

  saveRun({
    runId,
    fixtureId: context.fixture.id,
    context,
    recommendations: synthesis.recommendations,
    result,
    createdAt: Date.now(),
  });

  return result;
}

export interface ReevaluateOptions {
  readonly runId: string;
  readonly scenarioId?: string;
  readonly overrides: readonly AvailabilityOverride[];
  readonly client?: ModelClient;
}

export async function reevaluateRun(options: ReevaluateOptions): Promise<ScenarioResult> {
  const base = getRun(options.runId);
  if (base === undefined) throw unknownRun(options.runId);

  const client = options.client ?? ModelClient.create();

  try {
    const result = await reevaluate({
      baseContext: base.context,
      baseRunId: base.runId,
      baseRecommendations: base.recommendations,
      scenarioId: options.scenarioId ?? nextScenarioId(),
      scenarioRunId: nextRunId('scenario'),
      overrides: options.overrides,
      client,
    });

    // The base run is deliberately not overwritten: reset must return to the
    // factual briefing, and a withdrawn recommendation must stay inspectable.
    return result;
  } catch (error) {
    if (error instanceof UnknownPlayerError) {
      throw new ProviderError('invalid_request', error.message, {
        retryable: false,
        remediation: 'Use a player_id from the squad returned by the base run.',
      });
    }
    throw error;
  }
}
