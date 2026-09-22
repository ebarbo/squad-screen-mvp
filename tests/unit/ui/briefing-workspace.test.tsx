import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FixturesResponse, Recommendation, RunResult } from '@/domain/contracts';
import {
  exampleAbstainingRunResult,
  exampleRecommendation,
  exampleRunResult,
} from '@/domain/examples';
import { ApiClientError, type BriefingApi } from '@/lib/api-client';
import { BriefingWorkspace } from '@/components/briefing/briefing-workspace';
import {
  EXAMPLE_FIXTURE_SUMMARY,
  createDevelopmentApi,
} from '@/components/briefing/development-api';
import { ScenarioSlotPlaceholder } from '@/components/briefing/scenario-slot';

afterEach(cleanup);

const fixtures: FixturesResponse = { fixtures: [EXAMPLE_FIXTURE_SUMMARY] };

function stubApi(overrides: Partial<BriefingApi> = {}): BriefingApi {
  return {
    origin: 'live-api',
    listFixtures: async () => fixtures,
    generate: async () => exampleRunResult,
    reevaluate: async () => {
      throw new Error('not used in these tests');
    },
    ...overrides,
  };
}

function renderWorkspace(api: BriefingApi) {
  return render(<BriefingWorkspace scenarioSlot={ScenarioSlotPlaceholder} createApi={() => api} />);
}

async function generate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
}

describe('before a briefing exists', () => {
  it('shows an empty state that invites the first run rather than a fake result', async () => {
    renderWorkspace(stubApi());

    expect(await screen.findByText(/no briefing generated yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();
    expect(screen.getByText(/not generated/i)).toBeInTheDocument();
  });

  it('reports a fixture-load failure with the server remediation and offers a retry', async () => {
    const api = stubApi({
      listFixtures: async () => {
        throw new ApiClientError({
          kind: 'source_unavailable',
          code: 'source_unavailable',
          message: 'The fixture store could not be read.',
          retryable: true,
          remediation: 'Check the data directory and retry.',
        });
      },
    });

    renderWorkspace(api);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/fixture store could not be read/i)).toBeInTheDocument();
    expect(within(alert).getByText(/check the data directory and retry/i)).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('generating a briefing', () => {
  it('shows a busy state while the run is in flight and no partial result', async () => {
    let release: (value: RunResult) => void = () => {};
    const api = stubApi({
      generate: () =>
        new Promise<RunResult>((resolve) => {
          release = resolve;
        }),
    });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);

    expect(await screen.findByText(/no result is shown until the run completes/i)).toBeInTheDocument();
    expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();

    release(exampleRunResult);
    expect(await screen.findByTestId('recommendation-card')).toBeInTheDocument();
  });

  it('separates observation, inference, action and uncertainty on the card', async () => {
    const user = userEvent.setup();
    renderWorkspace(stubApi());
    await generate(user);

    const card = await screen.findByTestId('recommendation-card');
    const facets = card.querySelectorAll('[data-facet]');
    const kinds = [...facets].map((node) => node.getAttribute('data-facet'));

    expect(kinds).toEqual([
      'observation',
      'inference',
      'action',
      'trade_off',
      'uncertainty',
      'next_check',
    ]);
    expect(within(card).getByText(exampleRecommendation.observation)).toBeInTheDocument();
    expect(within(card).getByText(exampleRecommendation.inference)).toBeInTheDocument();
    expect(within(card).getByText(exampleRecommendation.action)).toBeInTheDocument();
    expect(within(card).getByText(exampleRecommendation.uncertainty)).toBeInTheDocument();
  });

  it('shows at most three cards and says so when the response carried more', async () => {
    const four: Recommendation[] = ['rec_one', 'rec_two', 'rec_three', 'rec_four'].map((id) => ({
      ...exampleRecommendation,
      id,
    }));
    const api = stubApi({
      generate: async () => ({ ...exampleRunResult, recommendations: four }),
    });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);

    await waitFor(() => expect(screen.getAllByTestId('recommendation-card')).toHaveLength(3));
    expect(screen.getByText(/carried 4 recommendations/i)).toBeInTheDocument();
  });

  it('renders zero recommendations as a real answer with the run\u2019s own reason', async () => {
    const api = stubApi({ generate: async () => exampleAbstainingRunResult });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);

    expect(await screen.findByText(/no recommendation was proposed/i)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(exampleAbstainingRunResult.abstention_note ?? '', 'i')),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('counts come from the response, not from invented progress', () => {
  it('reports evidence, origin and citation counts that match the payload', async () => {
    const user = userEvent.setup();
    renderWorkspace(stubApi());
    await generate(user);

    await screen.findByTestId('recommendation-card');

    const evidenceCount = screen.getByTitle(/number of evidence records returned/i);
    expect(evidenceCount).toHaveTextContent(String(exampleRunResult.evidence.length));

    // Three records, two origins: the two staff records share one.
    const origins = screen.getByTitle(/two copies of one report count once/i);
    expect(origins).toHaveTextContent('2');
  });

  it('shows no progress bar or percentage anywhere', async () => {
    const user = userEvent.setup();
    const { container } = renderWorkspace(stubApi());
    await generate(user);
    await screen.findByTestId('recommendation-card');

    expect(container.querySelector('progress')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });
});

describe('failed runs are never replaced with content', () => {
  it('reports a provider timeout and keeps the card area empty', async () => {
    const api = stubApi({
      generate: async () => {
        throw new ApiClientError({
          kind: 'provider_timeout',
          code: 'provider_timeout',
          message: 'The provider did not answer within 30 seconds.',
          retryable: true,
        });
      },
    });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/did not answer within 30 seconds/i)).toBeInTheDocument();
    expect(within(alert).getByText(/nothing below was replaced/i)).toBeInTheDocument();
    expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();
  });

  it('reports missing configuration as a configuration problem, not a transient one', async () => {
    const api = stubApi({
      generate: async () => {
        throw new ApiClientError({
          kind: 'missing_configuration',
          code: 'missing_configuration',
          message: 'NEBIUS_API_KEY is not set on the server.',
          retryable: false,
        });
      },
    });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(/NEBIUS_API_KEY is not set on the server\./),
    ).toBeInTheDocument();
    expect(within(alert).getByText(/code: missing_configuration/)).toBeInTheDocument();
    expect(within(alert).queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('does not silently fall back to examples when a live call fails', async () => {
    const api = stubApi({
      generate: async () => {
        throw new ApiClientError({
          kind: 'provider_error',
          code: 'provider_error',
          message: 'Provider rejected the call.',
          retryable: true,
        });
      },
    });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);

    await screen.findByRole('alert');
    expect(screen.queryByTestId('development-data-banner')).not.toBeInTheDocument();
    // The example route exists, but only as an explicit choice.
    expect(screen.getByRole('button', { name: /load contract example instead/i })).toBeInTheDocument();
  });
});

describe('development data is unmistakable', () => {
  it('banners the page and marks the run as stub transport', async () => {
    const user = userEvent.setup();
    renderWorkspace(createDevelopmentApi({ delayMs: 0 }));
    await generate(user);
    await screen.findByTestId('recommendation-card');

    const banner = screen.getByTestId('development-data-banner');
    expect(banner).toHaveTextContent(/development data/i);
    expect(banner).toHaveTextContent(/no model was called/i);

    expect(screen.getAllByTestId('development-data-tag').length).toBeGreaterThan(0);
    expect(screen.getByText(/stub transport — no provider call/i)).toBeInTheDocument();
    expect(screen.queryByText(/^live inference$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no provider call was made for this run/i)).toBeInTheDocument();
  });

  it('shows the live-inference marker only for a live transport', async () => {
    const api = stubApi({
      generate: async () => ({
        ...exampleRunResult,
        telemetry: { ...exampleRunResult.telemetry, transport: 'live' as const },
      }),
    });

    const user = userEvent.setup();
    renderWorkspace(api);
    await generate(user);
    await screen.findByTestId('recommendation-card');

    expect(screen.getByText(/^live inference$/i)).toBeInTheDocument();
    expect(screen.queryByTestId('development-data-banner')).not.toBeInTheDocument();
  });
});

describe('the scenario slot', () => {
  it('renders whatever component the page passes, and nothing scenario-specific otherwise', async () => {
    renderWorkspace(stubApi());

    expect(await screen.findByTestId('scenario-slot-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/availability what-if/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /re-?evaluate/i })).not.toBeInTheDocument();
  });

  it('hands the slot the base run and an evidence-inspection callback', async () => {
    const seen = vi.fn();
    const Probe: typeof ScenarioSlotPlaceholder = (props) => {
      seen(props.baseRun?.run_id ?? null);
      return (
        <button
          type="button"
          onClick={() =>
            props.onInspectEvidence({
              recommendation: exampleRecommendation,
              contextLabel: 'Scenario probe',
            })
          }
        >
          probe inspect
        </button>
      );
    };

    const user = userEvent.setup();
    render(<BriefingWorkspace scenarioSlot={Probe} createApi={() => stubApi()} />);
    await generate(user);
    await screen.findByTestId('recommendation-card');

    expect(seen).toHaveBeenCalledWith(exampleRunResult.run_id);

    await user.click(screen.getByRole('button', { name: 'probe inspect' }));
    const drawer = await screen.findByTestId('evidence-drawer');
    expect(within(drawer).getByText('Scenario probe')).toBeInTheDocument();
  });
});
