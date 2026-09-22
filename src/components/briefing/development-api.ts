import type { FixtureSummary, FixturesResponse, RunResult, ScenarioResult } from '@/domain/contracts';
import {
  EXAMPLE_FIXTURE_ID,
  EXAMPLE_RUN_ID,
  exampleAbstainingRunResult,
  exampleEvidence,
  exampleRunResult,
  exampleScenarioResult,
} from '@/domain/examples';
import { ApiClientError, type BriefingApi } from '@/lib/api-client';

/**
 * A `BriefingApi` backed by the validated contract examples, for developing and
 * demonstrating the interface before the server exists.
 *
 * It is never selected automatically. The page offers it only after a live call
 * has already failed, and only on an explicit click, because silently swapping
 * example content in for a failed request is exactly the "canned success" the
 * contract forbids. Its `origin` is `contract-example` and every example it
 * returns carries `telemetry.transport: 'stub'`, so both the page and the
 * telemetry panel can say plainly that no inference ran.
 */

/** Latest retrieval time across the example records — the real cutoff for this packet. */
function latestRetrievedAt(): string {
  const times = exampleEvidence.map((item) => Date.parse(item.retrieved_at)).filter(Number.isFinite);
  const newest = times.length > 0 ? Math.max(...times) : Date.parse(exampleRunResult.as_of);
  return new Date(newest).toISOString();
}

export const EXAMPLE_FIXTURE_SUMMARY: FixtureSummary = {
  id: EXAMPLE_FIXTURE_ID,
  competition: 'Contract example — no real competition',
  label: 'Example Derby (contract fixture)',
  /** The examples carry no kickoff, so this is stated as a placeholder below. */
  kickoff_at: new Date(Date.parse(latestRetrievedAt()) + 8 * 60 * 60 * 1000).toISOString(),
  information_cutoff: latestRetrievedAt(),
  data_modes: [...new Set(exampleEvidence.map((item) => item.data_mode))],
  provenance_note:
    'Assembled from src/domain/examples for interface development. Not a real fixture and not the demo packet. The kickoff time is a placeholder — the contract examples do not carry one. The information cutoff is the latest retrieval time across the example records.',
};

export type DevelopmentScript = 'recommended' | 'abstained';

export interface DevelopmentApiOptions {
  /** Which example generation response to return. */
  script?: DevelopmentScript;
  /** Simulated latency, so loading states are visible while developing. */
  delayMs?: number;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(
          new ApiClientError({
            kind: 'aborted',
            code: 'aborted',
            message: 'Request cancelled.',
            retryable: false,
          }),
        );
      },
      { once: true },
    );
  });
}

export function createDevelopmentApi(options: DevelopmentApiOptions = {}): BriefingApi {
  const script = options.script ?? 'recommended';
  const delayMs = options.delayMs ?? 450;

  return {
    origin: 'contract-example',

    async listFixtures(signal): Promise<FixturesResponse> {
      await wait(delayMs, signal);
      return { fixtures: [EXAMPLE_FIXTURE_SUMMARY] };
    },

    async generate(input, signal): Promise<RunResult> {
      await wait(delayMs, signal);
      if (input.fixture_id !== EXAMPLE_FIXTURE_ID) {
        throw new ApiClientError({
          kind: 'unknown_fixture',
          code: 'unknown_fixture',
          message: `The contract examples only cover ${EXAMPLE_FIXTURE_ID}.`,
          retryable: false,
        });
      }
      return script === 'abstained' ? exampleAbstainingRunResult : exampleRunResult;
    },

    async reevaluate(input, signal): Promise<ScenarioResult> {
      await wait(delayMs, signal);
      if (input.run_id !== EXAMPLE_RUN_ID) {
        throw new ApiClientError({
          kind: 'unknown_run',
          code: 'unknown_run',
          message: `The contract examples only cover run ${EXAMPLE_RUN_ID}.`,
          retryable: false,
        });
      }
      return exampleScenarioResult;
    },
  };
}
