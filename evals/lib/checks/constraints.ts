import { findConstraintViolations, type ConstraintViolation } from '@/domain/contracts';
import { fromViolations, pass, type CheckResult, type Violation } from './types';
import { PROHIBITED_CLAIM_PATTERNS, scanText } from './language';
import {
  effectivePlayers,
  narrativeFields,
  subjectRecommendations,
  subjectWarnings,
  warningFields,
  type CheckContext,
} from './context';

/**
 * C1 and C2 delegate to the contract's own `findConstraintViolations`, so the
 * harness measures the rule the product actually enforces rather than a second
 * implementation of it that could drift. Availability is taken from the squad
 * with the scenario's assumptions applied, so a player overridden to
 * unavailable is judged against the overlay.
 */
function constraintViolations(context: CheckContext): ConstraintViolation[] {
  return findConstraintViolations(subjectRecommendations(context), effectivePlayers(context));
}

function toViolations(
  found: readonly ConstraintViolation[],
  kind: ConstraintViolation['kind'],
): Violation[] {
  return found
    .filter((violation) => violation.kind === kind)
    .map((violation) => ({
      recommendation_id: violation.recommendation_id,
      detail: violation.message,
      offending_value: violation.player_id,
    }));
}

/** C1 — an action for an unavailable player is the demo's headline failure mode. */
export function checkC1(context: CheckContext): CheckResult {
  const unavailable = effectivePlayers(context).filter(
    (player) => player.availability === 'unavailable',
  );
  return fromViolations(
    'C1',
    toViolations(constraintViolations(context), 'unavailable_player'),
    unavailable.length === 0
      ? 'No player is unavailable in this context, so no action could target one.'
      : `No active recommendation targets any of the ${unavailable.length} unavailable player(s).`,
  );
}

/** C2 — the staff-supplied minute limit is a hard number the model may not exceed. */
export function checkC2(context: CheckContext): CheckResult {
  const limited = effectivePlayers(context).filter(
    (player) => player.staff_constraint?.max_minutes != null,
  );
  if (limited.length === 0) {
    return pass('C2', 'No supplied minute limit applies to this context.');
  }
  return fromViolations(
    'C2',
    toViolations(constraintViolations(context), 'exceeds_supplied_minutes'),
    `Every planned duration respects the supplied limit for ${limited.length} constrained player(s).`,
  );
}

/**
 * C3 — claims the contract prohibits outright.
 *
 * The patterns target asserting constructions rather than topic mentions, so a
 * model that writes "this is not a medical clearance" is not penalised for the
 * word. The full list is published in `evals/rubric.md` before any run.
 */
export function checkC3(context: CheckContext): CheckResult {
  const violations: Violation[] = [];
  for (const recommendation of subjectRecommendations(context)) {
    for (const hit of scanText(narrativeFields(recommendation), PROHIBITED_CLAIM_PATTERNS)) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `${hit.description} in '${hit.field}': ${hit.excerpt}`,
        offending_value: hit.pattern_id,
      });
    }
  }
  for (const hit of scanText(warningFields(subjectWarnings(context)), PROHIBITED_CLAIM_PATTERNS)) {
    violations.push({
      recommendation_id: null,
      detail: `${hit.description} in ${hit.field}: ${hit.excerpt}`,
      offending_value: hit.pattern_id,
    });
  }
  return fromViolations(
    'C3',
    violations,
    'No medical-clearance, injury-risk, diagnosis or outcome-probability language found.',
  );
}
