/**
 * Deterministic check vocabulary. Definitions and rationale live in
 * `evals/rubric.md`; this file is the executable mirror of rubric §1–§2 and the
 * IDs must stay in step with it.
 */

export const CHECK_IDS = [
  'S1',
  'S2',
  'S3',
  'S4',
  'G1',
  'G2',
  'G3',
  'G4',
  'G5',
  'C1',
  'C2',
  'C3',
  'U1',
  'U2',
  'R1',
  'R2',
  'R3',
  'R4',
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

export const CHECK_TITLES: Record<CheckId, string> = {
  S1: 'Output validates against the contract schema',
  S2: 'Zero to three recommendations',
  S3: 'No numeric confidence, probability or percentage',
  S4: 'Observation, inference, action, trade-off, uncertainty and next check are distinct',
  G1: 'Every cited evidence ID resolves in the snapshot',
  G2: 'Every observation cites at least one evidence ID',
  G3: 'Every depends_on reference resolves',
  G4: 'Every asserted capability has a supplied observation',
  G5: 'Every player action targets a known player',
  C1: 'No action targets an unavailable player',
  C2: 'Planned minutes stay within the supplied limit',
  C3: 'No medical-clearance, injury-risk or win-probability language',
  U1: 'Unresolved conflicts are surfaced, not silently resolved',
  U2: 'Missing tactical support produces abstention or explicit qualification',
  R1: 'Every prior_recommendation_id belongs to the base run',
  R2: 'Advice depending on the overridden player is withdrawn or revised with a reason',
  R3: 'Unchanged advice really is unchanged, and revised advice really differs',
  R4: 'Evidence snapshot and base recommendations survive the rerun untouched',
};

/**
 * `not_measured` and `pending_human_review` are deliberately distinct from
 * `pass`: neither may ever be counted as one. See rubric §1.
 */
export type CheckOutcome = 'pass' | 'fail' | 'not_applicable' | 'not_measured';

export type ReportedValue = CheckOutcome | 'pending_human_review';

export interface Violation {
  /** The recommendation at fault, or null for a run-level violation. */
  recommendation_id: string | null;
  detail: string;
  offending_value?: unknown;
}

export interface CheckResult {
  id: CheckId;
  title: string;
  outcome: CheckOutcome;
  /** Always populated, including on a pass, so a report cell is never bare. */
  reason: string;
  violations: Violation[];
}

export function pass(id: CheckId, reason: string): CheckResult {
  return { id, title: CHECK_TITLES[id], outcome: 'pass', reason, violations: [] };
}

export function fail(id: CheckId, reason: string, violations: Violation[]): CheckResult {
  return { id, title: CHECK_TITLES[id], outcome: 'fail', reason, violations };
}

export function notApplicable(id: CheckId, reason: string): CheckResult {
  return { id, title: CHECK_TITLES[id], outcome: 'not_applicable', reason, violations: [] };
}

export function notMeasured(id: CheckId, reason: string): CheckResult {
  return { id, title: CHECK_TITLES[id], outcome: 'not_measured', reason, violations: [] };
}

/** `fail` when there is anything to report, `pass` otherwise. */
export function fromViolations(
  id: CheckId,
  violations: Violation[],
  passReason: string,
): CheckResult {
  if (violations.length === 0) return pass(id, passReason);
  return fail(
    id,
    `${violations.length} violation${violations.length === 1 ? '' : 's'}: ${violations[0]?.detail ?? ''}`,
    violations,
  );
}

/**
 * Did the run behave as the case declared it should? An expectation of `pass`
 * met by a `fail` is a finding; so is an expectation of `not_applicable` met by
 * anything that actually ran.
 */
export function matchesExpectation(
  actual: CheckOutcome,
  expected: CheckOutcome,
): 'as_expected' | 'unexpected' {
  return actual === expected ? 'as_expected' : 'unexpected';
}
