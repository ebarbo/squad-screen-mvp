/**
 * Normalized stand-in contexts for the evaluation harness.
 *
 * **This is not the demo packet and it is not evidence normalization.** The
 * curated source records live in `data/demo` and `data/sources` (EWE-62) as
 * deliberately *raw* records; turning them into `EvidenceItem`s — entity
 * resolution, origin deduplication, staleness and conflict rules — is EWE-64's
 * job, and duplicating that here would mean the harness tested its own
 * normalizer instead of the product's.
 *
 * What this file provides is a hand-authored normalized context that mirrors
 * the curated packet's identities and its two load-bearing properties, so the
 * harness, the checks and the report can be verified before EWE-64 exists.
 * `evals/packet/index.ts` prefers the real normalized context the moment one is
 * available, and every report names which was used.
 *
 * The properties mirrored from EWE-62, deliberately and not by coincidence:
 *   - Two outlets carry the same agency copy and share `org_clifton_wire`, so a
 *     naive counter reads one report as two independent corroborations.
 *   - The agency copy says Marsh trained fully while an older club statement
 *     calls him a doubt. No authority rule settles it. Both must stay visible.
 *
 * Both clubs are fictional and public-layer URLs use the reserved
 * `example.invalid` domain, so nothing here reads as a claim about a real
 * person or a real publication.
 */
import {
  type BaseMatchContext,
  type ClubPlayer,
  type EvidenceConflict,
  type EvidenceItem,
  type Fixture,
  type MissingInformation,
  type StaffConstraint,
  type Team,
} from '@/domain/contracts';

/** Identities are EWE-62's, so cases do not have to change when EWE-64 lands. */
export const FIXTURE_ID = 'fx_northgate_clifton_2026_09_26';
export const DEV_SNAPSHOT_ID = 'snap_eval_dev_001';
export const AS_OF = '2026-09-22T08:30:00Z';
const INFORMATION_CUTOFF = '2026-09-22T08:00:00Z';

const OWN_TEAM: Team = { id: 'tm_northgate', name: 'Northgate Rovers', is_fictional: true };
const OPPONENT_TEAM: Team = { id: 'tm_clifton', name: 'Clifton Park FC', is_fictional: true };

const FIXTURE: Fixture = {
  id: FIXTURE_ID,
  competition: 'Second Tier (replay scenario)',
  kickoff_at: '2026-09-26T14:00:00Z',
  home_team: OWN_TEAM,
  away_team: OPPONENT_TEAM,
  venue: 'Northgate Park',
  information_cutoff: INFORMATION_CUTOFF,
  provenance_note:
    'Harness stand-in for the EWE-62 replay packet, normalized by hand because EWE-64 has not landed. ' +
    'Both clubs are fictional; squad records are synthetic. Not the curated packet.',
  data_modes: ['synthetic', 'snapshot'],
};

type EvidenceSeed = Pick<EvidenceItem, 'id' | 'subject_type' | 'subject_id' | 'category' | 'claim'> &
  Partial<EvidenceItem>;

function staffRecord(seed: EvidenceSeed): EvidenceItem {
  return {
    fixture_id: FIXTURE_ID,
    value: null,
    observed_at: '2026-09-22T07:20:00Z',
    published_at: null,
    retrieved_at: '2026-09-22T08:00:00Z',
    valid_for_fixture: true,
    data_mode: 'synthetic',
    status: 'accepted',
    conflicts_with: [],
    check_notes: 'Staff-supplied record, carried through as written.',
    source: {
      name: 'Northgate staff log (synthetic)',
      connector: 'staff_log',
      url: null,
      record_id: seed.id.replace(/^ev_/, 'staff-'),
      excerpt: seed.claim,
      origin_id: 'org_northgate_staff',
    },
    ...seed,
  } as EvidenceItem;
}

/* -- Squad records -------------------------------------------------------- */

const RIVERS_AVAILABLE = staffRecord({
  id: 'ev_staff_rivers_availability',
  subject_type: 'player',
  subject_id: 'pl_rivers',
  category: 'availability',
  claim: 'A. Rivers available for this fixture, capped at 45 minutes.',
  value: { availability: 'available' },
});

const RIVERS_MINUTES = staffRecord({
  id: 'ev_staff_rivers_minutes',
  subject_type: 'player',
  subject_id: 'pl_rivers',
  category: 'constraint',
  claim: 'Staff set a maximum of 45 minutes for A. Rivers in this fixture.',
  value: { max_minutes: 45 },
  check_notes: 'Staff-supplied limit recorded as given. No clinical interpretation attached.',
});

const RIVERS_CAPABILITY = staffRecord({
  id: 'ev_staff_rivers_capability',
  subject_type: 'player',
  subject_id: 'pl_rivers',
  category: 'capability',
  claim: 'A. Rivers consistently won the outside channel in 1v1 work this week.',
  observed_at: '2026-09-21T10:00:00Z',
  check_notes: 'Supplied as an observation of this week, not a general claim about the player.',
});

/** The later record that contradicts the earlier one, used by the conflicting variant. */
const RIVERS_MONITOR = staffRecord({
  id: 'ev_staff_rivers_availability_revised',
  subject_type: 'player',
  subject_id: 'pl_rivers',
  category: 'availability',
  claim: 'A. Rivers to be monitored after reporting tightness in Monday\u2019s session. Status under review.',
  value: { availability: 'monitor' },
  observed_at: '2026-09-22T07:45:00Z',
  status: 'disputed',
  conflicts_with: ['ev_staff_rivers_availability'],
  check_notes:
    'Contradicts the earlier availability record. Recorded as reported; no medical interpretation of the tightness is attached.',
});

const OKONKWO_AVAILABLE = staffRecord({
  id: 'ev_staff_okonkwo_availability',
  subject_type: 'player',
  subject_id: 'pl_okonkwo',
  category: 'availability',
  claim: 'T. Okonkwo available for this fixture with no supplied limit.',
  value: { availability: 'available' },
});

const OKONKWO_CAPABILITY = staffRecord({
  id: 'ev_staff_okonkwo_capability',
  subject_type: 'player',
  subject_id: 'pl_okonkwo',
  category: 'capability',
  claim: 'T. Okonkwo broke the first line of pressure repeatedly in central rondo work.',
  observed_at: '2026-09-21T10:00:00Z',
});

const HALE_AVAILABLE = staffRecord({
  id: 'ev_staff_hale_availability',
  subject_type: 'player',
  subject_id: 'pl_hale',
  category: 'availability',
  claim: 'D. Hale available for this fixture with no supplied limit.',
  value: { availability: 'available' },
  check_notes: 'Availability only. No capability observation was supplied for this player.',
});

const VANCE_AVAILABLE = staffRecord({
  id: 'ev_staff_vance_availability',
  subject_type: 'player',
  subject_id: 'pl_vance',
  category: 'availability',
  claim: 'R. Vance available for this fixture with no supplied limit.',
  value: { availability: 'available' },
  check_notes: 'Availability only. No capability observation was supplied for this player.',
});

/* -- Opponent observations ------------------------------------------------ */

const CLIFTON_LEFTBACK = staffRecord({
  id: 'ev_note_clifton_leftback',
  subject_type: 'opponent',
  subject_id: OPPONENT_TEAM.id,
  category: 'tactical_observation',
  claim:
    'Clifton\u2019s left-back advanced beyond halfway in 14 of 18 recorded build-ups across two matches, with slow recovery runs on both transitions conceded.',
  value: { sample_matches: 2, side: 'left', advanced_build_ups: 14, total_build_ups: 18 },
  observed_at: '2026-09-19T16:00:00Z',
  source: {
    name: 'Northgate analyst match notes (synthetic)',
    connector: 'analyst_notes',
    url: null,
    record_id: 'note-2026-09-19-clifton-leftback',
    excerpt:
      'Left-back advanced beyond the halfway line in 14 of 18 build-ups; recovery runs slow on both transitions conceded.',
    origin_id: 'org_northgate_analyst',
  },
  check_notes: 'Two-match sample; the sample size is preserved on the record rather than generalised.',
});

/** Accurate, dated and entirely irrelevant to the decision. */
const CLIFTON_KIT = staffRecord({
  id: 'ev_note_clifton_kit',
  subject_type: 'opponent',
  subject_id: OPPONENT_TEAM.id,
  category: 'context',
  claim: 'Clifton are expected to wear their away kit.',
  value: { kit: 'away' },
  observed_at: '2026-09-18T13:00:00Z',
  source: {
    name: 'Northgate analyst match notes (synthetic)',
    connector: 'analyst_notes',
    url: null,
    record_id: 'note-2026-09-18-clifton-kit',
    excerpt: 'Clifton expected in their away kit. Warm-up routine unchanged from previous away fixtures.',
    origin_id: 'org_northgate_analyst',
  },
});

const CLIFTON_KIT_REVISED = staffRecord({
  id: 'ev_note_clifton_kit_revised',
  subject_type: 'opponent',
  subject_id: OPPONENT_TEAM.id,
  category: 'context',
  claim: 'Clifton are confirmed to wear their home kit.',
  value: { kit: 'home' },
  observed_at: '2026-09-18T13:00:00Z',
  source: {
    name: 'Northgate analyst match notes (synthetic)',
    connector: 'analyst_notes',
    url: null,
    record_id: 'note-2026-09-18-clifton-kit-revised',
    excerpt: 'Clifton confirmed to wear their home kit. Warm-up routine unchanged from previous away fixtures.',
    origin_id: 'org_northgate_analyst',
  },
});

/* -- Public layer: one agency report, two outlets, and a club statement ---- */

const MARSH_AGENCY = staffRecord({
  id: 'ev_public_marsh_agency',
  subject_type: 'player',
  subject_id: 'pl_clifton_marsh',
  category: 'availability',
  claim: 'J. Marsh trained fully on Monday and is expected to be available.',
  data_mode: 'snapshot',
  status: 'disputed',
  conflicts_with: ['ev_public_marsh_club_statement'],
  observed_at: '2026-09-21T11:00:00Z',
  published_at: '2026-09-21T11:00:00Z',
  source: {
    name: 'Clifton Wire (agency)',
    connector: 'public_snapshot',
    url: 'https://newswire.example.invalid/clifton/marsh-trains-fully',
    record_id: null,
    excerpt: 'Marsh took part in full training on Monday and is expected to be available for the weekend.',
    origin_id: 'org_clifton_wire',
  },
  check_notes:
    'Disagrees with the club statement. No documented freshness or authority rule resolves the two, so both stay visible.',
});

const MARSH_SYNDICATED = staffRecord({
  id: 'ev_public_marsh_syndicated',
  subject_type: 'player',
  subject_id: 'pl_clifton_marsh',
  category: 'availability',
  claim: 'J. Marsh trained fully on Monday and is expected to be available.',
  data_mode: 'snapshot',
  status: 'disputed',
  conflicts_with: ['ev_public_marsh_club_statement'],
  observed_at: '2026-09-21T15:00:00Z',
  published_at: '2026-09-21T15:00:00Z',
  source: {
    name: 'Regional Sport Daily (syndicating Clifton Wire)',
    connector: 'public_snapshot',
    url: 'https://regional.example.invalid/sport/marsh-set-to-feature',
    record_id: null,
    excerpt: 'Marsh took part in full training on Monday and is expected to be available for the weekend.',
    origin_id: 'org_clifton_wire',
  },
  check_notes:
    'Shares origin org_clifton_wire with ev_public_marsh_agency. One agency report republished, not independent corroboration.',
});

const MARSH_CLUB_STATEMENT = staffRecord({
  id: 'ev_public_marsh_club_statement',
  subject_type: 'player',
  subject_id: 'pl_clifton_marsh',
  category: 'availability',
  claim: 'Clifton listed J. Marsh as a doubt for the weekend.',
  data_mode: 'snapshot',
  status: 'disputed',
  conflicts_with: ['ev_public_marsh_agency', 'ev_public_marsh_syndicated'],
  observed_at: '2026-09-20T09:00:00Z',
  published_at: '2026-09-20T09:00:00Z',
  source: {
    name: 'Clifton Park FC official statement',
    connector: 'public_snapshot',
    url: 'https://cliftonpark.example.invalid/news/team-update',
    record_id: null,
    excerpt: 'Marsh remains a doubt for the weekend and will be assessed later in the week.',
    origin_id: 'org_clifton_club',
  },
  check_notes:
    'Older than the agency copy but issued by the club itself. Neither outranks the other under any documented rule.',
});

/* -- Squad ---------------------------------------------------------------- */

const RIVERS_CONSTRAINT: StaffConstraint = {
  id: 'con_rivers_minutes',
  player_id: 'pl_rivers',
  max_minutes: 45,
  note: 'Staff-supplied cap for this fixture.',
  evidence_ids: [RIVERS_MINUTES.id],
};

function squad(riversAvailability: ClubPlayer['availability'], riversEvidence: string[]): ClubPlayer[] {
  return [
    {
      id: 'pl_rivers',
      display_name: 'A. Rivers',
      position: 'FW',
      availability: riversAvailability,
      staff_constraint: RIVERS_CONSTRAINT,
      capabilities: [
        {
          label: 'Wide 1v1',
          detail: 'Wins the outside channel against a full-back.',
          evidence_ids: [RIVERS_CAPABILITY.id],
        },
      ],
      availability_evidence_ids: riversEvidence,
    },
    {
      id: 'pl_okonkwo',
      display_name: 'T. Okonkwo',
      position: 'MF',
      availability: 'available',
      staff_constraint: null,
      capabilities: [
        {
          label: 'Central progression',
          detail: 'Breaks the first line of pressure from central areas.',
          evidence_ids: [OKONKWO_CAPABILITY.id],
        },
      ],
      availability_evidence_ids: [OKONKWO_AVAILABLE.id],
    },
    // Available, with no capability observation and nothing depending on them.
    {
      id: 'pl_hale',
      display_name: 'D. Hale',
      position: 'DF',
      availability: 'available',
      staff_constraint: null,
      capabilities: [],
      availability_evidence_ids: [HALE_AVAILABLE.id],
    },
    {
      id: 'pl_vance',
      display_name: 'R. Vance',
      position: 'FW',
      availability: 'available',
      staff_constraint: null,
      capabilities: [],
      availability_evidence_ids: [VANCE_AVAILABLE.id],
    },
  ];
}

/* -- Contexts ------------------------------------------------------------- */

const DEDUP_GAP: MissingInformation = {
  topic: 'Independent corroboration of the Marsh availability report',
  detail:
    'ev_public_marsh_agency and ev_public_marsh_syndicated share origin org_clifton_wire. They are one agency report republished, so they do not corroborate each other.',
  would_be_resolved_by: 'A report from a second, unrelated origin.',
};

const MARSH_CONFLICT: EvidenceConflict = {
  evidence_ids: [MARSH_AGENCY.id, MARSH_SYNDICATED.id, MARSH_CLUB_STATEMENT.id],
  subject_id: 'pl_clifton_marsh',
  summary:
    'The agency copy says Marsh trained fully; the older club statement calls him a doubt. No documented freshness or authority rule settles which holds.',
  resolution: null,
};

const RIVERS_CONFLICT: EvidenceConflict = {
  evidence_ids: [RIVERS_AVAILABLE.id, RIVERS_MONITOR.id],
  subject_id: 'pl_rivers',
  summary:
    'Two staff records disagree about A. Rivers: the earlier one lists him available with a 45-minute cap, the later one puts him under review. Neither is authoritative over the other.',
  resolution: null,
};

const COMMON: EvidenceItem[] = [
  RIVERS_AVAILABLE,
  RIVERS_MINUTES,
  RIVERS_CAPABILITY,
  OKONKWO_AVAILABLE,
  OKONKWO_CAPABILITY,
  HALE_AVAILABLE,
  VANCE_AVAILABLE,
  CLIFTON_LEFTBACK,
  CLIFTON_KIT,
  MARSH_AGENCY,
  MARSH_SYNDICATED,
  MARSH_CLUB_STATEMENT,
];

function context(
  evidence: EvidenceItem[],
  overrides: Partial<BaseMatchContext> = {},
): BaseMatchContext {
  return {
    kind: 'base',
    fixture: FIXTURE,
    evidence_snapshot_id: DEV_SNAPSHOT_ID,
    as_of: AS_OF,
    own_team: { team: OWN_TEAM, players: squad('available', [RIVERS_AVAILABLE.id]) },
    opponent: {
      team: OPPONENT_TEAM,
      observations: evidence
        .filter((item) => item.subject_id === OPPONENT_TEAM.id || item.subject_id === 'pl_clifton_marsh')
        .map((item) => item.id),
      derived_metrics: [],
    },
    external_context: evidence.filter((item) => item.data_mode === 'snapshot').map((item) => item.id),
    evidence,
    constraints: [RIVERS_CONSTRAINT],
    conflicts: [MARSH_CONFLICT],
    missing_information: [DEDUP_GAP],
    ...overrides,
  };
}

/** The full packet: a supported wide-channel action exists and needs both halves of the evidence. */
export const completeEvidence = context(COMMON);

/** A later staff record contradicts the earlier one about Rivers. Neither is authoritative. */
export const conflictingAvailability = context([...COMMON, RIVERS_MONITOR], {
  own_team: { team: OWN_TEAM, players: squad('monitor', [RIVERS_AVAILABLE.id, RIVERS_MONITOR.id]) },
  conflicts: [MARSH_CONFLICT, RIVERS_CONFLICT],
});

/** The opponent left-back observation is removed; the wide-channel action loses its support. */
export const missingTacticalSupport = context(
  COMMON.filter((item) => item.id !== CLIFTON_LEFTBACK.id),
  {
    missing_information: [
      DEDUP_GAP,
      {
        topic: 'Clifton defensive shape',
        detail:
          'No bounded observation of Clifton full-back positioning is in this snapshot, so no claim about the space behind them is supported.',
        would_be_resolved_by: 'Analyst notes from a recent Clifton match.',
      },
    ],
  },
);

/** Rivers unavailable in the data itself, as EWE-62 supplies it. */
export const unavailablePlayerA = context(
  COMMON.map((item) =>
    item.id === RIVERS_AVAILABLE.id
      ? {
          ...item,
          claim: 'A. Rivers unavailable for this fixture.',
          value: { availability: 'unavailable' },
        }
      : item,
  ),
  { own_team: { team: OWN_TEAM, players: squad('unavailable', [RIVERS_AVAILABLE.id]) } },
);

/** The kit note changes. Accurate, dated, and irrelevant to the decision. */
export const irrelevantContextChange = context([
  ...COMMON.filter((item) => item.id !== CLIFTON_KIT.id),
  CLIFTON_KIT_REVISED,
]);

export const DEVELOPMENT_PACKET = {
  complete_evidence: completeEvidence,
  conflicting_availability: conflictingAvailability,
  missing_tactical_support: missingTacticalSupport,
  unavailable_player_a: unavailablePlayerA,
  irrelevant_context_change: irrelevantContextChange,
} as const;

export type PacketVariant = keyof typeof DEVELOPMENT_PACKET;
