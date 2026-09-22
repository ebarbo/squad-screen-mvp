'use client';

import type { ChangeType, Recommendation } from '@/domain/contracts';

const CHANGE_STYLE: Record<ChangeType, { label: string; className: string }> = {
  added: { label: 'Added', className: 'border-action/50 bg-action/10 text-action' },
  revised: { label: 'Revised', className: 'border-warn/50 bg-warn/10 text-warn' },
  withdrawn: { label: 'Withdrawn', className: 'border-danger/50 bg-danger/10 text-danger' },
  unchanged: { label: 'Unchanged', className: 'border-surface-3 bg-surface-2 text-ink-2' },
};

/**
 * Observation, inference and action are given separate, labelled rows rather
 * than being blended into a paragraph. A reader has to be able to see where the
 * evidence stops and the interpretation starts without taking our word for it.
 */
function Row({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5">
      <dt className={`font-mono text-[11px] uppercase tracking-wider ${tone}`}>{label}</dt>
      <dd className="text-sm leading-relaxed text-ink-1">{children}</dd>
    </div>
  );
}

export function RecommendationCard({
  recommendation,
  changeType,
  changeReason,
  onInspect,
}: {
  recommendation: Recommendation;
  changeType?: ChangeType;
  changeReason?: string;
  onInspect: (evidenceIds: readonly string[]) => void;
}) {
  const withdrawn = recommendation.status === 'withdrawn';
  const change = changeType === undefined ? undefined : CHANGE_STYLE[changeType];

  return (
    <article
      className={`rounded-xl border bg-surface-1 p-5 transition ${
        withdrawn ? 'border-danger/40 opacity-70' : 'border-surface-3'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-surface-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-2">
              {recommendation.priority}
            </span>
            {change !== undefined && (
              <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${change.className}`}>
                {change.label}
              </span>
            )}
            {withdrawn && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
                no longer proposed
              </span>
            )}
          </div>
          <h3 className={`mt-2 text-lg font-semibold tracking-tight ${withdrawn ? 'line-through decoration-danger/60' : ''}`}>
            {recommendation.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onInspect(recommendation.evidence_ids)}
          className="shrink-0 rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-1 transition hover:border-fact/60 hover:text-ink-0"
        >
          Evidence ({recommendation.evidence_ids.length})
        </button>
      </header>

      {changeReason !== undefined && (
        <p className="mt-3 rounded-lg border border-surface-3 bg-surface-2/60 px-3 py-2 text-xs leading-relaxed text-ink-2">
          <span className="font-mono uppercase tracking-wider text-ink-2">Why this changed </span>
          {changeReason}
        </p>
      )}

      <dl className="mt-3 divide-y divide-surface-2">
        <Row label="Observed" tone="text-fact">
          {recommendation.observation}
        </Row>
        <Row label="Inferred" tone="text-inference">
          {recommendation.inference}
        </Row>
        <Row label="Action" tone="text-action">
          {recommendation.action}
        </Row>
        <Row label="Trade-off" tone="text-ink-2">
          {recommendation.trade_off}
        </Row>
        <Row label="Uncertainty" tone="text-ink-2">
          {recommendation.uncertainty}
        </Row>
        <Row label="Next check" tone="text-ink-2">
          {recommendation.next_check}
        </Row>
      </dl>

      {recommendation.player_actions.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {recommendation.player_actions.map((action) => (
            <li
              key={`${action.player_id}-${action.role}`}
              className="rounded-lg border border-action/40 bg-action/10 px-2.5 py-1 font-mono text-[11px] text-action"
            >
              {action.player_id} · {action.role}
              {action.planned_minutes !== null && ` · ${action.planned_minutes}′`}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
