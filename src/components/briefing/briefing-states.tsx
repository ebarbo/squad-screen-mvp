import type { ReactNode } from 'react';

/** Shared shells for the loading, empty, warning and failure states of the briefing. */

type NoticeTone = 'info' | 'warn' | 'danger' | 'mock';

const TONE_CLASS: Record<NoticeTone, string> = {
  info: 'border-surface-3 bg-surface-1 text-ink-1',
  warn: 'border-warn/45 bg-warn/8 text-ink-1',
  danger: 'border-danger/50 bg-danger/8 text-ink-1',
  mock: 'border-mock/55 bg-mock/8 text-ink-1',
};

const TONE_GLYPH_CLASS: Record<NoticeTone, string> = {
  info: 'text-fact',
  warn: 'text-warn',
  danger: 'text-danger',
  mock: 'text-mock',
};

const TONE_GLYPH: Record<NoticeTone, string> = {
  info: 'i',
  warn: '!',
  danger: '×',
  mock: '◆',
};

export function Notice({
  tone = 'info',
  title,
  children,
  actions,
  detail,
  role,
}: {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  detail?: string | null;
  role?: 'alert' | 'status';
}) {
  return (
    <div role={role} className={`flex gap-3 rounded-xl border px-4 py-3.5 ${TONE_CLASS[tone]}`}>
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-current text-xs font-bold ${TONE_GLYPH_CLASS[tone]}`}
      >
        {TONE_GLYPH[tone]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-0">{title}</p>
        {children ? <div className="mt-0.5 text-[13.5px] text-ink-1">{children}</div> : null}
        {detail ? (
          <p className="source-text mt-2 font-mono text-[11.5px] text-ink-2">{detail}</p>
        ) : null}
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-surface-2 bg-surface-1/80 shadow-lg shadow-black/20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-2 px-5 py-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.11em] text-ink-2">{title}</h2>
        {aside}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * Loading placeholder. It shows that work is in progress without implying how
 * far along it is: there is no real progress signal to report.
 */
export function BriefingSkeleton({ label }: { label: string }) {
  return (
    <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 text-[13px] text-ink-1">
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-accent border-r-transparent"
        />
        {label}
      </div>
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl border border-surface-2 bg-surface-1/60 p-5"
        >
          <div className="shimmer h-4 w-2/5 rounded" />
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-11/12 rounded" />
          <div className="shimmer h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  glyph,
  title,
  children,
  action,
}: {
  glyph: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-surface-3 bg-surface-1/40 px-7 py-14 text-center">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-2xl border border-surface-3 bg-surface-2 text-xl text-ink-2"
      >
        {glyph}
      </span>
      <h3 className="text-base font-semibold text-ink-0">{title}</h3>
      <div className="max-w-[46ch] text-[13.5px] text-ink-1">{children}</div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export const BUTTON_PRIMARY =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45';

export const BUTTON_SECONDARY =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-3 bg-surface-2 px-4 py-2 text-[13px] font-semibold text-ink-0 transition-colors hover:border-accent hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-45';
