/**
 * Contract fixtures: small, valid payloads the UI and evaluation harness can
 * develop against before the server exists, plus deliberately invalid ones that
 * prove the validation actually bites.
 *
 * These are **development data**. Every example carries
 * `telemetry.transport: 'stub'` and a fixture ID under the `fx_example_`
 * namespace, so a screen rendered from them cannot be mistaken for the output of
 * a real run. The demo packet lives in `data/demo/` and is a different thing.
 */
import {
  type ClubPlayer,
  type EvidenceItem,
  type Recommendation,
  type RunResult,
  type ScenarioResult,
  type Telemetry,
} from '../contracts';

export const EXAMPLE_FIXTURE_ID = 'fx_example_derby';
export const EXAMPLE_SNAPSHOT_ID = 'snap_example_001';
export const EXAMPLE_RUN_ID = 'run_example_base';
export const EXAMPLE_SCENARIO_RUN_ID = 'run_example_scenario';
export const EXAMPLE_SCENARIO_ID = 'scn_example_player_a_out';

const AS_OF = '2026-09-22T09:00:00Z';

export const exampleTelemetry: Telemetry = {
  model_id: 'example/stub-model',
  prompt_version: 'example-0',
  transport: 'stub',
  duration_ms: 0,
  input_tokens: null,
  output_tokens: null,
  usage_note: 'Contract example; no provider call was made.',
  call_count: 1,
  retry_count: 0,
  pricing_basis: 'Not applicable to a contract example.',
  estimated_inference_cost_usd: null,
};

export const exampleEvidence: EvidenceItem[] = [
  {
    id: 'ev_example_wide_overload',
    fixture_id: EXAMPLE_FIXTURE_ID,
    subject_type: 'opponent',
    subject_id: 'tm_example_away',
    category: 'tactical_observation',
    claim: 'Opponent full-backs pushed high on the left in the last two matches, leaving the channel behind them open on transitions.',
    value: { sample_matches: 2, side: 'left' },
    source: {
      name: 'Opposition analyst match notes',
      connector: 'analyst_notes',
      url: null,
      record_id: 'note-2026-09-19-01',
      excerpt:
        'Left-back advanced beyond the halfway line in 14 of 18 opponent build-ups; recovery runs were slow on both transitions conceded.',
      origin_id: 'org_example_analyst',
    },
    observed_at: '2026-09-19T16:00:00Z',
    published_at: null,
    retrieved_at: '2026-09-22T08:30:00Z',
    valid_for_fixture: true,
    data_mode: 'synthetic',
    status: 'accepted',
    conflicts_with: [],
    check_notes: 'Two-match sample recorded by the analyst; sample size carried through to the derived metric.',
  },
  {
    id: 'ev_example_capability',
    fixture_id: EXAMPLE_FIXTURE_ID,
    subject_type: 'player',
    subject_id: 'pl_example_a',
    category: 'capability',
    claim: 'Player A repeatedly beat a full-back on the outside in training and in the previous fixture.',
    value: null,
    source: {
      name: 'Coaching staff observation log',
      connector: 'staff_log',
      url: null,
      record_id: 'staff-2026-09-20-07',
      excerpt: 'A. Rivers — consistently won the outside channel in 1v1 work; sharpest of the wide options this week.',
      origin_id: 'org_example_staff',
    },
    observed_at: '2026-09-20T10:00:00Z',
    published_at: null,
    retrieved_at: '2026-09-22T08:30:00Z',
    valid_for_fixture: true,
    data_mode: 'synthetic',
    status: 'accepted',
    conflicts_with: [],
    check_notes: 'Supplied by staff; treated as an observation, not a general claim about the player.',
  },
  {
    id: 'ev_example_minutes_limit',
    fixture_id: EXAMPLE_FIXTURE_ID,
    subject_type: 'player',
    subject_id: 'pl_example_a',
    category: 'constraint',
    claim: 'Staff set a maximum of 45 minutes for Player A in this fixture.',
    value: { max_minutes: 45 },
    source: {
      name: 'Coaching staff availability sheet',
      connector: 'staff_log',
      url: null,
      record_id: 'staff-2026-09-22-01',
      excerpt: 'A. Rivers — available, capped at 45 minutes this weekend.',
      origin_id: 'org_example_staff',
    },
    observed_at: '2026-09-22T07:00:00Z',
    published_at: null,
    retrieved_at: '2026-09-22T08:30:00Z',
    valid_for_fixture: true,
    data_mode: 'synthetic',
    status: 'accepted',
    conflicts_with: [],
    check_notes: 'Staff-supplied limit. Recorded as given; no clinical interpretation attached.',
  },
];

export const examplePlayers: ClubPlayer[] = [
  {
    id: 'pl_example_a',
    display_name: 'A. Rivers',
    position: 'FW',
    availability: 'available',
    staff_constraint: {
      id: 'con_example_a_minutes',
      player_id: 'pl_example_a',
      max_minutes: 45,
      note: 'Staff-supplied cap for this fixture.',
      evidence_ids: ['ev_example_minutes_limit'],
    },
    capabilities: [
      {
        label: 'Wide 1v1',
        detail: 'Beats a full-back on the outside.',
        evidence_ids: ['ev_example_capability'],
      },
    ],
    availability_evidence_ids: ['ev_example_minutes_limit'],
  },
  {
    id: 'pl_example_b',
    display_name: 'T. Okonkwo',
    position: 'MF',
    availability: 'available',
    staff_constraint: null,
    capabilities: [],
    availability_evidence_ids: [],
  },
];

export const exampleRecommendation: Recommendation = {
  id: 'rec_example_wide_overload',
  prior_recommendation_id: null,
  title: 'Attack the vacated left channel in the first half',
  priority: 'high',
  observation:
    'Analyst notes record the opponent left-back advancing beyond halfway in 14 of 18 build-ups across two matches, with slow recovery runs.',
  inference:
    'That pattern suggests the channel behind him is reachable on transitions, though two matches is a small sample and the opponent may adjust.',
  action:
    'Start Player A wide right for the first 45 minutes and target the space behind the opponent left-back on regains.',
  trade_off: 'Commits the staff-supplied 45-minute allocation to the first half, leaving no wide 1v1 option later.',
  uncertainty: 'Based on two observed matches. No information on whether the opponent has changed this since.',
  next_check: 'Confirm the opponent full-back selection when the team sheet is published.',
  evidence_ids: ['ev_example_wide_overload', 'ev_example_capability', 'ev_example_minutes_limit'],
  depends_on: ['pl_example_a', 'con_example_a_minutes', 'ev_example_wide_overload'],
  player_actions: [{ player_id: 'pl_example_a', planned_minutes: 45, role: 'Right wing, first half' }],
  status: 'proposed',
};

/** A complete, valid generation response. */
export const exampleRunResult: RunResult = {
  run_id: EXAMPLE_RUN_ID,
  fixture_id: EXAMPLE_FIXTURE_ID,
  evidence_snapshot_id: EXAMPLE_SNAPSHOT_ID,
  as_of: AS_OF,
  recommendations: [exampleRecommendation],
  evidence: exampleEvidence,
  abstention_note: 'Two supported options were available; a third would not have been backed by the supplied evidence.',
  warnings: [],
  telemetry: exampleTelemetry,
};

/**
 * Zero recommendations. This is a valid, and sometimes correct, response — the
 * UI has to render it as a real answer rather than as an error.
 */
export const exampleAbstainingRunResult: RunResult = {
  run_id: 'run_example_abstain',
  fixture_id: EXAMPLE_FIXTURE_ID,
  evidence_snapshot_id: EXAMPLE_SNAPSHOT_ID,
  as_of: AS_OF,
  recommendations: [],
  evidence: exampleEvidence.slice(0, 1),
  abstention_note:
    'The supplied evidence describes an opponent pattern but contains no observation of our own players in that role, so no action is proposed.',
  warnings: [
    {
      code: 'abstained',
      message: 'No recommendation is supported by the available evidence.',
      related_ids: [],
    },
  ],
  telemetry: exampleTelemetry,
};

/**
 * The scenario re-run. Note the snapshot ID is identical to the base run's, the
 * withdrawn recommendation is retained so its evidence stays inspectable, and
 * the replacement is a genuinely different action rather than the same advice
 * with a substituted name.
 */
export const exampleScenarioResult: ScenarioResult = {
  run_id: EXAMPLE_SCENARIO_RUN_ID,
  parent_run_id: EXAMPLE_RUN_ID,
  scenario_id: EXAMPLE_SCENARIO_ID,
  evidence_snapshot_id: EXAMPLE_SNAPSHOT_ID,
  applied_assumptions: [
    {
      player_id: 'pl_example_a',
      availability: 'unavailable',
      replaces_factual_availability: 'available',
      is_hypothetical: true,
    },
  ],
  recommendations: [
    {
      id: 'rec_example_central_alternative',
      prior_recommendation_id: null,
      title: 'Shift the overload central and accept a slower build',
      priority: 'medium',
      observation:
        'Analyst notes record the opponent left-back advancing beyond halfway in 14 of 18 build-ups across two matches.',
      inference:
        'Without a wide 1v1 option the channel is harder to attack directly; working through midfield keeps the pattern usable, but more slowly.',
      action: 'Build through T. Okonkwo centrally and use the wide channel only on second-phase regains.',
      trade_off: 'Slower progression and fewer direct entries into the vacated channel.',
      uncertainty:
        'No supplied observation shows T. Okonkwo performing this role against a high line, so the alternative is weaker than the withdrawn option.',
      next_check: 'Ask staff whether any wide option has a comparable supplied observation.',
      evidence_ids: ['ev_example_wide_overload'],
      depends_on: ['pl_example_b', 'ev_example_wide_overload'],
      player_actions: [{ player_id: 'pl_example_b', planned_minutes: null, role: 'Central progression' }],
      status: 'proposed',
    },
  ],
  changes: [
    {
      prior_recommendation_id: 'rec_example_wide_overload',
      recommendation_id: null,
      change_type: 'withdrawn',
      reason:
        'The action depended on Player A, who is unavailable under this assumption. No substitute has a supplied observation for the wide 1v1 role.',
      changed_dependency_ids: ['pl_example_a', 'con_example_a_minutes'],
    },
    {
      prior_recommendation_id: null,
      recommendation_id: 'rec_example_central_alternative',
      change_type: 'added',
      reason: 'Offers a weaker but supported way to use the same opponent observation without Player A.',
      changed_dependency_ids: ['pl_example_b'],
    },
  ],
  withdrawn_recommendations: [{ ...exampleRecommendation, status: 'withdrawn' }],
  evidence: exampleEvidence,
  abstention_note: 'Only one supported alternative exists without Player A.',
  warnings: [
    {
      code: 'constraint_blocked_action',
      message: 'Actions naming A. Rivers were removed because the scenario marks the player unavailable.',
      related_ids: ['pl_example_a'],
    },
  ],
  telemetry: exampleTelemetry,
};

/* ------------------------------------------------------------------------- *
 * Intentionally invalid examples
 *
 * Each one isolates a single failure the validation must catch. They are
 * exported as `unknown` because they are, by construction, not assignable to
 * the types they violate.
 * ------------------------------------------------------------------------- */

export const invalidExamples: Record<string, { readonly why: string; readonly payload: unknown }> = {
  unknownEvidenceReference: {
    why: 'Cites an evidence ID that is not in the run. A well-formed ID is not a real citation.',
    payload: {
      ...exampleRunResult,
      recommendations: [{ ...exampleRecommendation, evidence_ids: ['ev_example_does_not_exist'] }],
    },
  },

  fabricatedConfidence: {
    why: 'Carries a numeric confidence. Nothing here can produce a calibrated score, so the field is rejected.',
    payload: {
      ...exampleRecommendation,
      confidence: 0.84,
    },
  },

  confidenceInProse: {
    why: 'Buries a confidence figure in narrative text, where a schema alone would not catch it.',
    payload: {
      ...exampleRecommendation,
      inference: 'We assess 84% confidence that the channel stays open for the full match.',
    },
  },

  tooManyRecommendations: {
    why: 'Four recommendations. The cap is three; padding the list is a documented failure mode.',
    payload: {
      ...exampleRunResult,
      recommendations: [
        exampleRecommendation,
        { ...exampleRecommendation, id: 'rec_example_two' },
        { ...exampleRecommendation, id: 'rec_example_three' },
        { ...exampleRecommendation, id: 'rec_example_four' },
      ],
    },
  },

  unavailablePlayerAction: {
    why: 'Proposes an action for a player marked unavailable. Must be blocked before reaching the UI.',
    payload: {
      recommendations: [exampleRecommendation],
      players: [{ ...examplePlayers[0]!, availability: 'unavailable' }],
    },
  },

  exceedsSuppliedMinutes: {
    why: 'Proposes 70 minutes against a staff-supplied 45-minute limit.',
    payload: {
      recommendations: [
        {
          ...exampleRecommendation,
          player_actions: [{ player_id: 'pl_example_a', planned_minutes: 70, role: 'Right wing' }],
        },
      ],
      players: examplePlayers,
    },
  },

  unknownPriorRecommendation: {
    why: 'A scenario claims to revise a recommendation the parent run never produced.',
    payload: {
      recommendations: [{ ...exampleRecommendation, prior_recommendation_id: 'rec_example_never_existed' }],
      evidence: exampleEvidence,
      priorRecommendationIds: ['rec_example_wide_overload'],
    },
  },

  sourceWithBothUrlAndRecordId: {
    why: 'A source must be either public (URL) or a private record (record ID), not ambiguously both.',
    payload: {
      ...exampleEvidence[0]!,
      source: {
        ...exampleEvidence[0]!.source,
        url: 'https://example.invalid/report',
        record_id: 'note-2026-09-19-01',
      },
    },
  },

  malformedPlayerId: {
    why: 'Uses a display name where an ID belongs. Player names are not join keys.',
    payload: {
      ...exampleRecommendation,
      player_actions: [{ player_id: 'A. Rivers', planned_minutes: 45, role: 'Right wing' }],
    },
  },

  addedChangeWithPriorId: {
    why: 'An added recommendation cannot also claim to revise a prior one.',
    payload: {
      prior_recommendation_id: 'rec_example_wide_overload',
      recommendation_id: 'rec_example_central_alternative',
      change_type: 'added',
      reason: 'Inconsistent change record.',
      changed_dependency_ids: [],
    },
  },
};
