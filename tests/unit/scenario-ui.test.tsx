import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '@/app/page';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';
import { exampleEvidence, exampleRunResult, exampleScenarioResult } from '@/domain/examples';

const fixture = {
  fixtures: [
    {
      id: 'fx_example_derby',
      competition: 'Test competition',
      label: 'Home v Away',
      kickoff_at: '2026-09-26T14:00:00Z',
      information_cutoff: '2026-09-22T08:00:00Z',
      data_modes: ['synthetic'],
      provenance_note: 'Synthetic test packet.',
    },
  ],
};

/** Resolves when the test decides, so a slow response can be simulated exactly. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

afterEach(cleanup);

describe('scenario control', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/api/fixtures')) return jsonResponse(fixture);
        if (url.includes('/generate')) return jsonResponse(exampleRunResult);
        return jsonResponse(exampleScenarioResult);
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the factual briefing before any assumption is applied', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole('button', { name: /generate briefing/i }));

    expect(await screen.findByText(/Showing the factual briefing/i)).toBeInTheDocument();
    expect(screen.getByText(exampleRunResult.recommendations[0]!.title)).toBeInTheDocument();
  });

  it('labels the scenario as hypothetical and shows the unchanged snapshot', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
    await user.click(await screen.findByRole('button', { name: /assume .* out/i }));

    expect(await screen.findByText(/Hypothetical:/i)).toBeInTheDocument();
    // The snapshot ID is shown next to both run IDs so a judge can confirm the
    // facts did not move without taking our word for it.
    expect(screen.getByText(exampleScenarioResult.evidence_snapshot_id)).toBeInTheDocument();
    expect(screen.getByText(/\(unchanged\)/i)).toBeInTheDocument();
  });

  it('explains each change rather than silently swapping the advice', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
    await user.click(await screen.findByRole('button', { name: /assume .* out/i }));

    const withdrawnChange = exampleScenarioResult.changes.find((change) => change.change_type === 'withdrawn')!;
    // Shown twice by design: once in the change list, once on the withdrawn card.
    expect(await screen.findAllByText(withdrawnChange.reason)).not.toHaveLength(0);
  });

  it('returns to the factual briefing on reset', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
    await user.click(await screen.findByRole('button', { name: /assume .* out/i }));
    await screen.findByText(/Hypothetical:/i);

    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(await screen.findByText(/Showing the factual briefing/i)).toBeInTheDocument();
    expect(screen.getByText(exampleRunResult.recommendations[0]!.title)).toBeInTheDocument();
  });

  it('discards a slow scenario response that arrives after a reset', async () => {
    const slow = deferred<Response>();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/api/fixtures')) return jsonResponse(fixture);
        if (url.includes('/generate')) return jsonResponse(exampleRunResult);
        return slow.promise;
      }),
    );

    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole('button', { name: /generate briefing/i }));
    await user.click(await screen.findByRole('button', { name: /assume .* out/i }));

    // Cancel while the re-evaluation is still in flight, then let it land.
    await user.click(screen.getByRole('button', { name: /cancel|reset/i }));
    slow.resolve(jsonResponse(exampleScenarioResult));

    await waitFor(() => {
      expect(screen.getByText(/Showing the factual briefing/i)).toBeInTheDocument();
    });
    // The stale response must not have reinstated the scenario.
    expect(screen.queryByText(/Hypothetical:/i)).not.toBeInTheDocument();
  });

  it('surfaces a provider error with its code and remediation, and stays coherent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/api/fixtures')) return jsonResponse(fixture);
        return jsonResponse(
          {
            error: {
              code: 'provider_timeout',
              message: 'The provider did not respond within 30000 ms.',
              retryable: true,
              remediation: 'Retry, or raise SQUAD_SCREEN_MODEL_TIMEOUT_MS.',
            },
          },
          504,
        );
      }),
    );

    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole('button', { name: /generate briefing/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('provider_timeout');
    expect(alert).toHaveTextContent(/did not respond/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('evidence drawer', () => {
  it('resolves every reference to its record with the verbatim excerpt', () => {
    render(
      <EvidenceDrawer
        open
        evidenceIds={[exampleEvidence[0]!.id]}
        evidence={exampleEvidence}
        conflicts={[]}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText(exampleEvidence[0]!.source.excerpt)).toBeInTheDocument();
    expect(screen.getByText(exampleEvidence[0]!.source.origin_id)).toBeInTheDocument();
  });

  it('says so explicitly when a reference does not resolve', () => {
    render(
      <EvidenceDrawer
        open
        evidenceIds={['ev_does_not_exist']}
        evidence={exampleEvidence}
        conflicts={[]}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText(/Unresolvable reference/i)).toBeInTheDocument();
    expect(screen.getByText(/ev_does_not_exist/)).toBeInTheDocument();
  });

  it('shows no numeric confidence anywhere', () => {
    const { container } = render(
      <EvidenceDrawer open evidenceIds={exampleEvidence.map((item) => item.id)} evidence={exampleEvidence} conflicts={[]} onClose={() => {}} />,
    );
    expect(container.textContent).not.toMatch(/confidence|probability|likelihood/i);
  });

  it('closes on Escape and moves focus to the close control', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EvidenceDrawer open evidenceIds={[exampleEvidence[0]!.id]} evidence={exampleEvidence} conflicts={[]} onClose={onClose} />,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
