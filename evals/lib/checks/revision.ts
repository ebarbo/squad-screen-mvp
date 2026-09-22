import { type Change, type Recommendation } from '@/domain/contracts';
import { fromViolations, notApplicable, type CheckResult, type Violation } from './types';
import { actionableContent, fullContent, narrativeFields, type CheckContext } from './context';

function requireRerun(
  context: CheckContext,
  id: 'R1' | 'R2' | 'R3' | 'R4',
): CheckResult | null {
  if (context.rerun === null) {
    return notApplicable(id, 'Generate-only case; there is no rerun to inspect.');
  }
  return null;
}

/**
 * R1 — the change set has to describe the run it claims to describe.
 *
 * Two failures live here: pointing at advice the base run never gave, and
 * leaving base advice out of the change set entirely, which hides an outcome
 * rather than reporting it.
 */
export function checkR1(context: CheckContext): CheckResult {
  const skip = requireRerun(context, 'R1');
  if (skip !== null) return skip;
  const rerun = context.rerun as NonNullable<CheckContext['rerun']>;

  const baseIds = new Set(context.base.recommendations.map((r) => r.id));
  const violations: Violation[] = [];

  for (const change of rerun.changes) {
    const prior = change.prior_recommendation_id;
    if (prior !== null && !baseIds.has(prior)) {
      violations.push({
        recommendation_id: change.recommendation_id,
        detail: `Change of type '${change.change_type}' references prior recommendation '${prior}', which the base run never produced.`,
        offending_value: prior,
      });
    }
  }
  for (const recommendation of [...rerun.recommendations, ...rerun.withdrawn_recommendations]) {
    const prior = recommendation.prior_recommendation_id;
    if (prior !== null && !baseIds.has(prior)) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Claims to revise '${prior}', which is not a recommendation of the base run.`,
        offending_value: prior,
      });
    }
  }

  const accountedFor = new Set(
    rerun.changes
      .map((change) => change.prior_recommendation_id)
      .filter((id): id is string => id !== null),
  );
  for (const id of baseIds) {
    if (!accountedFor.has(id)) {
      violations.push({
        recommendation_id: id,
        detail: `Base recommendation '${id}' appears in no change record, so the rerun does not say what became of it.`,
        offending_value: id,
      });
    }
  }

  return fromViolations(
    'R1',
    violations,
    `All ${baseIds.size} base recommendation(s) are accounted for and every prior reference resolves.`,
  );
}

/** Base advice that leans on the overridden player, by explicit dependency or action. */
function dependentOnOverride(
  context: CheckContext,
  playerId: string,
): Recommendation[] {
  const constraintIds = new Set(
    context.baseContext.constraints
      .filter((constraint) => constraint.player_id === playerId)
      .map((constraint) => constraint.id),
  );
  return context.base.recommendations.filter(
    (recommendation) =>
      recommendation.player_actions.some((action) => action.player_id === playerId) ||
      recommendation.depends_on.includes(playerId) ||
      recommendation.depends_on.some((id) => constraintIds.has(id)),
  );
}

/**
 * R2 — advice that can no longer stand must not be left standing.
 *
 * Withholding with an explanation is acceptable: withdrawing and revising both
 * pass. What fails is reporting such advice as `unchanged`, omitting a reason,
 * or not naming the dependency that moved.
 */
export function checkR2(context: CheckContext): CheckResult {
  const skip = requireRerun(context, 'R2');
  if (skip !== null) return skip;
  const rerun = context.rerun as NonNullable<CheckContext['rerun']>;

  if (context.overridePlayerId === null) {
    return notApplicable('R2', 'No override player was resolved for this run.');
  }
  const dependents = dependentOnOverride(context, context.overridePlayerId);
  if (dependents.length === 0) {
    // Requiring a revision nobody needed would reward churn, so there is
    // nothing here to pass or fail.
    return notApplicable(
      'R2',
      `No base recommendation depended on ${context.overridePlayerId}, so no revision was required.`,
    );
  }

  const byPrior = new Map<string, Change>();
  for (const change of rerun.changes) {
    if (change.prior_recommendation_id !== null) byPrior.set(change.prior_recommendation_id, change);
  }

  const violations: Violation[] = [];
  for (const recommendation of dependents) {
    const change = byPrior.get(recommendation.id);
    if (change === undefined) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Depends on the overridden player ${context.overridePlayerId} but has no change record.`,
      });
      continue;
    }
    if (change.change_type !== 'withdrawn' && change.change_type !== 'revised') {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Depends on the overridden player ${context.overridePlayerId} but is reported '${change.change_type}'.`,
        offending_value: change.change_type,
      });
      continue;
    }
    if (change.reason.trim() === '') {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Reported '${change.change_type}' with no reason.`,
      });
    }
    if (change.changed_dependency_ids.length === 0) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `Reported '${change.change_type}' without naming any changed dependency.`,
      });
    }
  }

  return fromViolations(
    'R2',
    violations,
    `All ${dependents.length} recommendation(s) depending on ${context.overridePlayerId} were withdrawn or revised with a reason.`,
  );
}

/**
 * R3 — stability, checked in both directions.
 *
 * `unchanged` must mean the actionable content is byte-identical. `revised`
 * must mean something actually moved — and specifically not just a player
 * identifier swapped inside otherwise identical prose, which the contract calls
 * out as a non-revision.
 */
export function checkR3(context: CheckContext): CheckResult {
  if (context.rerun === null) {
    return context.stabilityBaseline === null
      ? notApplicable('R3', 'No rerun and no stability baseline; there is nothing to compare.')
      : checkStabilityAgainstBaseline(context);
  }
  const rerun = context.rerun;

  const baseById = new Map(context.base.recommendations.map((r) => [r.id, r]));
  const currentById = new Map(rerun.recommendations.map((r) => [r.id, r]));
  const violations: Violation[] = [];

  for (const change of rerun.changes) {
    if (change.change_type === 'added' || change.change_type === 'withdrawn') continue;
    const prior = change.prior_recommendation_id;
    const currentId = change.recommendation_id;
    if (prior === null || currentId === null) continue; // R1 owns malformed change records.

    const before = baseById.get(prior);
    const after = currentById.get(currentId);
    if (before === undefined || after === undefined) continue;

    if (change.change_type === 'unchanged') {
      if (actionableContent(before) !== actionableContent(after)) {
        violations.push({
          recommendation_id: currentId,
          detail: `Reported 'unchanged' but the action or player actions differ from base recommendation '${prior}'.`,
          offending_value: { before: actionableContent(before), after: actionableContent(after) },
        });
      }
      continue;
    }

    if (fullContent(before) === fullContent(after)) {
      violations.push({
        recommendation_id: currentId,
        detail: `Reported 'revised' but nothing about the recommendation differs from base '${prior}'.`,
      });
      continue;
    }
    if (isNameSwapOnly(before, after)) {
      violations.push({
        recommendation_id: currentId,
        detail: `Reported 'revised' but only a player identifier changed; the advice itself is word-for-word identical to base '${prior}'.`,
        offending_value: {
          before: before.player_actions.map((a) => a.player_id),
          after: after.player_actions.map((a) => a.player_id),
        },
      });
    }
  }

  return fromViolations(
    'R3',
    violations,
    'Advice reported unchanged is byte-identical, and advice reported revised genuinely differs.',
  );
}

/**
 * Stability against a baseline run.
 *
 * Two independent generate runs cannot be matched by recommendation ID, so the
 * comparison is on the multiset of actionable content: what is proposed, for
 * whom, for how long. If a change to unrelated context moved any of that, the
 * sets differ and the difference is reported — as EWE-62 puts it, variation
 * here is either run-to-run variance or a response to something that should not
 * have mattered, and either way it belongs in the report rather than hidden.
 */
function checkStabilityAgainstBaseline(context: CheckContext): CheckResult {
  const baseline = context.stabilityBaseline as NonNullable<CheckContext['stabilityBaseline']>;
  const before = baseline.recommendations.map(actionableContent).sort();
  const after = context.base.recommendations.map(actionableContent).sort();

  const removed = before.filter((entry) => !after.includes(entry));
  const added = after.filter((entry) => !before.includes(entry));

  const violations: Violation[] = [];
  for (const entry of removed) {
    violations.push({
      recommendation_id: null,
      detail: `Actionable content present in the baseline run is absent after an unrelated context change: ${entry}`,
      offending_value: entry,
    });
  }
  for (const entry of added) {
    violations.push({
      recommendation_id: null,
      detail: `Actionable content appeared that the baseline run did not produce, after an unrelated context change: ${entry}`,
      offending_value: entry,
    });
  }

  return fromViolations(
    'R3',
    violations,
    `All ${after.length} proposed action(s) are byte-identical to the baseline run, so the unrelated context change moved nothing.`,
  );
}

function isNameSwapOnly(before: Recommendation, after: Recommendation): boolean {
  const sameNarrative = narrativeFields(before).every(
    ([field, text], index) => narrativeFields(after)[index]?.[1] === text && field !== '',
  );
  if (!sameNarrative) return false;
  if (before.player_actions.length !== after.player_actions.length) return false;
  const differsOnlyByPlayer = before.player_actions.every((action, index) => {
    const other = after.player_actions[index];
    if (other === undefined) return false;
    return (
      action.role === other.role &&
      action.planned_minutes === other.planned_minutes &&
      action.player_id !== other.player_id
    );
  });
  return differsOnlyByPlayer;
}

/**
 * R4 — the what-if must not touch the factual record.
 *
 * Two things are compared: the snapshot identity carried by the rerun, and a
 * hash of the base run taken before the rerun call against one taken after. The
 * reason string records which of the two was actually available, so a recorded
 * replay cannot read as proof that a live pipeline left the base alone.
 */
export function checkR4(context: CheckContext): CheckResult {
  const skip = requireRerun(context, 'R4');
  if (skip !== null) return skip;
  const rerun = context.rerun as NonNullable<CheckContext['rerun']>;

  const violations: Violation[] = [];
  if (rerun.evidence_snapshot_id !== context.base.evidence_snapshot_id) {
    violations.push({
      recommendation_id: null,
      detail: `Rerun reports snapshot '${rerun.evidence_snapshot_id}' but the base run used '${context.base.evidence_snapshot_id}'. The what-if re-derived the evidence.`,
      offending_value: rerun.evidence_snapshot_id,
    });
  }
  if (rerun.parent_run_id !== context.base.run_id) {
    violations.push({
      recommendation_id: null,
      detail: `Rerun reports parent run '${rerun.parent_run_id}' but was produced from '${context.base.run_id}'.`,
      offending_value: rerun.parent_run_id,
    });
  }
  if (
    context.basePreRerunHash !== null &&
    context.basePostRerunHash !== null &&
    context.basePreRerunHash !== context.basePostRerunHash
  ) {
    violations.push({
      recommendation_id: null,
      detail:
        'The base run differs before and after the rerun, so the scenario mutated the factual record rather than copying it.',
      offending_value: {
        before: context.basePreRerunHash,
        after: context.basePostRerunHash,
      },
    });
  }

  return fromViolations(
    'R4',
    violations,
    `Snapshot identity and base run survived the rerun unchanged. ${context.immutabilityEvidenceNote}`,
  );
}
