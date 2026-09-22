'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FixtureSummary, Recommendation, RunResult } from '@/domain/contracts';
import { EvidenceDrawer } from '@/components/evidence/evidence-drawer';
import { buildEvidenceIndex } from '@/components/evidence/evidence-model';
import {
  createHttpBriefingApi,
  describeFailure,
  isAbortFailure,
  type BriefingApi,
  type FailureSummary,
} from '@/lib/api-client';
import { countRun, MAX_RECOMMENDATIONS, partitionRecommendations } from './briefing-model';
import {
  BUTTON_SECONDARY,
  BriefingSkeleton,
  EmptyState,
  Notice,
} from './briefing-states';
import { createDevelopmentApi } from './development-api';
import { DevelopmentDataBanner } from './development-data-notice';
import { FixtureHeader } from './fixture-header';
import { RecommendationCard } from './recommendation-card';
import { RunCountsStrip } from './run-counts';
import type {
  ActiveScenario,
  EvidenceInspectionRequest,
  ScenarioSlot,
} from './scenario-slot';
import { TelemetryPanel } from './telemetry-panel';
import { WarningsPanel } from './warnings-panel';

export interface BriefingWorkspaceProps {
  /**
   * The availability what-if panel. Owned by EWE-70 in
   * `src/components/scenarios/**`; this page only gives it a place to render.
   */
  scenarioSlot: ScenarioSlot;
  /** Injected in tests. Defaults to the real same-origin HTTP client. */
  createApi?: () => BriefingApi;
}

type Phase = 'idle' | 'loading-fixtures' | 'ready' | 'generating';

export function BriefingWorkspace({ scenarioSlot, createApi }: BriefingWorkspaceProps) {
  const ScenarioPanel = scenarioSlot;

  const [api, setApi] = useState<BriefingApi>(() => (createApi ?? createHttpBriefingApi)());
  const [phase, setPhase] = useState<Phase>('loading-fixtures');
  const [fixture, setFixture] = useState<FixtureSummary | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [fixtureFailure, setFixtureFailure] = useState<FailureSummary | null>(null);
  const [runFailure, setRunFailure] = useState<FailureSummary | null>(null);
  const [activeScenario, setActiveScenario] = useState<ActiveScenario | null>(null);
  const [inspection, setInspection] = useState<EvidenceInspectionRequest | null>(null);

  /**
   * Monotonic request token. A response whose token is no longer current is
   * discarded, so a slow earlier request cannot overwrite newer state.
   */
  const requestToken = useRef(0);

  const loadFixtures = useCallback(
    async (client: BriefingApi) => {
      const token = ++requestToken.current;
      setPhase('loading-fixtures');
      setFixtureFailure(null);

      try {
        const response = await client.listFixtures();
        if (token !== requestToken.current) return;

        const first = response.fixtures[0] ?? null;
        setFixture(first);
        setPhase('ready');
        if (first === null) {
          setFixtureFailure({
            title: 'The server returned no fixtures.',
            remediation: 'There is nothing to brief on until a fixture is published.',
            retryable: true,
            code: 'empty_fixture_list',
          });
        }
      } catch (cause) {
        if (token !== requestToken.current || isAbortFailure(cause)) return;
        setFixture(null);
        setPhase('ready');
        setFixtureFailure(describeFailure(cause));
      }
    },
    [],
  );

  useEffect(() => {
    void loadFixtures(api);
  }, [api, loadFixtures]);

  const generate = useCallback(async () => {
    if (fixture === null) return;

    const token = ++requestToken.current;
    setPhase('generating');
    setRunFailure(null);

    try {
      const result = await api.generate({ fixture_id: fixture.id });
      if (token !== requestToken.current) return;
      setRun(result);
      setPhase('ready');
    } catch (cause) {
      if (token !== requestToken.current || isAbortFailure(cause)) return;
      setPhase('ready');
      setRunFailure(describeFailure(cause));
    }
  }, [api, fixture]);

  /**
   * Switching to the contract examples is always an explicit click. A failed
   * live call is never quietly replaced with example content.
   */
  const useContractExamples = useCallback(() => {
    requestToken.current += 1;
    setRun(null);
    setRunFailure(null);
    setActiveScenario(null);
    setInspection(null);
    setApi(() => createDevelopmentApi());
  }, []);

  const openEvidence = useCallback((request: EvidenceInspectionRequest) => {
    setInspection(request);
  }, []);

  const closeEvidence = useCallback(() => setInspection(null), []);

  const inspectFromCard = useCallback(
    (recommendation: Recommendation, focusEvidenceId?: string) => {
      openEvidence({ recommendation, focusEvidenceId });
    },
    [openEvidence],
  );

  const counts = useMemo(() => (run ? countRun(run) : null), [run]);
  const evidenceIndex = useMemo(() => buildEvidenceIndex(run?.evidence ?? []), [run]);
  const { visible, overflow } = useMemo(
    () => partitionRecommendations(run?.recommendations),
    [run],
  );

  const busy = phase === 'generating' || phase === 'loading-fixtures';
  const isDevelopmentData = api.origin === 'contract-example';

  return (
    <>
      <a
        href="#briefing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-100 focus:rounded-br-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:font-bold focus:text-accent-ink"
      >
        Skip to briefing
      </a>

      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-6 pb-20 pt-6">
        {isDevelopmentData ? <DevelopmentDataBanner /> : null}

        <FixtureHeader
          fixture={fixture}
          asOf={run?.as_of ?? null}
          evidenceSnapshotId={run?.evidence_snapshot_id ?? null}
          runId={run?.run_id ?? null}
          origin={api.origin}
          telemetry={run?.telemetry ?? null}
          activeScenario={activeScenario}
          busy={busy}
          onGenerate={() => void generate()}
        />

        {counts ? <RunCountsStrip counts={counts} /> : null}

        {fixtureFailure ? (
          <Notice
            role="alert"
            tone="danger"
            title={fixtureFailure.title}
            detail={`code: ${fixtureFailure.code}`}
            actions={
              <>
                <button type="button" className={BUTTON_SECONDARY} onClick={() => void loadFixtures(api)}>
                  Retry
                </button>
                {!isDevelopmentData ? (
                  <button type="button" className={BUTTON_SECONDARY} onClick={useContractExamples}>
                    Load contract example instead
                  </button>
                ) : null}
              </>
            }
          >
            {fixtureFailure.remediation}
          </Notice>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_356px]">
          <main id="briefing-main" className="flex min-w-0 flex-col gap-4">
            {runFailure ? (
              <Notice
                role="alert"
                tone="danger"
                title={runFailure.title}
                detail={`code: ${runFailure.code}`}
                actions={
                  <>
                    {runFailure.retryable ? (
                      <button type="button" className={BUTTON_SECONDARY} onClick={() => void generate()}>
                        Try again
                      </button>
                    ) : null}
                    {!isDevelopmentData ? (
                      <button type="button" className={BUTTON_SECONDARY} onClick={useContractExamples}>
                        Load contract example instead
                      </button>
                    ) : null}
                  </>
                }
              >
                {runFailure.remediation} Nothing below was replaced with placeholder content.
              </Notice>
            ) : null}

            {run ? <WarningsPanel warnings={run.warnings} /> : null}

            {overflow.length > 0 ? (
              <Notice
                role="alert"
                tone="warn"
                title={`The response carried ${visible.length + overflow.length} recommendations`}
              >
                The contract caps a briefing at {MAX_RECOMMENDATIONS}. The extra{' '}
                {overflow.length === 1 ? 'entry is' : 'entries are'} not shown, and this is reported
                rather than hidden because a padded list is a known failure mode.
              </Notice>
            ) : null}

            {phase === 'generating' ? (
              <BriefingSkeleton label="Generating the briefing. No result is shown until the run completes." />
            ) : null}

            {phase !== 'generating' && run === null && runFailure === null ? (
              <EmptyState glyph="○" title="No briefing generated yet">
                {fixture
                  ? 'Generate a briefing to see at most three recommendations, each with the evidence behind it.'
                  : 'Load a fixture first. There is nothing to brief on yet.'}
              </EmptyState>
            ) : null}

            {phase !== 'generating' && run !== null && visible.length === 0 ? (
              <EmptyState glyph="⊘" title="No recommendation was proposed">
                {run.abstention_note ??
                  'The run returned no recommendations and gave no reason. Zero is a valid answer: the evidence did not support advice.'}
              </EmptyState>
            ) : null}

            {phase !== 'generating' && visible.length > 0 ? (
              <>
                {run?.abstention_note && visible.length < MAX_RECOMMENDATIONS ? (
                  <Notice tone="info" title={`Why only ${visible.length} of ${MAX_RECOMMENDATIONS}`}>
                    {run.abstention_note}
                  </Notice>
                ) : null}
                <ol className="flex list-none flex-col gap-4 p-0">
                  {visible.map((recommendation, position) => (
                    <li key={recommendation.id}>
                      <RecommendationCard
                        recommendation={recommendation}
                        ordinal={position + 1}
                        evidenceIndex={evidenceIndex}
                        onInspectEvidence={inspectFromCard}
                      />
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </main>

          <aside className="flex min-w-0 flex-col gap-4">
            <ScenarioPanel
              baseRun={run}
              api={api}
              briefingBusy={busy}
              onInspectEvidence={openEvidence}
              onActiveScenarioChange={setActiveScenario}
            />
            <TelemetryPanel telemetry={run?.telemetry ?? null} />
          </aside>
        </div>
      </div>

      <EvidenceDrawer
        request={inspection}
        fallbackEvidence={run?.evidence ?? []}
        onClose={closeEvidence}
      />
    </>
  );
}
