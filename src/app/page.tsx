'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeType, ClubPlayer, FixtureSummary, RunResult, ScenarioResult } from '@/domain/contracts';
import { RecommendationCard } from '@/components/briefing/RecommendationCard';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';
import { ScenarioPanel } from '@/components/scenarios/ScenarioPanel';
import { api, type ApiError } from '@/lib/api-client';

const PLAYER_A_ID = 'pl_rivers';

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`rounded border border-surface-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-2 ${className}`}
    >
      {children}
    </span>
  );
}

export default function Page() {
  const [fixture, setFixture] = useState<FixtureSummary | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pendingScenario, setPendingScenario] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [drawerIds, setDrawerIds] = useState<readonly string[] | null>(null);

  // Monotonic request counter. A response whose sequence is not the latest is
  // discarded, so a slow re-evaluation cannot overwrite a newer reset.
  const sequence = useRef(0);

  useEffect(() => {
    api
      .fixtures()
      .then((response) => setFixture(response.fixtures[0] ?? null))
      .catch((caught: unknown) => setError(caught as ApiError));
  }, []);

  const onGenerate = useCallback(async () => {
    if (fixture === null) return;
    const ticket = ++sequence.current;

    setGenerating(true);
    setError(null);
    setScenario(null);

    try {
      const result = await api.generate(fixture.id);
      if (ticket !== sequence.current) return;
      setRun(result);
    } catch (caught) {
      if (ticket !== sequence.current) return;
      setError(caught as ApiError);
    } finally {
      if (ticket === sequence.current) setGenerating(false);
    }
  }, [fixture]);

  const onApplyScenario = useCallback(async () => {
    if (run === null) return;
    const ticket = ++sequence.current;

    setPendingScenario(true);
    setError(null);

    try {
      const result = await api.reevaluate(run.run_id, `scn_ui_${ticket}`, PLAYER_A_ID, 'unavailable');
      if (ticket !== sequence.current) return;
      setScenario(result);
    } catch (caught) {
      if (ticket !== sequence.current) return;
      setError(caught as ApiError);
    } finally {
      if (ticket === sequence.current) setPendingScenario(false);
    }
  }, [run]);

  const onReset = useCallback(() => {
    // Bumping the sequence invalidates any scenario request still in flight.
    sequence.current += 1;
    setScenario(null);
    setPendingScenario(false);
    setError(null);
  }, []);

  const active = scenario !== null;
  const evidence = scenario?.evidence ?? run?.evidence ?? [];
  const shown = active ? scenario.recommendations : (run?.recommendations ?? []);
  const withdrawn = active ? scenario.withdrawn_recommendations : [];
  const abstention = active ? scenario.abstention_note : (run?.abstention_note ?? null);
  const warnings = active ? scenario.warnings : (run?.warnings ?? []);
  const telemetry = active ? scenario.telemetry : (run?.telemetry ?? null);

  const changeFor = (id: string): { type: ChangeType; reason: string } | undefined => {
    if (!active) return undefined;
    const change = scenario.changes.find((entry) => entry.recommendation_id === id || entry.prior_recommendation_id === id);
    return change === undefined ? undefined : { type: change.change_type, reason: change.reason };
  };

  const playerA: ClubPlayer | undefined =
    run === null
      ? undefined
      : {
          id: PLAYER_A_ID,
          display_name: 'A. Rivers',
          position: 'FW',
          availability: scenario?.applied_assumptions[0]?.replaces_factual_availability ?? 'available',
          staff_constraint: null,
          capabilities: [],
          availability_evidence_ids: [],
        };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-surface-3 pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">Squad Screen</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {fixture?.label ?? 'Loading fixture…'}
          </h1>
          {fixture !== null && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{fixture.competition}</Badge>
              {fixture.data_modes.map((mode) => (
                <Badge key={mode} className={mode === 'synthetic' ? 'border-synthetic/50 text-synthetic' : ''}>
                  {mode}
                </Badge>
              ))}
              <span className="font-mono text-[11px] text-ink-2">
                information to {fixture.information_cutoff}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || fixture === null}
          className="rounded-lg border border-fact/50 bg-fact/10 px-4 py-2 text-sm font-medium text-fact transition hover:bg-fact/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? 'Generating…' : run === null ? 'Generate briefing' : 'Regenerate'}
        </button>
      </header>

      {fixture !== null && (
        <p className="mt-4 rounded-lg border border-synthetic/40 bg-synthetic/5 px-4 py-2.5 text-xs leading-relaxed text-ink-1">
          {fixture.provenance_note}
        </p>
      )}

      {error !== null && (
        <div role="alert" className="mt-4 rounded-xl border border-danger/50 bg-danger/10 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-danger">{error.code}</p>
          <p className="mt-1 text-sm text-ink-1">{error.message}</p>
          {error.remediation !== null && <p className="mt-1 text-xs text-ink-2">{error.remediation}</p>}
          {error.retryable && (
            <button
              type="button"
              onClick={onGenerate}
              className="mt-3 rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-xs text-ink-1 hover:text-ink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {run === null && !generating && error === null && (
        <p className="mt-10 text-sm text-ink-2">
          Generate the briefing to see up to three proposed actions, each traceable to its sources.
        </p>
      )}

      {run !== null && (
        <>
          <div className="mt-6">
            <ScenarioPanel
              player={playerA}
              active={active}
              pending={pendingScenario}
              scenario={scenario}
              onApply={onApplyScenario}
              onReset={onReset}
            />
          </div>

          <section className="mt-6 space-y-4">
            {shown.length === 0 && (
              <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
                <h3 className="text-sm font-semibold">No action is proposed</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-1">
                  {abstention ?? 'The evidence does not support a recommendation.'}
                </p>
              </div>
            )}

            {shown.map((recommendation) => {
              const change = changeFor(recommendation.id);
              return (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  changeType={change?.type}
                  changeReason={change?.reason}
                  onInspect={setDrawerIds}
                />
              );
            })}

            {withdrawn.map((recommendation) => (
              <RecommendationCard
                key={`withdrawn-${recommendation.id}`}
                recommendation={recommendation}
                changeType="withdrawn"
                changeReason={changeFor(recommendation.id)?.reason}
                onInspect={setDrawerIds}
              />
            ))}
          </section>

          {shown.length > 0 && abstention !== null && (
            <p className="mt-4 text-xs leading-relaxed text-ink-2">{abstention}</p>
          )}

          {warnings.length > 0 && (
            <section className="mt-6 rounded-xl border border-surface-3 bg-surface-1 p-4">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-2">Source and check notes</h3>
              <ul className="mt-2 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`} className="text-xs leading-relaxed text-ink-1">
                    <span className="mr-2 font-mono text-ink-2">{warning.code}</span>
                    {warning.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {telemetry !== null && (
            <footer className="mt-6 flex flex-wrap gap-x-5 gap-y-1 border-t border-surface-3 pt-4 font-mono text-[11px] text-ink-2">
              {/* The transport badge is the honest label: a stub run says so here,
                  in the same place a live run would. */}
              <span className={telemetry.transport === 'stub' ? 'text-warn' : 'text-action'}>
                {telemetry.transport === 'stub' ? 'stub transport — not live inference' : 'live inference'}
              </span>
              <span>{telemetry.model_id}</span>
              <span>{telemetry.duration_ms} ms</span>
              <span>
                {telemetry.call_count} call{telemetry.call_count === 1 ? '' : 's'}, {telemetry.retry_count} retried
              </span>
              <span>
                tokens {telemetry.input_tokens ?? 'null'}/{telemetry.output_tokens ?? 'null'}
              </span>
              <span>cost {telemetry.estimated_inference_cost_usd ?? 'null'}</span>
              <span>{evidence.length} evidence records</span>
            </footer>
          )}
        </>
      )}

      <EvidenceDrawer
        open={drawerIds !== null}
        evidenceIds={drawerIds ?? []}
        evidence={evidence}
        conflicts={[]}
        onClose={() => setDrawerIds(null)}
      />
    </main>
  );
}
