import { EVIDENCE_STATUS_LABEL } from '@/components/evidence/evidence-model';
import type { RunCounts } from './briefing-model';

/**
 * Counts, all taken from the arrays in the response.
 *
 * There is no progress bar and no completion percentage here: the run either
 * produced these records or it did not, and inventing a scale would be the
 * fabricated-progress failure the acceptance gate rejects.
 */

function Count({
  value,
  label,
  hint,
  tone = 'plain',
}: {
  value: number;
  label: string;
  hint: string;
  tone?: 'plain' | 'alert';
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-surface-0/60 px-4 py-3" title={hint}>
      <span
        className={`text-xl font-semibold tabular-nums tracking-tight ${
          tone === 'alert' && value > 0 ? 'text-warn' : 'text-ink-0'
        }`}
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-2">
        {label}
      </span>
      <span className="sr-only">. {hint}</span>
    </div>
  );
}

export function RunCountsStrip({ counts }: { counts: RunCounts }) {
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(116px,1fr))] gap-px overflow-hidden rounded-xl border border-surface-2 bg-surface-2">
        <Count
          value={counts.recommendationCount}
          label="Recommendations"
          hint="Number of recommendations in the response. Zero to three is valid; the count is never padded."
        />
        <Count
          value={counts.evidenceCount}
          label="Evidence records"
          hint="Number of evidence records returned with this run."
        />
        <Count
          value={counts.distinctOriginCount}
          label="Distinct origins"
          hint="Distinct source origins. Two copies of one report count once, so this is the honest corroboration figure."
        />
        <Count
          value={counts.citedEvidenceCount}
          label="Records cited"
          hint="Evidence records referenced by at least one recommendation."
        />
        <Count
          value={counts.unresolvedConflictCount}
          label="Open conflicts"
          hint="Pairs of records that contradict each other and have not been resolved."
          tone="alert"
        />
        <Count
          value={counts.warningCount}
          label="Warnings"
          hint="Warnings the server attached to this run."
          tone="alert"
        />
      </div>

      {counts.statusCounts.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-ink-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.09em]">Evidence status</span>
          {counts.statusCounts.map(({ status, count }) => (
            <span key={status} className="tabular-nums">
              {EVIDENCE_STATUS_LABEL[status]} <strong className="text-ink-1">{count}</strong>
            </span>
          ))}
          {counts.distinctSourceNameCount !== counts.distinctOriginCount ? (
            <span className="text-warn">
              {counts.distinctSourceNameCount} source names across {counts.distinctOriginCount}{' '}
              origins — some reports share an origin
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
