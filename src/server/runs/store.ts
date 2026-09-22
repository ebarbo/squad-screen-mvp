/**
 * In-memory run store (EWE-67).
 *
 * The demo needs exactly one thing from persistence: a scenario re-run must be
 * able to find its parent's context and advice. A Map does that. There is no
 * database, and adding one would imply a durability guarantee this prototype
 * does not have.
 *
 * Stored contexts are already deep-frozen, so a later reader cannot disturb an
 * earlier run.
 */
import type { BaseMatchContext, Recommendation, RunResult } from '@/domain/contracts';

export interface StoredRun {
  readonly runId: string;
  readonly fixtureId: string;
  readonly context: BaseMatchContext;
  readonly recommendations: readonly Recommendation[];
  readonly result: RunResult;
  readonly createdAt: number;
}

/** Oldest runs are evicted first; a demo never needs deep history. */
const MAX_RUNS = 50;

const runs = new Map<string, StoredRun>();

export function saveRun(run: StoredRun): void {
  runs.set(run.runId, run);

  while (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next();
    if (oldest.done === true) break;
    runs.delete(oldest.value);
  }
}

export function getRun(runId: string): StoredRun | undefined {
  return runs.get(runId);
}

export function clearRuns(): void {
  runs.clear();
}

export function runCount(): number {
  return runs.size;
}

let counter = 0;

/**
 * Readable, ordered, collision-free within a process. Deliberately not a UUID:
 * these IDs are read aloud during a demo and pasted into curl commands.
 */
export function nextRunId(prefix: 'base' | 'scenario'): string {
  counter += 1;
  return `run_${prefix}_${counter.toString().padStart(4, '0')}`;
}

export function nextScenarioId(): string {
  counter += 1;
  return `scn_${counter.toString().padStart(4, '0')}`;
}
