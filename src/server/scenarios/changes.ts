/**
 * Change classification (EWE-66).
 *
 * Compares a scenario's advice against the parent run's and says what happened
 * to each piece: added, revised, withdrawn or unchanged.
 *
 * The subtle case is `unchanged`. Advice counts as unchanged only when its
 * *actionable* content is identical — same action text, same player actions,
 * same planned minutes. Rewording the rationale while the instruction stays put
 * is still unchanged; altering what the coach would do is not, however similar
 * the prose looks. Getting this wrong would let an irrelevant input change
 * quietly rewrite the briefing, which is precisely what the irrelevant-change
 * evaluation case exists to catch.
 */
import type { Change, Recommendation } from '@/domain/contracts';

/** The part of a recommendation that actually tells someone to do something. */
function actionableFingerprint(recommendation: Recommendation): string {
  const actions = [...recommendation.player_actions]
    .map((action) => `${action.player_id}:${action.planned_minutes ?? 'n/a'}:${action.role.trim().toLowerCase()}`)
    .sort()
    .join('|');

  return `${recommendation.action.trim().toLowerCase()}::${actions}`;
}

export interface ClassifyInput {
  readonly prior: readonly Recommendation[];
  readonly current: readonly Recommendation[];
}

export interface ClassifyResult {
  readonly changes: readonly Change[];
  /** Prior advice with no counterpart, retained so its evidence stays inspectable. */
  readonly withdrawn: readonly Recommendation[];
}

function dependencyDelta(before: Recommendation, after: Recommendation): string[] {
  const priorDeps = new Set(before.depends_on);
  const currentDeps = new Set(after.depends_on);
  const changed = new Set<string>();

  for (const dependency of priorDeps) if (!currentDeps.has(dependency)) changed.add(dependency);
  for (const dependency of currentDeps) if (!priorDeps.has(dependency)) changed.add(dependency);

  return [...changed];
}

export function classifyChanges(input: ClassifyInput): ClassifyResult {
  const changes: Change[] = [];
  const withdrawn: Recommendation[] = [];

  const priorById = new Map(input.prior.map((recommendation) => [recommendation.id, recommendation]));
  const claimedPriorIds = new Set<string>();

  for (const current of input.current) {
    const priorId = current.prior_recommendation_id;

    if (priorId === null) {
      changes.push({
        prior_recommendation_id: null,
        recommendation_id: current.id,
        change_type: 'added',
        reason: 'This advice appears only under the scenario assumption.',
        changed_dependency_ids: [...current.depends_on],
      });
      continue;
    }

    const prior = priorById.get(priorId);
    if (prior === undefined) {
      // The caller validates prior-ID membership before this point; treating an
      // unknown ID as new keeps the classifier total rather than silently
      // attributing a revision to advice that never existed.
      changes.push({
        prior_recommendation_id: null,
        recommendation_id: current.id,
        change_type: 'added',
        reason: 'This advice appears only under the scenario assumption.',
        changed_dependency_ids: [...current.depends_on],
      });
      continue;
    }

    claimedPriorIds.add(priorId);

    const sameAction = actionableFingerprint(prior) === actionableFingerprint(current);
    const changedDeps = dependencyDelta(prior, current);

    changes.push({
      prior_recommendation_id: priorId,
      recommendation_id: current.id,
      change_type: sameAction ? 'unchanged' : 'revised',
      reason: sameAction
        ? 'The assumption does not affect this advice; the proposed action is identical.'
        : 'The proposed action changed under the scenario assumption.',
      changed_dependency_ids: changedDeps,
    });
  }

  for (const prior of input.prior) {
    if (claimedPriorIds.has(prior.id)) continue;

    withdrawn.push({ ...prior, status: 'withdrawn' });
    changes.push({
      prior_recommendation_id: prior.id,
      recommendation_id: null,
      change_type: 'withdrawn',
      reason:
        'This advice is not supportable under the scenario assumption, and no revision of it was produced. ' +
        'Its evidence remains inspectable.',
      changed_dependency_ids: [...prior.depends_on],
    });
  }

  return { changes, withdrawn };
}
