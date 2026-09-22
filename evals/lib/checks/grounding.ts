import { checkReferentialIntegrity, type IntegrityProblem } from '@/domain/contracts';
import { fromViolations, pass, type CheckId, type CheckResult, type Violation } from './types';
import {
  effectivePlayers,
  evidenceById,
  subjectRecommendations,
  type CheckContext,
} from './context';

/**
 * G1, G3 and G5 are the harness's view of the contract's own referential
 * integrity pass, split by reference kind so a report says *what* was
 * fabricated rather than just that something was. The contract function is the
 * single implementation; this only partitions its findings.
 */
function integrityProblems(context: CheckContext): IntegrityProblem[] {
  return checkReferentialIntegrity({
    recommendations: subjectRecommendations(context),
    evidence: context.baseContext.evidence,
    players: context.baseContext.own_team.players,
    constraints: context.baseContext.constraints,
    priorRecommendationIds:
      context.rerun === null ? undefined : context.base.recommendations.map((r) => r.id),
  });
}

function violationsOfKind(
  problems: readonly IntegrityProblem[],
  kinds: ReadonlyArray<IntegrityProblem['kind']>,
): Violation[] {
  return problems
    .filter((problem) => kinds.includes(problem.kind))
    .map((problem) => ({
      recommendation_id: problem.location.split(' ')[1] ?? null,
      detail: problem.message,
      offending_value: problem.reference,
    }));
}

function integrityCheck(
  id: CheckId,
  context: CheckContext,
  kinds: ReadonlyArray<IntegrityProblem['kind']>,
  passReason: string,
): CheckResult {
  return fromViolations(id, violationsOfKind(integrityProblems(context), kinds), passReason);
}

/** G1 — a citation that does not resolve is a fabricated citation. */
export function checkG1(context: CheckContext): CheckResult {
  return integrityCheck(
    'G1',
    context,
    ['unknown_evidence_id'],
    'Every cited evidence ID resolves in the snapshot.',
  );
}

/**
 * G2 — an observation must rest on a usable record.
 *
 * The schema already forbids an empty citation list, so the question left is
 * whether the citations are worth anything: grounding an observation entirely
 * on records marked `missing`, or entirely on records flagged as not valid for
 * this fixture, is citation theatre.
 */
export function checkG2(context: CheckContext): CheckResult {
  const evidence = evidenceById(context);
  const violations: Violation[] = [];
  for (const recommendation of subjectRecommendations(context)) {
    const cited = recommendation.evidence_ids
      .map((id) => evidence.get(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);
    if (cited.length === 0) continue; // G1 owns unresolvable citations.

    if (cited.every((item) => item.status === 'missing')) {
      violations.push({
        recommendation_id: recommendation.id,
        detail:
          'Every cited record is marked missing, so the observation rests on an acknowledged absence.',
        offending_value: recommendation.evidence_ids,
      });
      continue;
    }
    if (cited.every((item) => !item.valid_for_fixture)) {
      violations.push({
        recommendation_id: recommendation.id,
        detail:
          'Every cited record is flagged as not valid for this fixture, so nothing supports the observation for this match.',
        offending_value: recommendation.evidence_ids,
      });
    }
  }
  return fromViolations(
    'G2',
    violations,
    'Every observation rests on at least one usable, fixture-valid record.',
  );
}

/** G3 — a dependency the product cannot resolve cannot be explained or revised. */
export function checkG3(context: CheckContext): CheckResult {
  return integrityCheck(
    'G3',
    context,
    ['unknown_dependency_id'],
    'Every dependency reference resolves to a known evidence, player or constraint ID.',
  );
}

/**
 * G4 — the load-bearing anti-fabrication check.
 *
 * An action naming a player must rest on something the staff actually supplied
 * about that player: evidence backing one of their recorded capabilities, their
 * availability, their staff constraint, or any evidence record whose subject is
 * them. General football knowledge about what a left back can usually do is not
 * a supplied observation about *this* left back, and the contract's integrity
 * pass cannot catch it because the IDs all resolve.
 */
export function checkG4(context: CheckContext): CheckResult {
  const players = new Map(effectivePlayers(context).map((player) => [player.id, player]));
  const evidenceBySubject = new Map<string, Set<string>>();
  for (const item of context.baseContext.evidence) {
    if (item.subject_id === null) continue;
    const set = evidenceBySubject.get(item.subject_id) ?? new Set<string>();
    set.add(item.id);
    evidenceBySubject.set(item.subject_id, set);
  }

  const violations: Violation[] = [];
  for (const recommendation of subjectRecommendations(context)) {
    const cited = new Set<string>(recommendation.evidence_ids);
    for (const action of recommendation.player_actions) {
      const player = players.get(action.player_id);
      if (player === undefined) continue; // G5 owns unknown players.

      const supplied = new Set<string>([
        ...player.capabilities.flatMap((capability) => capability.evidence_ids),
        ...player.availability_evidence_ids,
        ...(player.staff_constraint?.evidence_ids ?? []),
        ...(evidenceBySubject.get(player.id) ?? []),
      ]);
      if ([...supplied].some((id) => cited.has(id))) continue;

      violations.push({
        recommendation_id: recommendation.id,
        detail:
          supplied.size === 0
            ? `Proposes an action for ${player.display_name} (${player.id}) as '${action.role}', for whom nothing at all was supplied.`
            : `Proposes an action for ${player.display_name} (${player.id}) as '${action.role}' without citing any of the ${supplied.size} supplied observation(s) about them.`,
        offending_value: action.player_id,
      });
    }
  }
  return fromViolations(
    'G4',
    violations,
    'Every proposed player action cites a supplied observation about that player.',
  );
}

/** G5 — acting on a player who is not in the squad. */
export function checkG5(context: CheckContext): CheckResult {
  const actions = subjectRecommendations(context).reduce(
    (sum, recommendation) => sum + recommendation.player_actions.length,
    0,
  );
  const problems = violationsOfKind(integrityProblems(context), ['unknown_player_id']);
  if (actions === 0 && problems.length === 0) {
    return pass('G5', 'No player actions proposed; nothing to resolve.');
  }
  return fromViolations('G5', problems, 'Every player action targets a player in the squad.');
}
