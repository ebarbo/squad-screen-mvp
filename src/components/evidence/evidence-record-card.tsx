'use client';

import type { EvidenceItem } from '@/domain/contracts';
import { formatTimestamp } from '@/components/briefing/briefing-model';
import { DataModeBadge, EvidenceStatusBadge } from './evidence-badges';
import {
  conflictLinksFor,
  evidenceAnchorId,
  needsAttention,
  sourceLocator,
  type EvidenceIndex,
  type OriginGroup,
} from './evidence-model';

export interface EvidenceRecordCardProps {
  item: EvidenceItem;
  index: EvidenceIndex;
  /** Set when other records share this record's origin. */
  originGroup: OriginGroup | null;
  /** Highlighted because the reader jumped straight to it. */
  focused: boolean;
  /** Jump to another record inside the drawer. */
  onJumpTo: (evidenceId: string) => void;
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">{label}</dt>
      <dd className={`source-text mt-px text-[12.5px] text-ink-1 ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

export function EvidenceRecordCard({
  item,
  index,
  originGroup,
  focused,
  onJumpTo,
}: EvidenceRecordCardProps) {
  const locator = sourceLocator(item);
  const conflicts = conflictLinksFor(item, index);
  const flagged = needsAttention(item);

  return (
    <article
      id={evidenceAnchorId(item.id)}
      data-testid="evidence-record"
      data-evidence-id={item.id}
      tabIndex={-1}
      className={`scroll-mt-3 overflow-hidden rounded-xl border bg-surface-1 transition-shadow ${
        focused
          ? 'border-accent shadow-[0_0_0_2px_var(--color-accent)]/30'
          : flagged
            ? 'border-warn/45'
            : 'border-surface-2'
      }`}
    >
      <header className="flex flex-col gap-2 border-b border-surface-2 px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11.5px] text-ink-2">{item.id}</span>
          <EvidenceStatusBadge status={item.status} />
          <DataModeBadge mode={item.data_mode} />
          {item.valid_for_fixture ? null : (
            <span className="inline-flex items-center rounded-full border border-warn/60 bg-warn/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warn">
              Not valid for this fixture
            </span>
          )}
        </div>
        <p className="source-text text-[14.5px] font-medium text-ink-0">{item.claim}</p>
        <p className="text-[12px] text-ink-2">
          {item.category} · {item.subject_type}{' '}
          <span className="font-mono">{item.subject_id ?? 'fixture-wide'}</span>
        </p>
      </header>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        <figure className="m-0">
          <figcaption className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-2">
            Source excerpt — {item.source.name}
          </figcaption>
          <blockquote className="source-text m-0 max-h-64 overflow-y-auto overscroll-contain rounded-r-md border-l-[3px] border-surface-3 bg-black/25 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-1">
            {item.source.excerpt.trim().length > 0 ? (
              item.source.excerpt
            ) : (
              <span className="italic text-ink-2">No excerpt was supplied with this record.</span>
            )}
          </blockquote>
        </figure>

        <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
            {locator.kind === 'url' ? 'URL' : locator.kind === 'record' ? 'Record ID' : 'Locator'}
          </span>
          {locator.href ? (
            <a
              href={locator.href}
              target="_blank"
              rel="noreferrer noopener"
              className="source-text font-mono text-accent underline underline-offset-2"
            >
              {locator.label}
            </a>
          ) : (
            <span
              className={`source-text font-mono ${
                locator.kind === 'none' ? 'italic text-ink-2' : 'text-ink-1'
              }`}
            >
              {locator.label}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-x-3.5 gap-y-2 border-t border-dashed border-surface-2 pt-2.5">
          <MetaField label="Observed" value={formatTimestamp(item.observed_at)} />
          <MetaField label="Published" value={formatTimestamp(item.published_at)} />
          <MetaField label="Retrieved" value={formatTimestamp(item.retrieved_at)} />
          <MetaField label="Connector" value={item.source.connector} mono />
          <MetaField label="Origin" value={item.source.origin_id} mono />
        </dl>

        {item.check_notes ? (
          <p className="source-text rounded-md border border-surface-3 bg-surface-0/60 px-3 py-2 text-[12.5px] text-ink-1">
            <span className="font-semibold text-ink-0">Check result: </span>
            {item.check_notes}
          </p>
        ) : null}

        {conflicts.length > 0 ? (
          <div
            data-testid="evidence-conflicts"
            className="rounded-md border border-danger/45 bg-danger/8 px-3 py-2.5 text-[12.5px] text-ink-1"
          >
            <p className="font-semibold text-danger">
              Unresolved disagreement — {conflicts.length}{' '}
              {conflicts.length === 1 ? 'record contradicts' : 'records contradict'} this one
            </p>
            <p className="mt-0.5 text-ink-2">
              Both readings are shown. Nothing here averages them into a single figure.
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {conflicts.map((link) => (
                <li key={link.toId}>
                  <button
                    type="button"
                    disabled={!link.targetExists}
                    onClick={() => onJumpTo(link.toId)}
                    title={link.targetClaim ?? 'This run returned no record with that ID'}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-danger/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-danger hover:bg-danger/15 disabled:cursor-not-allowed disabled:line-through disabled:opacity-70"
                  >
                    {link.toId}
                    <span className="sr-only">
                      {link.targetExists
                        ? `. Go to the contradicting record: ${link.targetClaim ?? ''}`
                        : '. No matching record in this response'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {originGroup ? (
          <div
            data-testid="evidence-shared-origin"
            className="rounded-md border border-warn/45 bg-warn/8 px-3 py-2.5 text-[12.5px] text-ink-1"
          >
            <p className="font-semibold text-warn">Shared origin — not independent corroboration</p>
            <p className="mt-0.5">
              {originGroup.items.length} records in this run come from origin{' '}
              <span className="font-mono">{originGroup.originId}</span>
              {originGroup.sourceNames.length > 1
                ? `, republished as ${originGroup.sourceNames.join(', ')}.`
                : '.'}{' '}
              They are one report, so they do not corroborate each other.
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {originGroup.items
                .filter((sibling) => sibling.id !== item.id)
                .map((sibling) => (
                  <li key={sibling.id}>
                    <button
                      type="button"
                      onClick={() => onJumpTo(sibling.id)}
                      className="inline-flex cursor-pointer items-center rounded-full border border-warn/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-warn hover:bg-warn/15"
                    >
                      {sibling.id}
                      <span className="sr-only">. Go to the other copy from this origin</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
