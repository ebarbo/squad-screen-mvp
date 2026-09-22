/**
 * Deterministic offline synthesis for the stub transport.
 *
 * This is not a model and does not pretend to be one. It applies a handful of
 * explicit rules to the same `MatchContext` the model receives, so that tests,
 * CI and offline development exercise the whole validation pipeline — schema,
 * referential integrity, constraint enforcement — against realistic input.
 *
 * It obeys the same rules the prompt asks of the model, including the important
 * one: when the evidence does not support an action, it abstains rather than
 * producing something plausible.
 */
import type { ClubPlayer, MatchContext, ModelSynthesis } from '@/domain/contracts';

/**
 * An opponent observation a wide-channel action can actually rest on.
 *
 * The match requires a full-back specifically. Matching loosely on "halfway"
 * would pick up the mid-block press note, which describes where the opponent
 * engages and says nothing about a vacated channel — proposing a wide action
 * off it would be exactly the unsupported leap the abstention case exists to
 * catch.
 */
function findWideChannelObservation(context: MatchContext) {
  return context.evidence.find(
    (item) =>
      item.category === 'tactical_observation' &&
      item.status !== 'missing' &&
      /full-back|left-back|right-back/i.test(item.source.excerpt),
  );
}

function isSelectable(player: ClubPlayer): boolean {
  return player.availability !== 'unavailable';
}

function findCapablePlayer(context: MatchContext, capability: string): ClubPlayer | undefined {
  return context.own_team.players.find(
    (player) => isSelectable(player) && player.capabilities.some((entry) => entry.label === capability),
  );
}

export function synthesizeOffline(context: MatchContext): ModelSynthesis {
  const observation = findWideChannelObservation(context);

  if (observation === undefined) {
    return {
      recommendations: [],
      abstention_note:
        'The packet contains no opponent observation that an action could rest on, so no recommendation is ' +
        'proposed. Adding a bounded observation of the opponent would change this.',
    };
  }

  const metric = context.opponent.derived_metrics[0];
  const metricText =
    metric === undefined
      ? 'across the reviewed matches'
      : `in ${metric.value}${metric.unit.startsWith('%') ? '%' : ` ${metric.unit}`} of reviewed build-ups ` +
        `(sample size ${metric.sample_size})`;

  const wide = findCapablePlayer(context, 'wide_1v1');

  if (wide !== undefined) {
    const limit = wide.staff_constraint?.max_minutes ?? null;
    const constraintIds = wide.staff_constraint === null ? [] : [wide.staff_constraint.id];
    const availabilityNote =
      wide.availability === 'monitor'
        ? ` Availability for ${wide.display_name} is uncertain and the advice depends on it being resolved.`
        : '';

    return {
      recommendations: [
        {
          title: 'Attack the channel the opponent full-back vacates',
          priority: 'high',
          observation: `${observation.source.excerpt} This was recorded ${metricText}.`,
          inference:
            'That pattern suggests the space behind the full-back is reachable on transitions. It is a reading of a ' +
            'small sample, and the opponent may have changed since.',
          action:
            `Use ${wide.display_name} against that full-back` +
            (limit === null ? '.' : ` for up to the staff-supplied ${limit} minutes.`),
          trade_off:
            limit === null
              ? 'Commits a wide option to one side of the pitch.'
              : `Spends the whole ${limit}-minute allocation, leaving no wide 1v1 option later in the match.`,
          uncertainty:
            `Based on ${metric?.sample_size ?? 'a small number of'} reviewed match(es). No information on whether the ` +
            `opponent has adjusted since.${availabilityNote}`,
          next_check: 'Confirm the opponent full-back is selected when the team sheet is published.',
          evidence_ids: [observation.id, ...wide.capabilities.flatMap((entry) => entry.evidence_ids)],
          depends_on: [wide.id, ...constraintIds, observation.id],
          player_actions: [{ player_id: wide.id, planned_minutes: limit, role: 'Wide attacker against the vacated channel' }],
          prior_recommendation_id: null,
        },
      ],
      abstention_note:
        'One action is supported by the packet. Further options would not have a supplied observation behind them.',
    };
  }

  // No wide option. Look for a genuinely different supported action rather than
  // substituting a name into the same advice.
  const central = findCapablePlayer(context, 'central_progression');

  if (central === undefined) {
    return {
      recommendations: [],
      abstention_note:
        'The opponent observation stands, but no selectable player has a supplied observation for a role that could ' +
        'exploit it. Proposing someone anyway would mean inventing a capability nobody recorded.',
    };
  }

  return {
    recommendations: [
      {
        title: 'Work the same weakness through the middle instead',
        priority: 'medium',
        observation: `${observation.source.excerpt} This was recorded ${metricText}.`,
        inference:
          'Without a wide option the vacated channel cannot be attacked directly. Progressing centrally can still ' +
          'reach it on second phases, more slowly and less often.',
        action: `Build through ${central.display_name} centrally and enter the channel on second-phase regains.`,
        trade_off: 'Slower progression and fewer direct entries into the space than a wide option would achieve.',
        uncertainty:
          `No supplied observation shows ${central.display_name} performing this specific role against a high line, ` +
          'so this is weaker than a directly observed option.',
        next_check: 'Ask staff whether any selectable wide player has a comparable supplied observation.',
        evidence_ids: [observation.id, ...central.capabilities.flatMap((entry) => entry.evidence_ids)],
        depends_on: [central.id, observation.id],
        player_actions: [{ player_id: central.id, planned_minutes: null, role: 'Central progression' }],
        prior_recommendation_id: null,
      },
    ],
    abstention_note:
      'Only one supported alternative exists without a wide 1v1 option, and it is weaker than a directly observed one.',
  };
}
