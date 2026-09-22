import { CHECK_IDS, type CheckId, type CheckResult } from './types';
import { type CheckContext } from './context';
import { checkS1, checkS2, checkS3, checkS4 } from './structural';
import { checkG1, checkG2, checkG3, checkG4, checkG5 } from './grounding';
import { checkC1, checkC2, checkC3 } from './constraints';
import { checkU1, checkU2 } from './uncertainty';
import { checkR1, checkR2, checkR3, checkR4 } from './revision';

export type CheckFn = (context: CheckContext) => CheckResult;

export const CHECKS: Record<CheckId, CheckFn> = {
  S1: checkS1,
  S2: checkS2,
  S3: checkS3,
  S4: checkS4,
  G1: checkG1,
  G2: checkG2,
  G3: checkG3,
  G4: checkG4,
  G5: checkG5,
  C1: checkC1,
  C2: checkC2,
  C3: checkC3,
  U1: checkU1,
  U2: checkU2,
  R1: checkR1,
  R2: checkR2,
  R3: checkR3,
  R4: checkR4,
};

/**
 * Every check runs on every run, in a fixed order. A check that throws is
 * recorded as `not_measured` with the thrown message rather than aborting the
 * run or, worse, being skipped silently — an absent check must never read as a
 * passed one.
 */
export function runChecks(context: CheckContext): CheckResult[] {
  return CHECK_IDS.map((id) => {
    try {
      return CHECKS[id](context);
    } catch (error) {
      return {
        id,
        title: `Check ${id}`,
        outcome: 'not_measured' as const,
        reason: `The check threw and produced no verdict: ${error instanceof Error ? error.message : String(error)}`,
        violations: [],
      };
    }
  });
}

export * from './types';
export * from './context';
