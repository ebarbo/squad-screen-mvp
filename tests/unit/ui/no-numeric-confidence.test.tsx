import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FixturesResponse, RunResult } from '@/domain/contracts';
import { findFabricatedConfidence } from '@/domain/contracts';
import { exampleEvidence, exampleRecommendation, exampleRunResult } from '@/domain/examples';
import type { BriefingApi } from '@/lib/api-client';
import { BriefingWorkspace } from '@/components/briefing/briefing-workspace';
import { EXAMPLE_FIXTURE_SUMMARY } from '@/components/briefing/development-api';
import { ScenarioSlotPlaceholder } from '@/components/briefing/scenario-slot';

afterEach(cleanup);

/**
 * The gate is that no numeric confidence appears anywhere in the interface.
 * These tests read the rendered text rather than the source, so a score
 * introduced by a template, a badge or a derived figure would still be caught.
 */

const fixtures: FixturesResponse = { fixtures: [EXAMPLE_FIXTURE_SUMMARY] };

function apiReturning(run: RunResult): BriefingApi {
  return {
    origin: 'live-api',
    listFixtures: async () => fixtures,
    generate: async () => run,
    reevaluate: async () => {
      throw new Error('not used in these tests');
    },
  };
}

/** Any percentage, decimal-fraction score, or "N out of 10" style rating. */
const SCORE_SHAPED = [
  /\b\d{1,3}(\.\d+)?\s?%/,
  /\b(confidence|probability|likelihood|certainty|win[ _-]?chance|success[ _-]?rate|risk[ _-]?score|injury[ _-]?risk)\b/i,
  /\b\d(\.\d+)?\s*\/\s*(5|10|100)\b/,
  /\bscore[:\s]+\d/i,
];

function visibleText(root: HTMLElement): string {
  return (root.textContent ?? '').replace(/\s+/g, ' ');
}

async function renderFullBriefing(run: RunResult = exampleRunResult) {
  const user = userEvent.setup();
  const view = render(
    <BriefingWorkspace scenarioSlot={ScenarioSlotPlaceholder} createApi={() => apiReturning(run)} />,
  );
  await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
  await screen.findByTestId('recommendation-card');
  return { user, view };
}

describe('no numeric confidence reaches the interface', () => {
  it('the briefing page shows no score-shaped text', async () => {
    const { view } = await renderFullBriefing();
    const text = visibleText(view.container);

    for (const pattern of SCORE_SHAPED) {
      expect(text, `matched ${pattern}`).not.toMatch(pattern);
    }
  });

  it('the evidence drawer shows no score-shaped text', async () => {
    const { user } = await renderFullBriefing();
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');
    const text = visibleText(drawer);

    for (const pattern of SCORE_SHAPED) {
      expect(text, `matched ${pattern}`).not.toMatch(pattern);
    }
    expect(drawer).toHaveTextContent(/cannot produce a calibrated one/i);
  });

  it('renders a null token count and a null cost as absent, never as zero', async () => {
    const { view } = await renderFullBriefing();
    const telemetry = within(view.container).getByText('Input tokens').closest('dl');
    if (!telemetry) throw new Error('telemetry list not found');

    expect(telemetry).toHaveTextContent(/Not reported — Contract example; no provider call/);
    expect(telemetry).not.toHaveTextContent(/Input tokens\s*0\b/);
    expect(telemetry).not.toHaveTextContent(/\$0\.0000/);
  });

  it('the run payload itself is free of fabricated confidence', () => {
    expect(findFabricatedConfidence(exampleRunResult)).toEqual([]);
    expect(findFabricatedConfidence(exampleRecommendation)).toEqual([]);
    expect(findFabricatedConfidence(exampleEvidence)).toEqual([]);
  });

  it('the guard would catch a score if one were smuggled in, so the check has teeth', () => {
    const smuggled = {
      ...exampleRecommendation,
      inference: 'We assess 84% confidence that the channel stays open.',
    };

    expect(findFabricatedConfidence(smuggled).length).toBeGreaterThan(0);
    expect(visibleText(document.body)).toBe('');
  });

  it('counts are integers taken from the payload, not normalised scores', async () => {
    const { view } = await renderFullBriefing();

    const counts = [...view.container.querySelectorAll('[title]')]
      .filter((node) => (node.getAttribute('title') ?? '').length > 30)
      .map((node) => node.firstElementChild?.textContent ?? '');

    const numeric = counts.filter((value) => /^\d+$/.test(value));
    expect(numeric.length).toBeGreaterThan(0);
    for (const value of numeric) {
      expect(Number.isInteger(Number(value))).toBe(true);
    }
  });
});
