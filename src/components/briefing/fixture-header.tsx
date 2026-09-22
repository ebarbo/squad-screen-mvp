import type { FixtureSummary, Telemetry } from '@/domain/contracts';
import type { DataOrigin } from '@/lib/api-client';
import { DataModeBadge } from '@/components/evidence/evidence-badges';
import { formatDateOnly, formatTimestamp } from './briefing-model';
import { BUTTON_PRIMARY } from './briefing-states';
import { DevelopmentDataTag } from './development-data-notice';
import type { ActiveScenario } from './scenario-slot';

export interface FixtureHeaderProps {
  fixture: FixtureSummary | null;
  /** `as_of` from the run, once one exists. */
  asOf: string | null;
  evidenceSnapshotId: string | null;
  runId: string | null;
  origin: DataOrigin | null;
  telemetry: Telemetry | null;
  activeScenario: ActiveScenario | null;
  busy: boolean;
  onGenerate: () => void;
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[10px] font-bold uppercase tracking-[0.09em] text-ink-2">{label}</dt>
      <dd className={`source-text mt-0.5 text-ink-1 ${mono ? 'font-mono text-[12px]' : 'text-[13px]'}`}>
        {value}
      </dd>
    </div>
  );
}

export function FixtureHeader({
  fixture,
  asOf,
  evidenceSnapshotId,
  runId,
  origin,
  telemetry,
  activeScenario,
  busy,
  onGenerate,
}: FixtureHeaderProps) {
  const hasRun = runId !== null;

  return (
    <section
      aria-labelledby="fixture-heading"
      className="overflow-hidden rounded-2xl border border-surface-2 bg-surface-1/80 shadow-lg shadow-black/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 px-6 py-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-accent">
            {fixture ? fixture.competition : 'Fixture'}
          </p>
          <h1
            id="fixture-heading"
            className="source-text mt-1.5 text-[clamp(21px,2.3vw,29px)] font-semibold tracking-tight text-ink-0"
          >
            {fixture ? fixture.label : 'No fixture loaded'}
          </h1>

          <dl className="mt-3.5 flex flex-wrap gap-x-7 gap-y-2.5">
            <MetaItem label="Kickoff" value={formatTimestamp(fixture?.kickoff_at ?? null)} />
            <MetaItem
              label="Information cutoff"
              value={formatDateOnly(fixture?.information_cutoff ?? null)}
            />
            <MetaItem label="Briefing as of" value={hasRun ? formatTimestamp(asOf) : 'Not generated'} />
            <MetaItem label="Run" value={runId ?? 'None'} mono />
            <MetaItem label="Evidence snapshot" value={evidenceSnapshotId ?? 'None'} mono />
          </dl>
        </div>

        <div className="flex flex-col items-end gap-3">
          <button
            type="button"
            className={BUTTON_PRIMARY}
            onClick={onGenerate}
            disabled={busy || fixture === null}
          >
            {busy ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
                />
                Generating…
              </>
            ) : (
              <>{hasRun ? 'Generate again' : 'Generate briefing'}</>
            )}
          </button>

          <div className="flex flex-wrap justify-end gap-2">
            {(fixture?.data_modes ?? []).map((mode) => (
              <DataModeBadge key={mode} mode={mode} />
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {origin === 'contract-example' ? <DevelopmentDataTag /> : null}
            {telemetry?.transport === 'stub' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mock/60 bg-mock/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mock">
                <span aria-hidden="true">◆</span>
                Stub transport — no provider call
              </span>
            ) : null}
            {telemetry?.transport === 'live' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-action/50 bg-action/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-action">
                <span aria-hidden="true">◉</span>
                Live inference
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {fixture ? (
        <p className="source-text border-t border-surface-2 px-6 py-2.5 text-[12px] text-ink-2">
          <span className="font-semibold uppercase tracking-[0.08em]">Provenance</span>{' '}
          {fixture.provenance_note}
        </p>
      ) : null}

      {activeScenario ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-synthetic/40 bg-synthetic/10 px-6 py-2.5"
        >
          <span className="rounded-md bg-synthetic/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-synthetic">
            Hypothetical
          </span>
          <p className="text-[13px] text-ink-1">
            A what-if assumption is applied:{' '}
            <strong className="text-ink-0">{activeScenario.label}</strong>. The factual briefing below
            is unchanged.
          </p>
        </div>
      ) : null}
    </section>
  );
}
