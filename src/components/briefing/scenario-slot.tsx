import type { ComponentType } from 'react';
import type { EvidenceItem, Recommendation, RunResult } from '@/domain/contracts';
import type { BriefingApi } from '@/lib/api-client';

/**
 * The boundary between the briefing page (EWE-68/69) and the availability
 * scenario panel (EWE-70, `src/components/scenarios/**`).
 *
 * The page renders whatever component is passed as `scenarioSlot` and holds no
 * scenario state of its own: no availability overrides, no prior/current
 * comparison, no reevaluate call. The panel owns all of that. Everything it
 * needs from the page arrives through `ScenarioSlotProps`.
 *
 * To land EWE-70, change only the two marked lines in `src/app/page.tsx`.
 */

export interface EvidenceInspectionRequest {
  /** The recommendation whose sources should be shown. */
  recommendation: Recommendation;
  /**
   * Records to resolve the recommendation's `evidence_ids` against. Omit to use
   * the base run's evidence. Pass the scenario response's evidence so that
   * withdrawn or added advice stays inspectable.
   */
  evidence?: readonly EvidenceItem[];
  /** Scrolls to and highlights one record once the drawer opens. */
  focusEvidenceId?: string;
  /** Extra line in the drawer header, e.g. `Scenario — Player A unavailable`. */
  contextLabel?: string;
}

export interface ActiveScenario {
  scenario_id: string;
  /** Human-readable assumption, e.g. `Player A unavailable`. */
  label: string;
}

export interface ScenarioSlotProps {
  /** The factual briefing. `null` until one has been generated. */
  baseRun: RunResult | null;
  /** The same client instance the page uses, so origin labelling stays consistent. */
  api: BriefingApi;
  /** True while the page is generating. The panel should disable its controls. */
  briefingBusy: boolean;
  /** Opens the shared evidence drawer. */
  onInspectEvidence: (request: EvidenceInspectionRequest) => void;
  /**
   * Tells the page whether a hypothetical is currently applied, so the fixture
   * header can mark the brief as being read against an assumption. Pass `null`
   * on reset.
   */
  onActiveScenarioChange: (scenario: ActiveScenario | null) => void;
}

export type ScenarioSlot = ComponentType<ScenarioSlotProps>;

/**
 * Stands in for the scenario panel until EWE-70 lands. It reserves the space
 * and states plainly that the control is not built, rather than implying a
 * feature that does not exist.
 */
export function ScenarioSlotPlaceholder({ baseRun }: ScenarioSlotProps) {
  return (
    <section
      data-testid="scenario-slot-placeholder"
      aria-labelledby="scenario-slot-heading"
      className="rounded-2xl border border-dashed border-surface-3 bg-surface-1/40 px-5 py-4"
    >
      <h2
        id="scenario-slot-heading"
        className="text-[11px] font-bold uppercase tracking-[0.11em] text-ink-2"
      >
        Availability what-if
      </h2>
      <p className="mt-2 text-[13.5px] text-ink-1">
        The availability control and the before/after comparison are not built yet. This panel is
        reserved for them.
      </p>
      <p className="mt-2 text-[12.5px] text-ink-2">
        {baseRun
          ? 'A briefing is loaded, so the panel will have a run to re-evaluate once it is in place.'
          : 'Generate a briefing first; the panel re-evaluates an existing run.'}
      </p>
    </section>
  );
}
