import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EvidenceItem, FixturesResponse, RunResult } from '@/domain/contracts';
import { exampleEvidence, exampleRecommendation, exampleRunResult } from '@/domain/examples';
import type { BriefingApi } from '@/lib/api-client';
import { BriefingWorkspace } from '@/components/briefing/briefing-workspace';
import { EXAMPLE_FIXTURE_SUMMARY } from '@/components/briefing/development-api';
import { ScenarioSlotPlaceholder } from '@/components/briefing/scenario-slot';

afterEach(cleanup);

const [wideOverload, capability, minutesLimit] = exampleEvidence;
if (!wideOverload || !capability || !minutesLimit) throw new Error('example evidence missing');

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

async function generated(run: RunResult = exampleRunResult) {
  const user = userEvent.setup();
  render(
    <BriefingWorkspace scenarioSlot={ScenarioSlotPlaceholder} createApi={() => apiReturning(run)} />,
  );
  await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
  await screen.findByTestId('recommendation-card');
  return user;
}

describe('every displayed reference opens its record', () => {
  it('opens the drawer from each evidence chip and lands on that record', async () => {
    const user = await generated();
    const card = screen.getByTestId('recommendation-card');

    for (const evidenceId of exampleRecommendation.evidence_ids) {
      await user.click(within(card).getByRole('button', { name: new RegExp(evidenceId) }));

      const drawer = await screen.findByTestId('evidence-drawer');
      const record = within(drawer)
        .getAllByTestId('evidence-record')
        .find((node) => node.getAttribute('data-evidence-id') === evidenceId);

      expect(record, `no record rendered for ${evidenceId}`).toBeDefined();
      const source = exampleEvidence.find((item) => item.id === evidenceId);
      expect(record).toHaveTextContent(source?.source.excerpt ?? '');

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByTestId('evidence-drawer')).not.toBeInTheDocument());
    }
  });

  it('shows every cited record, with its excerpt, locator and dates', async () => {
    const user = await generated();
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');
    const records = within(drawer).getAllByTestId('evidence-record');

    expect(records.map((node) => node.getAttribute('data-evidence-id'))).toEqual(
      exampleRecommendation.evidence_ids,
    );
    expect(within(drawer).getByText(wideOverload.source.excerpt)).toBeInTheDocument();
    expect(within(drawer).getByText('note-2026-09-19-01')).toBeInTheDocument();
    expect(within(drawer).getAllByText(/19 Sept 2026/).length).toBeGreaterThan(0);
  });

  it('shows the rationale chain from observation through to the proposed action', async () => {
    const user = await generated();
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');

    expect(drawer).toHaveTextContent('Rationale chain');
    expect(within(drawer).getByText(/^Observed:/)).toBeInTheDocument();
    expect(within(drawer).getByText(/^Inferred:/)).toBeInTheDocument();
    expect(within(drawer).getByText(/^Proposed action:/)).toBeInTheDocument();
    expect(drawer).toHaveTextContent(exampleRecommendation.observation);
    expect(drawer).toHaveTextContent(exampleRecommendation.action);
  });
});

describe('unresolved disagreement stays visible', () => {
  const disputedA: EvidenceItem = {
    ...capability,
    id: 'ev_dispute_fit',
    status: 'disputed',
    claim: 'Staff log records Player A as fit to start.',
    conflicts_with: ['ev_dispute_doubt'],
  };
  const disputedB: EvidenceItem = {
    ...minutesLimit,
    id: 'ev_dispute_doubt',
    status: 'disputed',
    claim: 'A later sheet records Player A as a doubt.',
    conflicts_with: ['ev_dispute_fit'],
    source: { ...minutesLimit.source, origin_id: 'org_example_other' },
  };

  const conflictedRun: RunResult = {
    ...exampleRunResult,
    evidence: [wideOverload, disputedA, disputedB],
    recommendations: [
      {
        ...exampleRecommendation,
        evidence_ids: ['ev_dispute_fit', 'ev_dispute_doubt'],
      },
    ],
  };

  it('shows both readings and does not merge them into one figure', async () => {
    const user = await generated(conflictedRun);
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');

    expect(within(drawer).getByText(disputedA.claim)).toBeInTheDocument();
    expect(within(drawer).getByText(disputedB.claim)).toBeInTheDocument();
    expect(within(drawer).getAllByTestId('evidence-conflicts')).toHaveLength(2);
    expect(within(drawer).getAllByText(/nothing here averages them/i)).toHaveLength(2);
    expect(within(drawer).getByText(/^2 with unresolved disagreement$/)).toBeInTheDocument();
  });

  it('moves focus to the contradicting record when its link is activated', async () => {
    const user = await generated(conflictedRun);
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');
    const conflictBlocks = within(drawer).getAllByTestId('evidence-conflicts');
    const firstBlock = conflictBlocks[0];
    if (!firstBlock) throw new Error('expected a conflict block');

    await user.click(within(firstBlock).getByRole('button', { name: /ev_dispute_doubt/ }));

    await waitFor(() =>
      expect(document.activeElement?.getAttribute('data-evidence-id')).toBe('ev_dispute_doubt'),
    );
  });

  it('marks a conflict pointing at a record the run did not return', async () => {
    const dangling: EvidenceItem = {
      ...capability,
      id: 'ev_dangling',
      status: 'disputed',
      conflicts_with: ['ev_never_returned'],
    };
    const run: RunResult = {
      ...exampleRunResult,
      evidence: [dangling],
      recommendations: [{ ...exampleRecommendation, evidence_ids: ['ev_dangling'] }],
    };

    const user = await generated(run);
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');
    const link = within(drawer).getByRole('button', { name: /ev_never_returned/ });
    expect(link).toBeDisabled();
  });
});

describe('shared origins and unresolvable references', () => {
  it('says that two records from one origin are not independent corroboration', async () => {
    const user = await generated();
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');
    const notes = within(drawer).getAllByTestId('evidence-shared-origin');

    expect(notes.length).toBe(2);
    expect(notes[0]).toHaveTextContent(/not independent corroboration/i);
    expect(notes[0]).toHaveTextContent('org_example_staff');
  });

  it('shows a citation that does not resolve instead of hiding it', async () => {
    const run: RunResult = {
      ...exampleRunResult,
      recommendations: [
        {
          ...exampleRecommendation,
          evidence_ids: ['ev_example_wide_overload', 'ev_fabricated_citation'],
        },
      ],
    };

    const user = await generated(run);
    const card = screen.getByTestId('recommendation-card');

    // The bad reference is visible on the card itself, flagged.
    const chip = within(card).getByRole('button', { name: /ev_fabricated_citation/ });
    await user.click(chip);

    const unresolved = await screen.findByTestId('unresolved-references');
    expect(unresolved).toHaveTextContent('ev_fabricated_citation');
    expect(unresolved).toHaveTextContent(/reason to distrust the claim/i);
  });
});

describe('keyboard and focus behaviour', () => {
  it('moves focus into the drawer on open and back to the trigger on close', async () => {
    const user = await generated();
    const trigger = screen.getByRole('button', { name: /inspect sources/i });

    trigger.focus();
    await user.keyboard('{Enter}');

    const drawer = await screen.findByTestId('evidence-drawer');
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByTestId('evidence-drawer')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the close button and returns focus', async () => {
    const user = await generated();
    const trigger = screen.getByRole('button', { name: /inspect sources/i });

    trigger.focus();
    await user.click(trigger);

    const drawer = await screen.findByTestId('evidence-drawer');
    await user.click(within(drawer).getByRole('button', { name: /close evidence drawer/i }));

    await waitFor(() => expect(screen.queryByTestId('evidence-drawer')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab inside the drawer while it is open', async () => {
    const user = await generated();
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');

    for (let step = 0; step < 14; step += 1) {
      await user.tab();
      expect(drawer.contains(document.activeElement)).toBe(true);
    }

    for (let step = 0; step < 6; step += 1) {
      await user.tab({ shift: true });
      expect(drawer.contains(document.activeElement)).toBe(true);
    }
  });

  it('exposes the drawer as a labelled modal dialog', async () => {
    const user = await generated();
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName(exampleRecommendation.title);
  });
});

describe('long source text does not break the layout', () => {
  it('wraps an unbroken string and scrolls the excerpt rather than widening the panel', async () => {
    const longExcerpt = 'A'.repeat(1200);
    const longUrlLike = `https://example.invalid/${'segment-'.repeat(60)}end`;

    const run: RunResult = {
      ...exampleRunResult,
      evidence: [
        {
          ...wideOverload,
          source: {
            ...wideOverload.source,
            excerpt: `${longExcerpt} ${longUrlLike}`,
            url: longUrlLike,
            record_id: null,
          },
        },
      ],
      recommendations: [
        { ...exampleRecommendation, evidence_ids: ['ev_example_wide_overload'] },
      ],
    };

    const user = await generated(run);
    await user.click(screen.getByRole('button', { name: /inspect sources/i }));

    const drawer = await screen.findByTestId('evidence-drawer');
    const quote = within(drawer).getByText(new RegExp(longExcerpt.slice(0, 40)));

    // The excerpt is a bounded, scrollable region with anywhere-wrapping.
    expect(quote.className).toContain('source-text');
    expect(quote.className).toContain('max-h-64');
    expect(quote.className).toContain('overflow-y-auto');

    const link = within(drawer).getByRole('link', { name: new RegExp('segment-segment') });
    expect(link.className).toContain('source-text');
  });
});
