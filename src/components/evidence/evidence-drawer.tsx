'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { EvidenceItem } from '@/domain/contracts';
import type { EvidenceInspectionRequest } from '@/components/briefing/scenario-slot';
import { EvidenceRecordCard } from './evidence-record-card';
import {
  buildEvidenceIndex,
  buildRationaleChain,
  evidenceAnchorId,
  resolveReferences,
  sharedOriginGroups,
  type OriginGroup,
} from './evidence-model';
import { useDialogFocus } from './use-dialog-focus';

export interface EvidenceDrawerProps {
  /** The recommendation to inspect, or `null` when the drawer is closed. */
  request: EvidenceInspectionRequest | null;
  /** Evidence set used when the request does not carry its own. */
  fallbackEvidence: readonly EvidenceItem[];
  onClose: () => void;
}

/**
 * Side panel showing the exact records behind one recommendation.
 *
 * Three things it deliberately does not do: collapse a disagreement into one
 * reading, hide a reference it could not resolve, or attach a score to any of
 * it. A judge should be able to reach every cited record and see what it
 * actually says.
 */
export function EvidenceDrawer({ request, fallbackEvidence, onClose }: EvidenceDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedRecordId, setFocusedRecordId] = useState<string | null>(null);
  const titleId = useId();
  const open = request !== null;

  useDialogFocus({ open, containerRef, onClose });

  const evidence = request?.evidence ?? fallbackEvidence;

  const { index, resolved, unresolvedIds, duplicateIds, originGroupById, chain } = useMemo(() => {
    const builtIndex = buildEvidenceIndex(evidence);
    const references = resolveReferences(request?.recommendation.evidence_ids, builtIndex);

    const groups = new Map<string, OriginGroup>();
    for (const group of sharedOriginGroups(evidence)) {
      for (const item of group.items) groups.set(item.id, group);
    }

    return {
      index: builtIndex,
      resolved: references.resolved,
      unresolvedIds: references.unresolvedIds,
      duplicateIds: references.duplicateIds,
      originGroupById: groups,
      chain: request ? buildRationaleChain(request.recommendation) : [],
    };
  }, [evidence, request]);

  const jumpTo = useCallback((evidenceId: string) => {
    setFocusedRecordId(evidenceId);
    const target = document.getElementById(evidenceAnchorId(evidenceId));
    if (!target) return;

    // Focus first: moving focus is the part keyboard users depend on, and it
    // must not be lost if the scroll call is unavailable.
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!open || request === null) return null;

  const { recommendation, contextLabel } = request;
  const conflictedCount = resolved.filter((item) => item.conflicts_with.length > 0).length;

  return (
    <>
      <div
        className="backdrop-enter fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="evidence-drawer"
        tabIndex={-1}
        className="drawer-enter fixed inset-y-0 right-0 z-50 flex w-[min(580px,100vw)] flex-col border-l border-surface-3 bg-surface-0 shadow-2xl shadow-black/60"
      >
        <header className="flex flex-none items-start justify-between gap-4 border-b border-surface-2 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-accent">
              {contextLabel ?? 'Evidence behind this recommendation'}
            </p>
            <h2 id={titleId} className="source-text mt-1 text-base font-semibold text-ink-0">
              {recommendation.title}
            </h2>
            <p className="mt-1 font-mono text-[11.5px] text-ink-2">{recommendation.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence drawer"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-surface-3 bg-surface-1 text-ink-1 transition-colors hover:border-accent hover:text-ink-0"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-10 pt-4">
          <section aria-labelledby={`${titleId}-chain`}>
            <h3
              id={`${titleId}-chain`}
              className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2"
            >
              Rationale chain
            </h3>
            <ol className="flex flex-col gap-1.5 rounded-xl border border-surface-2 bg-surface-1 px-4 py-3">
              {chain.map((step, position) => (
                <li key={step.kind} className="flex gap-2.5 text-[13px]">
                  <span
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 rounded-full border border-surface-3 bg-surface-2 text-center text-[9px] font-bold leading-[14px] text-ink-2"
                  >
                    {position + 1}
                  </span>
                  <p className="source-text min-w-0 text-ink-1">
                    <span className="font-semibold text-ink-0">{step.label}: </span>
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[11.5px] text-ink-2">
              Each step is shown as the run produced it. There is no score attached to any of them —
              this pipeline cannot produce a calibrated one.
            </p>
          </section>

          {unresolvedIds.length > 0 ? (
            <div
              role="alert"
              data-testid="unresolved-references"
              className="rounded-xl border border-danger/55 bg-danger/8 px-4 py-3"
            >
              <p className="font-semibold text-danger">
                {unresolvedIds.length}{' '}
                {unresolvedIds.length === 1 ? 'reference does' : 'references do'} not resolve
              </p>
              <p className="mt-1 text-[13px] text-ink-1">
                This recommendation cites{' '}
                {unresolvedIds.length === 1 ? 'an evidence ID' : 'evidence IDs'} that the run did not
                return. The citation is shown rather than hidden, because an unresolvable reference
                is a reason to distrust the claim.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {unresolvedIds.map((id) => (
                  <li
                    key={id}
                    className="source-text rounded-full border border-danger/60 px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-danger"
                  >
                    {id.length > 0 ? id : '(empty reference)'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {duplicateIds.length > 0 ? (
            <p className="rounded-lg border border-warn/45 bg-warn/8 px-3.5 py-2.5 text-[12.5px] text-ink-1">
              <span className="font-semibold text-warn">Repeated citation: </span>
              {duplicateIds.join(', ')} appears more than once on this recommendation and is shown
              once.
            </p>
          ) : null}

          <section aria-labelledby={`${titleId}-records`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3
                id={`${titleId}-records`}
                className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2"
              >
                Source records ({resolved.length})
              </h3>
              {conflictedCount > 0 ? (
                <span className="text-[11.5px] font-semibold text-danger">
                  {conflictedCount} with unresolved disagreement
                </span>
              ) : null}
            </div>

            {resolved.length === 0 ? (
              <p className="rounded-xl border border-dashed border-surface-3 bg-surface-1/50 px-4 py-6 text-center text-[13px] text-ink-2">
                No source record on this recommendation could be resolved.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {resolved.map((item) => (
                  <EvidenceRecordCard
                    key={item.id}
                    item={item}
                    index={index}
                    originGroup={originGroupById.get(item.id) ?? null}
                    focused={focusedRecordId === item.id}
                    onJumpTo={jumpTo}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
