import type { Warning, WarningCode } from '@/domain/contracts';

const WARNING_LABEL: Record<WarningCode, string> = {
  evidence_conflict: 'Sources disagree',
  stale_evidence: 'Evidence is stale',
  missing_evidence: 'Evidence is missing',
  abstained: 'Advice withheld',
  constraint_blocked_action: 'An action was blocked by a constraint',
  model_output_repaired: 'Model output was repaired',
  source_unavailable: 'A source was unavailable',
  duplicate_origin_collapsed: 'Duplicate reports collapsed to one origin',
};

/** Warnings that report a limit or a refusal rather than a defect. */
const NEUTRAL_CODES: ReadonlySet<WarningCode> = new Set<WarningCode>([
  'abstained',
  'duplicate_origin_collapsed',
  'constraint_blocked_action',
]);

/**
 * Warnings the run attached to itself. They stay on screen: a briefing that
 * quietly drops the reason it is incomplete is the failure mode this project
 * is built to avoid.
 */
export function WarningsPanel({ warnings }: { warnings: readonly Warning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section
      aria-label="Run warnings"
      data-testid="run-warnings"
      className="overflow-hidden rounded-2xl border border-warn/40 bg-warn/6"
    >
      <h2 className="border-b border-warn/25 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.11em] text-warn">
        {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'} from this run
      </h2>
      <ul className="divide-y divide-warn/15">
        {warnings.map((warning, position) => (
          <li key={`${warning.code}-${position}`} className="flex gap-3 px-5 py-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-current text-xs font-bold ${
                NEUTRAL_CODES.has(warning.code) ? 'text-ink-2' : 'text-warn'
              }`}
            >
              !
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink-0">{WARNING_LABEL[warning.code]}</p>
              <p className="source-text mt-0.5 text-[13px] text-ink-1">{warning.message}</p>
              {warning.related_ids.length > 0 ? (
                <p className="source-text mt-1 font-mono text-[11.5px] text-ink-2">
                  {warning.related_ids.join(' · ')}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
