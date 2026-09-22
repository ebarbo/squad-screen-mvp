'use client';

import { useEffect, useRef } from 'react';
import type { EvidenceConflict, EvidenceItem, EvidenceStatus } from '@/domain/contracts';

const STATUS_STYLE: Record<EvidenceStatus, string> = {
  accepted: 'border-fact/50 bg-fact/10 text-fact',
  disputed: 'border-danger/50 bg-danger/10 text-danger',
  stale: 'border-warn/50 bg-warn/10 text-warn',
  missing: 'border-danger/50 bg-danger/10 text-danger',
  unverified: 'border-surface-3 bg-surface-2 text-ink-2',
};

const MODE_STYLE: Record<string, string> = {
  synthetic: 'border-synthetic/50 bg-synthetic/10 text-synthetic',
  snapshot: 'border-fact/50 bg-fact/10 text-fact',
  live: 'border-action/50 bg-action/10 text-action',
};

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

function EvidenceRecord({ item }: { item: EvidenceItem }) {
  return (
    <li className="rounded-xl border border-surface-3 bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-[11px] text-ink-2">{item.id}</code>
        <Badge className={STATUS_STYLE[item.status]}>{item.status}</Badge>
        <Badge className={MODE_STYLE[item.data_mode] ?? 'border-surface-3 text-ink-2'}>{item.data_mode}</Badge>
        <Badge className="border-surface-3 bg-surface-2 text-ink-2">{item.category}</Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-1">{item.claim}</p>

      {/* The verbatim excerpt is the point of this drawer: it is what a reviewer
          reads to decide whether the claim actually holds. */}
      <blockquote className="mt-3 overflow-x-auto rounded-lg border-l-2 border-fact/60 bg-surface-0 px-3 py-2">
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-1">{item.source.excerpt}</p>
      </blockquote>

      <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-ink-2">
        <dt>source</dt>
        <dd className="break-words text-ink-1">{item.source.name}</dd>
        <dt>location</dt>
        <dd className="break-all text-ink-1">
          {item.source.url === null ? (
            item.source.record_id
          ) : (
            <a href={item.source.url} target="_blank" rel="noreferrer" className="underline hover:text-fact">
              {item.source.url}
            </a>
          )}
        </dd>
        <dt>origin</dt>
        <dd className="break-all text-ink-1">{item.source.origin_id}</dd>
        <dt>observed</dt>
        <dd className="text-ink-1">{item.observed_at}</dd>
        <dt>published</dt>
        <dd className="text-ink-1">{item.published_at ?? 'no publication date stated'}</dd>
        {item.conflicts_with.length > 0 && (
          <>
            <dt className="text-danger">conflicts</dt>
            <dd className="break-all text-danger">{item.conflicts_with.join(', ')}</dd>
          </>
        )}
      </dl>

      <p className="mt-3 border-t border-surface-2 pt-2 text-xs leading-relaxed text-ink-2">{item.check_notes}</p>
    </li>
  );
}

export function EvidenceDrawer({
  open,
  evidenceIds,
  evidence,
  conflicts,
  onClose,
}: {
  open: boolean;
  evidenceIds: readonly string[];
  evidence: readonly EvidenceItem[];
  conflicts: readonly EvidenceConflict[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolved = evidenceIds.map((id) => ({ id, item: evidence.find((entry) => entry.id === id) }));
  const found = resolved.filter((entry) => entry.item !== undefined);
  const unresolved = resolved.filter((entry) => entry.item === undefined);

  const related = conflicts.filter((conflict) => conflict.evidence_ids.some((id) => evidenceIds.includes(id)));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close evidence"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Evidence"
        className="relative flex h-full w-full max-w-xl flex-col border-l border-surface-3 bg-surface-0 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-surface-3 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Evidence</h2>
            <p className="font-mono text-[11px] text-ink-2">
              {found.length} record{found.length === 1 ? '' : 's'} behind this recommendation
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-xs text-ink-1 hover:text-ink-0"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {related.length > 0 && (
            <div className="mb-4 rounded-xl border border-danger/40 bg-danger/5 p-4">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-danger">Unresolved disagreement</h3>
              {related.map((conflict) => (
                <p key={conflict.evidence_ids.join('-')} className="mt-2 text-xs leading-relaxed text-ink-1">
                  {conflict.summary}{' '}
                  <span className="text-ink-2">
                    {conflict.resolution ?? 'No rule settles this, so both records are shown.'}
                  </span>
                </p>
              ))}
            </div>
          )}

          <ul className="space-y-3">
            {found.map((entry) => (
              <EvidenceRecord key={entry.id} item={entry.item!} />
            ))}
          </ul>

          {unresolved.length > 0 && (
            <div className="mt-4 rounded-xl border border-danger/50 bg-danger/10 p-4">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-danger">Unresolvable reference</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-1">
                {unresolved.map((entry) => entry.id).join(', ')} could not be found in this run. A citation that does
                not resolve is not a citation.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
