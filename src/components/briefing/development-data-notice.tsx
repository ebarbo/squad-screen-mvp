import type { DataOrigin } from '@/lib/api-client';

/**
 * Labelling for anything that did not come from a completed live run.
 *
 * The acceptance gate is that contract examples cannot be mistaken for
 * finished inference, so the label is persistent, hatched and stated in words
 * rather than implied by a colour.
 */

export const DEVELOPMENT_DATA_LABEL = 'Development data';

export function isDevelopmentOrigin(origin: DataOrigin): boolean {
  return origin !== 'live-api';
}

export function DevelopmentDataBanner({ detail }: { detail?: string }) {
  return (
    <div
      role="status"
      data-testid="development-data-banner"
      className="hatched flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-mock/60 bg-mock/8 px-4 py-3"
    >
      <span className="rounded-md bg-mock/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-mock">
        {DEVELOPMENT_DATA_LABEL}
      </span>
      <p className="text-[13.5px] text-ink-1">
        {detail ??
          'Everything below is a validated contract example loaded from the repository. No model was called and no inference was run.'}
      </p>
    </div>
  );
}

/** Compact marker for placing beside a heading or a card. */
export function DevelopmentDataTag() {
  return (
    <span
      data-testid="development-data-tag"
      className="inline-flex items-center gap-1.5 rounded-full border border-mock/60 bg-mock/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mock"
    >
      <span aria-hidden="true">◆</span>
      {DEVELOPMENT_DATA_LABEL}
      <span className="sr-only">. Not produced by live inference.</span>
    </span>
  );
}
