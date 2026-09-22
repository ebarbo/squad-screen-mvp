/**
 * Scenario overlay (EWE-66).
 *
 * An availability assumption is applied to a *copy* of the base context. The
 * base is deep-frozen upstream, so this is not merely a convention: attempting
 * to mutate it throws. The copy carries the same `evidence_snapshot_id`,
 * because the facts have not changed — only an assumption about one of them.
 *
 * Nothing here re-reads a source or re-runs extraction. A what-if asks "given
 * the same evidence, what changes?", and fetching new evidence would answer a
 * different question.
 */
import type {
  AvailabilityAssumption,
  AvailabilityOverride,
  BaseMatchContext,
  ClubPlayer,
  ScenarioMatchContext,
  Warning,
} from '@/domain/contracts';
import { deepFreeze } from '@/server/evidence/context';

export interface OverlayResult {
  readonly context: ScenarioMatchContext;
  readonly assumptions: readonly AvailabilityAssumption[];
  readonly warnings: readonly Warning[];
}

export class UnknownPlayerError extends Error {
  constructor(readonly playerId: string) {
    super(`No player ${playerId} in this squad, so no assumption can be applied to them.`);
    this.name = 'UnknownPlayerError';
  }
}

export function applyAvailabilityOverlay(
  base: BaseMatchContext,
  overrides: readonly AvailabilityOverride[],
  identity: { readonly scenarioId: string; readonly parentRunId: string },
): OverlayResult {
  const byId = new Map(base.own_team.players.map((player) => [player.id, player]));

  const assumptions: AvailabilityAssumption[] = [];
  const warnings: Warning[] = [];

  for (const override of overrides) {
    const player = byId.get(override.player_id);
    if (player === undefined) throw new UnknownPlayerError(override.player_id);

    if (player.availability === override.availability) {
      warnings.push({
        code: 'evidence_conflict',
        message:
          `${player.display_name} is already ${override.availability} in the factual record, so this assumption ` +
          'changes nothing.',
        related_ids: [player.id],
      });
    }

    assumptions.push({
      player_id: override.player_id,
      availability: override.availability,
      // Retaining the factual value is what lets the UI say "assumed X, record
      // says Y" and what makes the overlay reversible.
      replaces_factual_availability: player.availability,
      is_hypothetical: true,
    });
  }

  const overridden = new Map(assumptions.map((assumption) => [assumption.player_id, assumption.availability]));

  const players: ClubPlayer[] = base.own_team.players.map((player) => {
    const assumed = overridden.get(player.id);
    if (assumed === undefined) return { ...player };
    return { ...player, availability: assumed };
  });

  const context: ScenarioMatchContext = {
    kind: 'scenario',
    scenario_id: identity.scenarioId,
    parent_run_id: identity.parentRunId,
    assumptions,
    fixture: base.fixture,
    // Identical to the parent's. A different value here would mean the facts
    // moved, which is the failure the immutability tests look for.
    evidence_snapshot_id: base.evidence_snapshot_id,
    as_of: base.as_of,
    own_team: { team: base.own_team.team, players },
    opponent: {
      team: base.opponent.team,
      observations: [...base.opponent.observations],
      derived_metrics: base.opponent.derived_metrics.map((metric) => ({ ...metric })),
    },
    external_context: [...base.external_context],
    evidence: base.evidence.map((item) => ({ ...item })),
    constraints: base.constraints.map((constraint) => ({ ...constraint })),
    conflicts: base.conflicts.map((conflict) => ({ ...conflict })),
    missing_information: base.missing_information.map((gap) => ({ ...gap })),
  };

  return { context: deepFreeze(context), assumptions, warnings };
}
