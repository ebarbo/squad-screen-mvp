import type { Priority, Recommendation } from '@/domain/contracts';
import { STATUS_DOT_CLASS } from '@/components/evidence/evidence-badges';
import { resolveReferences, type EvidenceIndex } from '@/components/evidence/evidence-model';
import { ReasoningFacets } from './reasoning-facets';

const PRIORITY_CLASS: Record<Priority, string> = {
  high: 'border-warn/60 bg-warn/12 text-warn',
  medium: 'border-fact/50 bg-fact/10 text-fact',
  low: 'border-surface-3 bg-surface-2 text-ink-2',
};

export interface RecommendationCardProps {
  recommendation: Recommendation;
  ordinal: number;
  evidenceIndex: EvidenceIndex;
  /** Opens the evidence drawer. `focusEvidenceId` scrolls straight to one record. */
  onInspectEvidence: (recommendation: Recommendation, focusEvidenceId?: string) => void;
  /** Rendered under the action, e.g. the scenario owner's change explanation. */
  changeNote?: React.ReactNode;
}

export function RecommendationCard({
  recommendation,
  ordinal,
  evidenceIndex,
  onInspectEvidence,
  changeNote,
}: RecommendationCardProps) {
  const { resolved, unresolvedIds } = resolveReferences(recommendation.evidence_ids, evidenceIndex);
  const withdrawn = recommendation.status === 'withdrawn';
  const headingId = `recommendation-title-${recommendation.id}`;

  return (
    <article
      aria-labelledby={headingId}
      data-testid="recommendation-card"
      data-recommendation-id={recommendation.id}
      className={`overflow-hidden rounded-2xl border shadow-lg shadow-black/25 ${
        withdrawn
          ? 'border-dashed border-surface-3 bg-surface-0/70'
          : 'border-surface-2 bg-surface-1/90'
      }`}
    >
      <header className="flex items-start gap-3 border-b border-surface-2 px-5 py-4">
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border border-surface-3 bg-surface-2 text-xs font-bold tabular-nums text-ink-2"
        >
          {ordinal}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={headingId}
            className={`source-text text-[17px] font-semibold tracking-tight ${
              withdrawn ? 'text-ink-2 line-through decoration-ink-2/60' : 'text-ink-0'
            }`}
          >
            {recommendation.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${PRIORITY_CLASS[recommendation.priority]}`}
            >
              {recommendation.priority} priority
            </span>
            {withdrawn ? (
              <span className="inline-flex items-center rounded-full border border-danger/60 bg-danger/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-danger">
                Withdrawn — still inspectable
              </span>
            ) : null}
            {recommendation.prior_recommendation_id ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-3 bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-2">
                revises {recommendation.prior_recommendation_id}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-5 pb-1 pt-1">
        <ReasoningFacets recommendation={recommendation} />
      </div>

      {recommendation.player_actions.length > 0 ? (
        <div className="border-t border-surface-2 px-5 py-3">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2">
            Players in this action
          </p>
          <ul className="flex flex-wrap gap-2">
            {recommendation.player_actions.map((playerAction) => (
              <li
                key={`${playerAction.player_id}-${playerAction.role}`}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-1 text-[13px]"
              >
                <span className="font-mono text-ink-1">{playerAction.player_id}</span>
                <span className="text-ink-1">{playerAction.role}</span>
                {playerAction.planned_minutes === null ? (
                  <span className="text-ink-2">no duration proposed</span>
                ) : (
                  <span className="font-mono font-semibold text-facet-action">
                    {playerAction.planned_minutes}′ planned
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {changeNote ? <div className="border-t border-surface-2 px-5 py-3">{changeNote}</div> : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-2 bg-black/20 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2">
            Evidence
          </span>
          {resolved.length === 0 && unresolvedIds.length === 0 ? (
            <span className="text-[13px] italic text-ink-2">
              No evidence cited on this recommendation.
            </span>
          ) : null}
          {resolved.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onInspectEvidence(recommendation, item.id)}
              title={`${item.claim} — ${item.source.name}`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-surface-3 bg-surface-2 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-ink-1 transition-colors hover:border-accent hover:text-ink-0"
            >
              <span aria-hidden="true" className={`size-1.5 rounded-full ${STATUS_DOT_CLASS[item.status]}`} />
              {item.id}
              <span className="sr-only">
                . Status {item.status}. Open the source record for {item.claim}
              </span>
            </button>
          ))}
          {unresolvedIds.map((id) => (
            <button
              key={`unresolved-${id}`}
              type="button"
              onClick={() => onInspectEvidence(recommendation, id)}
              title="This reference has no matching record in the response"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-danger/60 bg-danger/12 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-danger"
            >
              <span aria-hidden="true">⚠</span>
              {id}
              <span className="sr-only">. Unresolved reference. Open for details</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onInspectEvidence(recommendation)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink-0 transition-colors hover:border-accent hover:bg-surface-3"
        >
          Inspect sources
          <span aria-hidden="true">→</span>
          <span className="sr-only">for {recommendation.title}</span>
        </button>
      </footer>
    </article>
  );
}
