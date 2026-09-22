import {
  type BaseMatchContext,
  type ClubPlayer,
  type EvidenceItem,
  type PlayerId,
  type Recommendation,
  type RunResult,
  type ScenarioResult,
  type Warning,
} from '@/domain/contracts';

/**
 * Everything a deterministic check reads, assembled once per run.
 *
 * The harness imports the project's own contract types rather than restating
 * them, so a contract change breaks `npm run typecheck` here instead of quietly
 * changing what the harness measures.
 */
export interface CheckContext {
  case_id: string;
  baseContext: BaseMatchContext;
  base: RunResult;
  /** Null for generate-only cases. */
  rerun: ScenarioResult | null;
  /** Which player the scenario overrode, resolved at run time. */
  overridePlayerId: PlayerId | null;
  /** Raw model output, before the server assembled a run result. */
  rawModelOutput: unknown;
  /**
   * The run this one's actionable content is expected to match, for cases where
   * an unrelated context change must not move the advice. Null when the case
   * declares no baseline or the baseline run did not complete.
   */
  stabilityBaseline: RunResult | null;
  /**
   * Hash of the base run taken immediately before the rerun call, and again
   * after it returned. A difference means the what-if mutated the base run.
   * Null when no rerun happened.
   */
  basePreRerunHash: string | null;
  basePostRerunHash: string | null;
  /**
   * Set when the base run object could not be re-read after the rerun, so R4
   * reports what it actually verified instead of implying more.
   */
  immutabilityEvidenceNote: string;
}

/** The output under test: the rerun when there is one, otherwise the base run. */
export function subjectRun(context: CheckContext): RunResult | ScenarioResult {
  return context.rerun ?? context.base;
}

export function subjectRecommendations(context: CheckContext): readonly Recommendation[] {
  return subjectRun(context).recommendations;
}

export function subjectWarnings(context: CheckContext): readonly Warning[] {
  return subjectRun(context).warnings;
}

/**
 * Squad availability as the run under test saw it: the base squad with the
 * scenario's hypothetical assumptions applied on top. The base records are
 * copied, never mutated, which is the same discipline the product itself
 * follows for the overlay.
 */
export function effectivePlayers(context: CheckContext): ClubPlayer[] {
  const players = context.baseContext.own_team.players.map((player) => ({ ...player }));
  if (context.rerun === null) return players;
  for (const assumption of context.rerun.applied_assumptions) {
    const target = players.find((player) => player.id === assumption.player_id);
    if (target !== undefined) target.availability = assumption.availability;
  }
  return players;
}

export function evidenceById(context: CheckContext): Map<string, EvidenceItem> {
  return new Map(context.baseContext.evidence.map((item) => [item.id, item]));
}

/** Free-text fields a language scan must cover. */
export function narrativeFields(recommendation: Recommendation): Array<[string, string]> {
  return [
    ['title', recommendation.title],
    ['observation', recommendation.observation],
    ['inference', recommendation.inference],
    ['action', recommendation.action],
    ['trade_off', recommendation.trade_off],
    ['uncertainty', recommendation.uncertainty],
    ['next_check', recommendation.next_check],
  ];
}

export function warningFields(warnings: readonly Warning[]): Array<[string, string]> {
  return warnings.map((warning, index) => [`warnings[${index}].message`, warning.message]);
}

/** The actionable core of a recommendation: what R3 compares for real change. */
export function actionableContent(recommendation: Recommendation): string {
  return JSON.stringify({
    action: recommendation.action,
    player_actions: [...recommendation.player_actions]
      .map((entry) => ({
        player_id: entry.player_id,
        planned_minutes: entry.planned_minutes,
        role: entry.role,
      }))
      .sort((a, b) => a.player_id.localeCompare(b.player_id)),
  });
}

/** Everything a reader would notice, used to tell a real revision from a relabel. */
export function fullContent(recommendation: Recommendation): string {
  return JSON.stringify({
    ...Object.fromEntries(narrativeFields(recommendation)),
    priority: recommendation.priority,
    evidence_ids: [...recommendation.evidence_ids].sort(),
    depends_on: [...recommendation.depends_on].sort(),
    actionable: actionableContent(recommendation),
    status: recommendation.status,
  });
}
