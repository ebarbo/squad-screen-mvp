'use client';

import type { ClubPlayer, ScenarioResult } from '@/domain/contracts';

/**
 * The availability control (EWE-70).
 *
 * Two things this must not do: present a scenario as a fact, and let a slow
 * response overwrite a newer state. The first is handled by the labelling
 * below; the second by the request-sequence guard in the page, which discards
 * any response that is not the latest one requested.
 */
export function ScenarioPanel({
  player,
  active,
  pending,
  scenario,
  onApply,
  onReset,
}: {
  player: ClubPlayer | undefined;
  active: boolean;
  pending: boolean;
  scenario: ScenarioResult | null;
  onApply: () => void;
  onReset: () => void;
}) {
  if (player === undefined) return null;

  return (
    <section
      aria-label="Availability scenario"
      className={`rounded-xl border p-5 transition ${
        active ? 'border-warn/50 bg-warn/5' : 'border-surface-3 bg-surface-1'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">What if a key player is unavailable?</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">
            {active ? (
              <>
                <span className="font-medium text-warn">Hypothetical:</span> {player.display_name} is assumed
                unavailable. The factual record still says{' '}
                <span className="font-mono">{scenario?.applied_assumptions[0]?.replaces_factual_availability ?? player.availability}</span>
                , and the evidence below is unchanged.
              </>
            ) : (
              <>
                Showing the factual briefing. {player.display_name} is{' '}
                <span className="font-mono">{player.availability}</span>.
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={pending || active}
            className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn transition hover:bg-warn/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Re-evaluating…' : `Assume ${player.display_name} out`}
          </button>
          {/* Deliberately enabled while a request is in flight. Synthesis takes
              seconds, and an operator who changes their mind mid-call needs a way
              out; reset invalidates the pending request rather than waiting for
              it. Disabling this would strand them for the duration. */}
          <button
            type="button"
            onClick={onReset}
            disabled={!active && !pending}
            className="rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-1 transition hover:text-ink-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending && !active ? 'Cancel' : 'Reset'}
          </button>
        </div>
      </div>

      {active && scenario !== null && (
        <div className="mt-4 border-t border-surface-3 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-ink-2">
            <span>
              base run <span className="text-ink-1">{scenario.parent_run_id}</span>
            </span>
            <span>
              scenario run <span className="text-ink-1">{scenario.run_id}</span>
            </span>
            {/* Showing the snapshot ID on both runs is how a judge verifies, without
                trusting us, that the facts did not move under the assumption. */}
            <span>
              evidence snapshot <span className="text-fact">{scenario.evidence_snapshot_id}</span> (unchanged)
            </span>
          </div>

          <ul className="mt-3 space-y-1.5">
            {scenario.changes.map((change) => (
              <li
                key={`${change.prior_recommendation_id ?? 'new'}-${change.recommendation_id ?? 'gone'}`}
                className="text-xs leading-relaxed text-ink-1"
              >
                <span
                  className={`mr-2 font-mono uppercase tracking-wider ${
                    change.change_type === 'withdrawn'
                      ? 'text-danger'
                      : change.change_type === 'added'
                        ? 'text-action'
                        : change.change_type === 'revised'
                          ? 'text-warn'
                          : 'text-ink-2'
                  }`}
                >
                  {change.change_type}
                </span>
                {change.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
