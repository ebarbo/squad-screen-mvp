'use client';

import { BriefingWorkspace } from '@/components/briefing/briefing-workspace';
import { ScenarioSlotPlaceholder } from '@/components/briefing/scenario-slot';

/**
 * The single page. It composes the briefing (EWE-68), the evidence drawer
 * (EWE-69) and a reserved slot for the availability what-if (EWE-70).
 *
 * To land EWE-70, change only the two marked lines: import the panel from
 * `@/components/scenarios/...` and pass it as `scenarioSlot`. The panel must
 * accept `ScenarioSlotProps` from `@/components/briefing/scenario-slot`; no
 * other file on this page needs to change, and no scenario state lives here.
 *
 * The page is a client component because the slot is passed as a component
 * rather than as rendered children: a server component cannot hand a function
 * across the client boundary, and the panel needs live props from the
 * workspace, so it cannot be pre-rendered into a `ReactNode`.
 */
export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-surface-2 bg-surface-0/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-lg bg-accent text-[13px] font-extrabold tracking-tighter text-accent-ink"
            >
              SS
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-ink-0">Squad Screen</p>
              <p className="text-[12px] text-ink-2">Pre-match briefing you can check</p>
            </div>
          </div>
          <p className="max-w-[46ch] text-[12px] text-ink-2">
            Observations, inferences and proposed actions are kept apart, and every claim opens the
            record it came from.
          </p>
        </div>
      </header>

      {/* EWE-70 lands here: swap ScenarioSlotPlaceholder for the scenario panel. */}
      <BriefingWorkspace scenarioSlot={ScenarioSlotPlaceholder} />

      <footer className="mt-auto border-t border-surface-2 px-6 py-5">
        <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 text-[12px] text-ink-2">
          <p>
            Squad Screen shows what its sources say. It does not score advice, estimate probability,
            or make medical judgements.
          </p>
          <p>Synthetic squad records are fictional and are labelled wherever they appear.</p>
        </div>
      </footer>
    </div>
  );
}
