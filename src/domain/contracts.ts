/**
 * The single source of truth for every shape crossing a boundary in this
 * project. The server, the UI, and the evaluation harness all import from here,
 * so that data, AI and UI workstreams cannot invent incompatible interfaces.
 *
 * Two rules are enforced structurally rather than by convention:
 *
 *   1. Traceability. A factual claim carries `evidence_ids`. Those IDs must
 *      resolve to `EvidenceItem` records that retain the source and its exact
 *      excerpt. `checkReferentialIntegrity` rejects a run that cites evidence it
 *      does not carry, so an uncitable claim cannot reach the UI.
 *
 *   2. Facts and assumptions are different things. `MatchContext` is a
 *      discriminated union: a `base` context holds observed facts only, and a
 *      `scenario` context additionally holds explicit, hypothetical assumptions.
 *      There is no way to express "a fact I made up" in this type system.
 *
 * Deliberately absent: any numeric confidence, probability, score or likelihood.
 * Nothing in this pipeline can produce a calibrated one, so the schema gives it
 * nowhere to live, and `assertNoFabricatedConfidence` fails loudly if a model
 * tries to smuggle one in.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------------- *
 * Identifiers
 *
 * Prefixed IDs make "player names alone are not join keys" mechanical: a
 * mistyped or hallucinated reference fails the pattern before it can be looked
 * up, and the prefix says which table it was meant to hit.
 * ------------------------------------------------------------------------- */

const idSchema = (prefix: string, label: string) =>
  z
    .string()
    .regex(
      new RegExp(`^${prefix}_[a-z0-9][a-z0-9_-]*$`),
      `${label} must look like "${prefix}_<slug>" (lowercase, digits, hyphen or underscore).`,
    );

export const FixtureIdSchema = idSchema('fx', 'Fixture ID');
export const EvidenceIdSchema = idSchema('ev', 'Evidence ID');
export const PlayerIdSchema = idSchema('pl', 'Player ID');
export const TeamIdSchema = idSchema('tm', 'Team ID');
export const ConstraintIdSchema = idSchema('con', 'Constraint ID');
export const RecommendationIdSchema = idSchema('rec', 'Recommendation ID');
export const RunIdSchema = idSchema('run', 'Run ID');
export const ScenarioIdSchema = idSchema('scn', 'Scenario ID');
export const SnapshotIdSchema = idSchema('snap', 'Evidence snapshot ID');
export const OriginIdSchema = idSchema('org', 'Source origin ID');

export type FixtureId = z.infer<typeof FixtureIdSchema>;
export type EvidenceId = z.infer<typeof EvidenceIdSchema>;
export type PlayerId = z.infer<typeof PlayerIdSchema>;
export type RunId = z.infer<typeof RunIdSchema>;
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;
export type SnapshotId = z.infer<typeof SnapshotIdSchema>;

/** ISO-8601 instant. Unknown timestamps stay null; they are never guessed. */
export const TimestampSchema = z.iso.datetime({ offset: true });

/* ------------------------------------------------------------------------- *
 * Enumerations
 * ------------------------------------------------------------------------- */

/**
 * How the record reached us. This drives the UI labelling: a synthetic staff
 * record and a live vendor feed must never look alike on screen.
 */
export const DATA_MODES = ['synthetic', 'snapshot', 'live'] as const;
export const DataModeSchema = z.enum(DATA_MODES);
export type DataMode = z.infer<typeof DataModeSchema>;

/**
 * `accepted` means "checked against the supplied source", not "true". The
 * distinction matters: every gate in this project is about not overclaiming.
 */
export const EVIDENCE_STATUSES = ['accepted', 'disputed', 'stale', 'missing', 'unverified'] as const;
export const EvidenceStatusSchema = z.enum(EVIDENCE_STATUSES);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

/** `monitor` is uncertainty about availability. It is not medical clearance. */
export const AVAILABILITIES = ['available', 'unavailable', 'monitor'] as const;
export const AvailabilitySchema = z.enum(AVAILABILITIES);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const SUBJECT_TYPES = ['player', 'team', 'opponent', 'fixture'] as const;
export const SubjectTypeSchema = z.enum(SUBJECT_TYPES);
export type SubjectType = z.infer<typeof SubjectTypeSchema>;

export const EVIDENCE_CATEGORIES = [
  'availability',
  'capability',
  'constraint',
  'tactical_observation',
  'set_piece',
  'form',
  'lineup',
  'discipline',
  'context',
] as const;
export const EvidenceCategorySchema = z.enum(EVIDENCE_CATEGORIES);
export type EvidenceCategory = z.infer<typeof EvidenceCategorySchema>;

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export const PrioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof PrioritySchema>;

export const RECOMMENDATION_STATUSES = ['proposed', 'withdrawn'] as const;
export const RecommendationStatusSchema = z.enum(RECOMMENDATION_STATUSES);
export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>;

export const CHANGE_TYPES = ['added', 'revised', 'withdrawn', 'unchanged'] as const;
export const ChangeTypeSchema = z.enum(CHANGE_TYPES);
export type ChangeType = z.infer<typeof ChangeTypeSchema>;

export const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;
export const PositionSchema = z.enum(POSITIONS);
export type Position = z.infer<typeof PositionSchema>;

/* ------------------------------------------------------------------------- *
 * Evidence
 * ------------------------------------------------------------------------- */

/**
 * Where a claim came from, in enough detail that a judge can check it.
 *
 * `origin_id` identifies the *original* reporting, not this copy of it. Two
 * outlets republishing one agency report share an origin, which is what stops
 * them counting as two independent corroborations.
 */
export const EvidenceSourceSchema = z
  .object({
    name: z.string().min(1),
    connector: z.string().min(1),
    /** A public source has a URL; a private record has an ID. Exactly one. */
    url: z.url().nullable(),
    record_id: z.string().min(1).nullable(),
    /** Verbatim. This is what a reviewer reads to decide whether the claim holds. */
    excerpt: z.string().min(1),
    origin_id: OriginIdSchema,
  })
  .refine((source) => (source.url === null) !== (source.record_id === null), {
    message: 'Provide exactly one of url (public source) or record_id (private record).',
  });

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

/**
 * `value` carries the typed form of a claim when there is one — minutes, a
 * count, a formation string. `claim` always carries the human-readable form.
 */
export const EvidenceValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  z.null(),
]);

export type EvidenceValue = z.infer<typeof EvidenceValueSchema>;

export const EvidenceItemSchema = z.object({
  id: EvidenceIdSchema,
  fixture_id: FixtureIdSchema,
  subject_type: SubjectTypeSchema,
  /** Entity this claim is about. Null only for fixture-wide context. */
  subject_id: z.string().min(1).nullable(),
  category: EvidenceCategorySchema,
  claim: z.string().min(1),
  value: EvidenceValueSchema,
  source: EvidenceSourceSchema,
  observed_at: TimestampSchema,
  /** Null when the source does not state a publication date. Never inferred. */
  published_at: TimestampSchema.nullable(),
  retrieved_at: TimestampSchema,
  valid_for_fixture: z.boolean(),
  data_mode: DataModeSchema,
  status: EvidenceStatusSchema,
  /** Evidence this item contradicts. Symmetrical by convention, not enforced. */
  conflicts_with: z.array(EvidenceIdSchema).default([]),
  /** Why the rule engine assigned this status. One concise sentence. */
  check_notes: z.string().min(1),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

/* ------------------------------------------------------------------------- *
 * Squad
 * ------------------------------------------------------------------------- */

/**
 * A capability is something a coach or analyst *supplied*, with the evidence to
 * show it. It is never derived from a model's general football knowledge: if no
 * one observed it, the system does not know it.
 */
export const PlayerCapabilitySchema = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
  evidence_ids: z.array(EvidenceIdSchema).min(1),
});

export type PlayerCapability = z.infer<typeof PlayerCapabilitySchema>;

/**
 * A staff-supplied limit. `max_minutes` is what the staff said, not what the
 * system inferred — there is deliberately no field for a computed "safe" load,
 * because computing one would be a medical judgement this system must not make.
 */
export const StaffConstraintSchema = z.object({
  id: ConstraintIdSchema,
  player_id: PlayerIdSchema,
  max_minutes: z.number().int().min(0).max(120).nullable(),
  note: z.string().min(1),
  evidence_ids: z.array(EvidenceIdSchema).min(1),
});

export type StaffConstraint = z.infer<typeof StaffConstraintSchema>;

export const ClubPlayerSchema = z.object({
  id: PlayerIdSchema,
  display_name: z.string().min(1),
  position: PositionSchema,
  availability: AvailabilitySchema,
  /** The staff-supplied limit for this player, or null if none was supplied. */
  staff_constraint: StaffConstraintSchema.nullable(),
  capabilities: z.array(PlayerCapabilitySchema).default([]),
  /** Evidence backing the availability status itself. */
  availability_evidence_ids: z.array(EvidenceIdSchema).default([]),
});

export type ClubPlayer = z.infer<typeof ClubPlayerSchema>;

/* ------------------------------------------------------------------------- *
 * Fixture and context
 * ------------------------------------------------------------------------- */

export const TeamSchema = z.object({
  id: TeamIdSchema,
  name: z.string().min(1),
  /** True for explicitly fictional clubs used to carry synthetic squad data. */
  is_fictional: z.boolean(),
});

export type Team = z.infer<typeof TeamSchema>;

export const FixtureSchema = z.object({
  id: FixtureIdSchema,
  competition: z.string().min(1),
  kickoff_at: TimestampSchema,
  home_team: TeamSchema,
  away_team: TeamSchema,
  venue: z.string().min(1),
  /** Nothing observed after this instant may enter the packet. */
  information_cutoff: TimestampSchema,
  /** How this fixture was chosen, and from where. */
  provenance_note: z.string().min(1),
  /** Data modes present in this fixture's packet, for the UI's mode badges. */
  data_modes: z.array(DataModeSchema).min(1),
});

export type Fixture = z.infer<typeof FixtureSchema>;

/**
 * Something we know we do not know. Surfacing these is the difference between
 * an honest briefing and a confident-sounding one.
 */
export const MissingInformationSchema = z.object({
  topic: z.string().min(1),
  detail: z.string().min(1),
  /** What would resolve it, if anything realistically would. */
  would_be_resolved_by: z.string().min(1).nullable(),
});

export type MissingInformation = z.infer<typeof MissingInformationSchema>;

/** An unresolved disagreement between sources. It stays visible; it is not averaged away. */
export const EvidenceConflictSchema = z.object({
  evidence_ids: z.array(EvidenceIdSchema).min(2),
  subject_id: z.string().min(1).nullable(),
  summary: z.string().min(1),
  /** Populated only when a documented freshness/authority rule actually applied. */
  resolution: z.string().min(1).nullable(),
});

export type EvidenceConflict = z.infer<typeof EvidenceConflictSchema>;

/** A descriptive figure computed in code from a bounded sample, never by a model. */
export const DerivedMetricSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  /** How many observations the figure is computed from. Small samples say so. */
  sample_size: z.number().int().min(0),
  window: z.string().min(1),
  evidence_ids: z.array(EvidenceIdSchema).min(1),
});

export type DerivedMetric = z.infer<typeof DerivedMetricSchema>;

const matchContextCommon = {
  fixture: FixtureSchema,
  evidence_snapshot_id: SnapshotIdSchema,
  as_of: TimestampSchema,
  own_team: z.object({
    team: TeamSchema,
    players: z.array(ClubPlayerSchema),
  }),
  opponent: z.object({
    team: TeamSchema,
    observations: z.array(EvidenceIdSchema).default([]),
    derived_metrics: z.array(DerivedMetricSchema).default([]),
  }),
  external_context: z.array(EvidenceIdSchema).default([]),
  /** Every evidence record the run may cite, in full. */
  evidence: z.array(EvidenceItemSchema),
  constraints: z.array(StaffConstraintSchema).default([]),
  conflicts: z.array(EvidenceConflictSchema).default([]),
  missing_information: z.array(MissingInformationSchema).default([]),
};

/**
 * A hypothetical change to an availability assumption.
 *
 * `is_hypothetical` is always true and cannot be set to false. It exists so that
 * any consumer holding one of these — prompt builder, UI, eval harness — is
 * forced to confront that this is not a fact.
 */
export const AvailabilityAssumptionSchema = z.object({
  player_id: PlayerIdSchema,
  availability: AvailabilitySchema,
  /** What the factual record says, retained so the overlay can be explained and undone. */
  replaces_factual_availability: AvailabilitySchema,
  is_hypothetical: z.literal(true),
});

export type AvailabilityAssumption = z.infer<typeof AvailabilityAssumptionSchema>;

/** Observed facts only. A base context has no assumptions, by construction. */
export const BaseMatchContextSchema = z.object({
  kind: z.literal('base'),
  ...matchContextCommon,
});

export type BaseMatchContext = z.infer<typeof BaseMatchContextSchema>;

/**
 * A base context plus explicit hypothetical assumptions. Produced by copying a
 * base context; the original is never mutated.
 */
export const ScenarioMatchContextSchema = z.object({
  kind: z.literal('scenario'),
  scenario_id: ScenarioIdSchema,
  parent_run_id: RunIdSchema,
  assumptions: z.array(AvailabilityAssumptionSchema).min(1),
  ...matchContextCommon,
});

export type ScenarioMatchContext = z.infer<typeof ScenarioMatchContextSchema>;

export const MatchContextSchema = z.discriminatedUnion('kind', [
  BaseMatchContextSchema,
  ScenarioMatchContextSchema,
]);

export type MatchContext = z.infer<typeof MatchContextSchema>;

/* ------------------------------------------------------------------------- *
 * Recommendations
 * ------------------------------------------------------------------------- */

/**
 * A proposed use of a player. `planned_minutes` is present only when the action
 * actually proposes a duration; it is checked in code against the staff-supplied
 * limit after generation, never trusted from the model.
 */
export const PlayerActionSchema = z.object({
  player_id: PlayerIdSchema,
  planned_minutes: z.number().int().min(0).max(120).nullable(),
  role: z.string().min(1),
});

export type PlayerAction = z.infer<typeof PlayerActionSchema>;

/**
 * Note the shape of the four narrative fields: `observation` is what the sources
 * say, `inference` is the tactical reading of it, and `action` is the proposal.
 * Keeping them as separate fields is what lets the UI show — rather than assert —
 * where evidence stops and interpretation begins.
 */
export const RecommendationSchema = z.object({
  id: RecommendationIdSchema,
  /** Null for a recommendation that first appears in a scenario. */
  prior_recommendation_id: RecommendationIdSchema.nullable(),
  title: z.string().min(1),
  priority: PrioritySchema,
  /** Must be supported by `evidence_ids`. Checked by the source-support audit. */
  observation: z.string().min(1),
  /** Tactical reading. Labeled as interpretation, not fact. */
  inference: z.string().min(1),
  action: z.string().min(1),
  trade_off: z.string().min(1),
  uncertainty: z.string().min(1),
  next_check: z.string().min(1),
  evidence_ids: z.array(EvidenceIdSchema).min(1),
  depends_on: z.array(z.string().min(1)).default([]),
  player_actions: z.array(PlayerActionSchema).default([]),
  status: RecommendationStatusSchema,
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * What the model is allowed to return: the same shape minus the fields the
 * server owns. `strictObject` means an invented field — `confidence`,
 * `win_probability`, `injury_risk` — fails validation and triggers a bounded
 * repair rather than silently reaching the UI.
 */
export const ModelRecommendationSchema = z.strictObject({
  title: z.string().min(1),
  priority: PrioritySchema,
  observation: z.string().min(1),
  inference: z.string().min(1),
  action: z.string().min(1),
  trade_off: z.string().min(1),
  uncertainty: z.string().min(1),
  next_check: z.string().min(1),
  evidence_ids: z.array(EvidenceIdSchema).min(1),
  depends_on: z.array(z.string().min(1)).default([]),
  player_actions: z.array(z.strictObject({
    player_id: PlayerIdSchema,
    planned_minutes: z.number().int().min(0).max(120).nullable(),
    role: z.string().min(1),
  })).default([]),
  /** Present only on a scenario re-run, echoing the advice being revised. */
  prior_recommendation_id: RecommendationIdSchema.nullable().default(null),
});

export type ModelRecommendation = z.infer<typeof ModelRecommendationSchema>;

/**
 * Zero to three. Zero is a legitimate, and sometimes correct, answer: when the
 * evidence does not support advice, abstaining beats padding the list.
 */
export const ModelSynthesisSchema = z.strictObject({
  recommendations: z.array(ModelRecommendationSchema).max(3),
  /** Why fewer than three, or none. Required so abstention is explained. */
  abstention_note: z.string().min(1).nullable().default(null),
});

export type ModelSynthesis = z.infer<typeof ModelSynthesisSchema>;

/* ------------------------------------------------------------------------- *
 * Changes between a base run and a scenario re-run
 * ------------------------------------------------------------------------- */

export const ChangeSchema = z
  .object({
    /** Null when `change_type` is `added`. */
    prior_recommendation_id: RecommendationIdSchema.nullable(),
    /** Null when `change_type` is `withdrawn`. */
    recommendation_id: RecommendationIdSchema.nullable(),
    change_type: ChangeTypeSchema,
    reason: z.string().min(1),
    /** Evidence, player or constraint IDs whose status drove the change. */
    changed_dependency_ids: z.array(z.string().min(1)).default([]),
  })
  .refine((change) => (change.change_type === 'added' ? change.prior_recommendation_id === null : true), {
    message: 'An added recommendation has no prior recommendation ID.',
  })
  .refine((change) => (change.change_type === 'withdrawn' ? change.recommendation_id === null : true), {
    message: 'A withdrawn recommendation has no current recommendation ID.',
  })
  .refine(
    (change) =>
      change.change_type === 'added' || change.change_type === 'withdrawn'
        ? true
        : change.prior_recommendation_id !== null && change.recommendation_id !== null,
    { message: 'A revised or unchanged recommendation references both a prior and a current ID.' },
  );

export type Change = z.infer<typeof ChangeSchema>;

/* ------------------------------------------------------------------------- *
 * Telemetry
 * ------------------------------------------------------------------------- */

/**
 * Every field that can be unavailable is nullable *and* paired with a reason.
 * A null token count with "provider omitted usage" is information; a zero would
 * be a lie.
 */
export const TelemetrySchema = z.object({
  model_id: z.string().min(1),
  prompt_version: z.string().min(1),
  /** `live` means a real provider call. `stub` means the offline transport. */
  transport: z.enum(['live', 'stub']),
  duration_ms: z.number().int().min(0),
  input_tokens: z.number().int().min(0).nullable(),
  output_tokens: z.number().int().min(0).nullable(),
  /** Why token counts are null, when they are. */
  usage_note: z.string().min(1).nullable(),
  /** Includes every retry, not just the successful attempt. */
  call_count: z.number().int().min(1),
  retry_count: z.number().int().min(0),
  /** How cost was derived, or why it could not be. */
  pricing_basis: z.string().min(1),
  /** USD, inference only — not total operating cost. Null when not derivable. */
  estimated_inference_cost_usd: z.number().min(0).nullable(),
});

export type Telemetry = z.infer<typeof TelemetrySchema>;

/* ------------------------------------------------------------------------- *
 * Warnings and errors
 * ------------------------------------------------------------------------- */

export const WARNING_CODES = [
  'evidence_conflict',
  'stale_evidence',
  'missing_evidence',
  'abstained',
  'constraint_blocked_action',
  'model_output_repaired',
  'source_unavailable',
  'duplicate_origin_collapsed',
] as const;
export const WarningCodeSchema = z.enum(WARNING_CODES);
export type WarningCode = z.infer<typeof WarningCodeSchema>;

export const WarningSchema = z.object({
  code: WarningCodeSchema,
  message: z.string().min(1),
  related_ids: z.array(z.string().min(1)).default([]),
});

export type Warning = z.infer<typeof WarningSchema>;

/**
 * Distinguishing these is an acceptance criterion: an operator needs to know
 * whether to fix configuration, retry, or stop trusting the output.
 */
export const ERROR_CODES = [
  'missing_configuration',
  'provider_timeout',
  'provider_error',
  'invalid_model_output',
  'source_unavailable',
  'unknown_fixture',
  'unknown_run',
  'invalid_request',
  'constraint_violation',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const StructuredErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    /** Operator-facing remediation, when there is a concrete one. */
    remediation: z.string().min(1).nullable().default(null),
  }),
  run_id: RunIdSchema.optional(),
});

export type StructuredError = z.infer<typeof StructuredErrorSchema>;

/* ------------------------------------------------------------------------- *
 * API payloads
 * ------------------------------------------------------------------------- */

export const FixtureSummarySchema = z.object({
  id: FixtureIdSchema,
  competition: z.string().min(1),
  label: z.string().min(1),
  kickoff_at: TimestampSchema,
  information_cutoff: TimestampSchema,
  data_modes: z.array(DataModeSchema).min(1),
  provenance_note: z.string().min(1),
});

export type FixtureSummary = z.infer<typeof FixtureSummarySchema>;

export const FixturesResponseSchema = z.object({
  fixtures: z.array(FixtureSummarySchema),
});

export type FixturesResponse = z.infer<typeof FixturesResponseSchema>;

export const GenerateRequestSchema = z.object({
  fixture_id: FixtureIdSchema,
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const RunResultSchema = z.object({
  run_id: RunIdSchema,
  fixture_id: FixtureIdSchema,
  evidence_snapshot_id: SnapshotIdSchema,
  as_of: TimestampSchema,
  recommendations: z.array(RecommendationSchema).max(3),
  /** The full evidence set, so the drawer can resolve any cited ID offline. */
  evidence: z.array(EvidenceItemSchema),
  /** Explains a short or empty recommendation list. */
  abstention_note: z.string().min(1).nullable(),
  warnings: z.array(WarningSchema).default([]),
  telemetry: TelemetrySchema,
});

export type RunResult = z.infer<typeof RunResultSchema>;

export const AvailabilityOverrideSchema = z.object({
  player_id: PlayerIdSchema,
  availability: AvailabilitySchema,
});

export type AvailabilityOverride = z.infer<typeof AvailabilityOverrideSchema>;

export const ScenarioRequestSchema = z.object({
  run_id: RunIdSchema,
  scenario_id: ScenarioIdSchema,
  availability_overrides: z.array(AvailabilityOverrideSchema).min(1),
});

export type ScenarioRequest = z.infer<typeof ScenarioRequestSchema>;

/**
 * Note `evidence_snapshot_id`: it is the *same* value as the parent run's. A
 * differing snapshot ID on a scenario result means the base run was disturbed,
 * which is the failure the immutability tests look for.
 */
export const ScenarioResultSchema = z.object({
  run_id: RunIdSchema,
  parent_run_id: RunIdSchema,
  scenario_id: ScenarioIdSchema,
  evidence_snapshot_id: SnapshotIdSchema,
  applied_assumptions: z.array(AvailabilityAssumptionSchema).min(1),
  recommendations: z.array(RecommendationSchema).max(3),
  changes: z.array(ChangeSchema),
  /** Withdrawn advice, retained so its evidence stays inspectable. */
  withdrawn_recommendations: z.array(RecommendationSchema).default([]),
  evidence: z.array(EvidenceItemSchema),
  abstention_note: z.string().min(1).nullable(),
  warnings: z.array(WarningSchema).default([]),
  telemetry: TelemetrySchema,
});

export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

/* ------------------------------------------------------------------------- *
 * Referential integrity
 *
 * Schema validation proves a reference is well-formed. These functions prove it
 * resolves. Both are needed: `ev_not_real` is a valid evidence ID and a
 * fabricated citation.
 * ------------------------------------------------------------------------- */

export interface IntegrityProblem {
  readonly kind:
    | 'unknown_evidence_id'
    | 'unknown_player_id'
    | 'unknown_dependency_id'
    | 'unknown_prior_recommendation_id'
    | 'duplicate_recommendation_id';
  readonly reference: string;
  readonly location: string;
  readonly message: string;
}

interface IntegrityInput {
  readonly recommendations: readonly Recommendation[];
  readonly evidence: readonly EvidenceItem[];
  readonly players?: readonly ClubPlayer[];
  readonly constraints?: readonly StaffConstraint[];
  /** Recommendation IDs from the parent run a scenario may cite. */
  readonly priorRecommendationIds?: readonly string[];
}

/**
 * Reject claims that cite evidence the run does not carry, actions naming
 * unknown players, and scenario revisions pointing at recommendations that never
 * existed in the parent run.
 */
export function checkReferentialIntegrity(input: IntegrityInput): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];

  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  const playerIds = new Set((input.players ?? []).map((player) => player.id));
  const constraintIds = new Set((input.constraints ?? []).map((constraint) => constraint.id));
  const priorIds = new Set(input.priorRecommendationIds ?? []);
  const seenRecommendationIds = new Set<string>();

  for (const recommendation of input.recommendations) {
    const where = `recommendation ${recommendation.id}`;

    if (seenRecommendationIds.has(recommendation.id)) {
      problems.push({
        kind: 'duplicate_recommendation_id',
        reference: recommendation.id,
        location: where,
        message: `Recommendation ID ${recommendation.id} appears more than once.`,
      });
    }
    seenRecommendationIds.add(recommendation.id);

    for (const evidenceId of recommendation.evidence_ids) {
      if (!evidenceIds.has(evidenceId)) {
        problems.push({
          kind: 'unknown_evidence_id',
          reference: evidenceId,
          location: `${where}.evidence_ids`,
          message: `Cites evidence ${evidenceId}, which is not in this run's evidence set.`,
        });
      }
    }

    for (const action of recommendation.player_actions) {
      if (playerIds.size > 0 && !playerIds.has(action.player_id)) {
        problems.push({
          kind: 'unknown_player_id',
          reference: action.player_id,
          location: `${where}.player_actions`,
          message: `Proposes an action for ${action.player_id}, who is not in the squad.`,
        });
      }
    }

    for (const dependency of recommendation.depends_on) {
      const known =
        evidenceIds.has(dependency) ||
        playerIds.has(dependency) ||
        constraintIds.has(dependency) ||
        seenRecommendationIds.has(dependency);
      if (!known) {
        problems.push({
          kind: 'unknown_dependency_id',
          reference: dependency,
          location: `${where}.depends_on`,
          message: `Depends on ${dependency}, which is not a known evidence, player or constraint ID.`,
        });
      }
    }

    const prior = recommendation.prior_recommendation_id;
    if (prior !== null && input.priorRecommendationIds !== undefined && !priorIds.has(prior)) {
      problems.push({
        kind: 'unknown_prior_recommendation_id',
        reference: prior,
        location: `${where}.prior_recommendation_id`,
        message: `Claims to revise ${prior}, which is not a recommendation of the parent run.`,
      });
    }
  }

  return problems;
}

/* ------------------------------------------------------------------------- *
 * Fabricated-confidence guard
 * ------------------------------------------------------------------------- */

const FABRICATED_FIELD_PATTERN =
  /\b(confidence|probability|likelihood|certainty|success_rate|win_chance|risk_score|injury_risk)\b/i;

/**
 * The schema has no place to put a confidence score, but a model can still bury
 * one in prose ("78% confidence"). This catches both the stray key and the
 * percentage-in-a-sentence, so the repair loop can ask for it to be removed.
 */
export function findFabricatedConfidence(value: unknown, path = '$'): string[] {
  const hits: string[] = [];

  if (typeof value === 'string') {
    if (/\b\d{1,3}(\.\d+)?\s?%/.test(value) && FABRICATED_FIELD_PATTERN.test(value)) {
      hits.push(`${path}: states a numeric confidence ("${value.slice(0, 80)}")`);
    }
    return hits;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => hits.push(...findFabricatedConfidence(entry, `${path}[${index}]`)));
    return hits;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (FABRICATED_FIELD_PATTERN.test(key)) {
        hits.push(`${path}.${key}: field is not permitted; this system does not produce calibrated scores`);
      }
      hits.push(...findFabricatedConfidence(entry, `${path}.${key}`));
    }
  }

  return hits;
}

/** Throwing variant, for use at trust boundaries where a hit is a bug. */
export function assertNoFabricatedConfidence(value: unknown): void {
  const hits = findFabricatedConfidence(value);
  if (hits.length > 0) {
    throw new Error(`Fabricated confidence detected:\n${hits.map((hit) => `  - ${hit}`).join('\n')}`);
  }
}

/* ------------------------------------------------------------------------- *
 * Constraint enforcement
 *
 * These run in code after generation. A model asserting that it respected a
 * limit is not evidence that it did.
 * ------------------------------------------------------------------------- */

export interface ConstraintViolation {
  readonly kind: 'unavailable_player' | 'exceeds_supplied_minutes';
  readonly recommendation_id: string;
  readonly player_id: string;
  readonly message: string;
}

/**
 * Check proposed player actions against availability and staff-supplied limits.
 *
 * `monitor` is not blocked: it is uncertainty, and the recommendation is
 * expected to acknowledge it rather than be withheld.
 */
export function findConstraintViolations(
  recommendations: readonly Recommendation[],
  players: readonly ClubPlayer[],
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const byId = new Map(players.map((player) => [player.id, player]));

  for (const recommendation of recommendations) {
    if (recommendation.status === 'withdrawn') continue;

    for (const action of recommendation.player_actions) {
      const player = byId.get(action.player_id);
      if (player === undefined) continue;

      if (player.availability === 'unavailable') {
        violations.push({
          kind: 'unavailable_player',
          recommendation_id: recommendation.id,
          player_id: player.id,
          message: `${player.display_name} is unavailable, so this action cannot be proposed.`,
        });
      }

      const limit = player.staff_constraint?.max_minutes ?? null;
      if (limit !== null && action.planned_minutes !== null && action.planned_minutes > limit) {
        violations.push({
          kind: 'exceeds_supplied_minutes',
          recommendation_id: recommendation.id,
          player_id: player.id,
          message: `Proposes ${action.planned_minutes} minutes for ${player.display_name}, above the staff-supplied limit of ${limit}.`,
        });
      }
    }
  }

  return violations;
}
