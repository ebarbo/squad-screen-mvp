import type { Telemetry } from '@/domain/contracts';
import { describeTelemetry } from './briefing-model';
import { Panel } from './briefing-states';

/**
 * Run telemetry exactly as the server reported it.
 *
 * A field the provider did not return is shown as absent with the stated
 * reason. It is never replaced with a zero, an average or a guess.
 */
export function TelemetryPanel({ telemetry }: { telemetry: Telemetry | null }) {
  const rows = describeTelemetry(telemetry);
  const stub = telemetry?.transport === 'stub';

  return (
    <Panel
      title="Run telemetry"
      aside={
        telemetry ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              stub ? 'border-mock/60 bg-mock/12 text-mock' : 'border-action/50 bg-action/10 text-action'
            }`}
          >
            <span aria-hidden="true">{stub ? '◆' : '◉'}</span>
            {stub ? 'Stub transport' : 'Live transport'}
          </span>
        ) : null
      }
    >
      {stub ? (
        <p className="mb-3 rounded-lg border border-mock/50 bg-mock/8 px-3 py-2 text-[12.5px] text-ink-1">
          No provider call was made for this run. These figures describe the offline transport, not
          live inference.
        </p>
      ) : null}

      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="whitespace-nowrap text-ink-2">{row.label}</dt>
            <dd
              className={`source-text m-0 text-right tabular-nums ${
                row.value === null ? 'text-[12px] italic text-ink-2' : 'text-ink-1'
              }`}
            >
              {row.value ?? `Not reported — ${row.reason ?? 'no reason given'}`}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 border-t border-surface-2 pt-2.5 text-[11.5px] leading-relaxed text-ink-2">
        Cost is an inference estimate derived from the stated pricing basis, not a billed amount.
        The call count includes every retry.
      </p>
    </Panel>
  );
}
