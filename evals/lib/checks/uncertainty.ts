import { fromViolations, notApplicable, pass, type CheckResult, type Violation } from './types';
import { subjectRecommendations, subjectRun, subjectWarnings, type CheckContext } from './context';

/**
 * U1 — an unresolved disagreement must stay visible.
 *
 * The context carries conflicts explicitly, and a conflict counts as resolved
 * only when a documented rule filled in `resolution`. For every conflict still
 * unresolved, the check is satisfied when any of these holds:
 *   a. a warning of code `evidence_conflict` names one of its evidence IDs;
 *   b. one recommendation cites two or more of the conflicting IDs, so the
 *      drawer shows the disagreement side by side;
 *   c. a recommendation citing one side names another side's ID in its
 *      `uncertainty`.
 * Quietly picking a side, or averaging the two into one confident claim,
 * satisfies none of them.
 */
export function checkU1(context: CheckContext): CheckResult {
  const unresolved = context.baseContext.conflicts.filter(
    (conflict) => conflict.resolution === null,
  );
  if (unresolved.length === 0) {
    // Nothing to surface is not the same as having surfaced something.
    return notApplicable('U1', 'The snapshot carries no unresolved conflict.');
  }

  const recommendations = subjectRecommendations(context);
  const warnings = subjectWarnings(context);
  const violations: Violation[] = [];

  for (const conflict of unresolved) {
    const ids = conflict.evidence_ids;

    const namedInWarning = warnings.some(
      (warning) =>
        warning.code === 'evidence_conflict' &&
        (ids.some((id) => warning.related_ids.includes(id)) ||
          ids.some((id) => warning.message.includes(id))),
    );
    const citedTogether = recommendations.some(
      (r) => ids.filter((id) => r.evidence_ids.includes(id)).length >= 2,
    );
    const namedInUncertainty = recommendations.some(
      (r) =>
        ids.some((id) => r.evidence_ids.includes(id)) &&
        ids.some((id) => r.uncertainty.includes(id)),
    );
    if (namedInWarning || citedTogether || namedInUncertainty) continue;

    const usedOneSide = recommendations.some((r) =>
      ids.some((id) => r.evidence_ids.includes(id)),
    );
    violations.push({
      recommendation_id: null,
      detail: usedOneSide
        ? `Unresolved conflict "${conflict.summary}" (${ids.join(', ')}): one side was used without the disagreement being surfaced.`
        : `Unresolved conflict "${conflict.summary}" (${ids.join(', ')}) appears nowhere in the output.`,
      offending_value: ids,
    });
  }

  return fromViolations(
    'U1',
    violations,
    `All ${unresolved.length} unresolved conflict(s) are surfaced in the output.`,
  );
}

/**
 * U2 — when the supporting observation is absent, the model must say so.
 *
 * Passing requires either a clean abstention, or advice that is explicitly
 * qualified, tied to a named next check, and accompanied by a run-level warning
 * of code `missing_evidence` or `abstained`. "The opponent probably presses
 * high", offered with no observation and no warning, satisfies none of that.
 */
export function checkU2(context: CheckContext): CheckResult {
  const run = subjectRun(context);
  const recommendations = subjectRecommendations(context);
  const gaps = context.baseContext.missing_information;

  // The precondition is read from the data, not from the case file: tactical
  // support is missing when the snapshot holds no tactical observation of the
  // opponent. Where support exists there is nothing for this check to assert.
  const opponentId = context.baseContext.opponent.team.id;
  const hasTacticalSupport = context.baseContext.evidence.some(
    (item) => item.category === 'tactical_observation' && item.subject_id === opponentId,
  );
  if (hasTacticalSupport) {
    return notApplicable(
      'U2',
      'The snapshot carries a tactical observation of the opponent, so tactical support is not missing in this case.',
    );
  }

  if (recommendations.length === 0) {
    return run.abstention_note === null
      ? fromViolations(
          'U2',
          [
            {
              recommendation_id: null,
              detail: 'Abstained but gave no abstention_note, so the operator is told nothing.',
            },
          ],
          '',
        )
      : pass('U2', 'Abstained rather than advising without the supporting observation.');
  }

  const violations: Violation[] = [];
  const flagged = run.warnings.some(
    (warning) => warning.code === 'missing_evidence' || warning.code === 'abstained',
  );
  if (!flagged) {
    violations.push({
      recommendation_id: null,
      detail: `Advised without abstaining and raised no missing_evidence or abstained warning, so ${gaps.length} known gap(s) are invisible to the operator.`,
      offending_value: gaps.map((gap) => gap.topic),
    });
  }
  for (const recommendation of recommendations) {
    // The schema already requires these to be non-empty, so what is checked
    // here is that the model said something specific rather than a placeholder.
    if (recommendation.uncertainty.trim().length < 20) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Advises despite a known gap but states only a token uncertainty: "${recommendation.uncertainty}".`,
        offending_value: recommendation.uncertainty,
      });
    }
    if (recommendation.next_check.trim().length < 20) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Advises despite a known gap but names only a token next check: "${recommendation.next_check}".`,
        offending_value: recommendation.next_check,
      });
    }
  }

  return fromViolations(
    'U2',
    violations,
    'Advice is explicitly qualified, tied to a next check and accompanied by a warning naming the gap.',
  );
}
