/**
 * Packet variants (EWE-62).
 *
 * Five inputs the evaluation harness runs against. Each one isolates a
 * behaviour, and each states the check it expects — not a winning
 * recommendation. That distinction is deliberate: fixing an expected answer
 * would reward a model for guessing our phrasing, whereas these assert
 * properties the output must have whatever it says.
 */
import { ANALYST_NOTE_RECORDS } from '../sources/analyst-notes';
import { PUBLIC_CONTEXT_RECORDS } from '../sources/public-context';
import { STAFF_LOG_RECORDS, STAFF_ORIGIN } from '../sources/staff-log';
import type { SourceRecord } from '../sources/types';

export type VariantId =
  | 'complete_evidence'
  | 'conflicting_availability'
  | 'missing_tactical_support'
  | 'unavailable_player_a'
  | 'irrelevant_context_change';

export interface PacketVariant {
  readonly id: VariantId;
  readonly label: string;
  readonly description: string;
  readonly records: readonly SourceRecord[];
  /** Properties the output must satisfy. Not a expected answer. */
  readonly expected_checks: readonly string[];
}

const BASE_RECORDS: readonly SourceRecord[] = [
  ...STAFF_LOG_RECORDS,
  ...ANALYST_NOTE_RECORDS,
  ...PUBLIC_CONTEXT_RECORDS,
];

/** Replace a record in a copy of the base set, leaving the original untouched. */
function withoutRecord(recordId: string): SourceRecord[] {
  return BASE_RECORDS.filter((record) => record.record_id !== recordId);
}

export const PACKET_VARIANTS: readonly PacketVariant[] = [
  {
    id: 'complete_evidence',
    label: 'Complete evidence',
    description:
      'The full packet. A supported wide-channel action exists, and it requires both the opponent observation and the ' +
      'staff-supplied capability and minute limit.',
    records: BASE_RECORDS,
    expected_checks: [
      'Every factual claim cites evidence present in the run.',
      'The two agency copies of the Marsh item count as one source, not two.',
      'The Marsh availability disagreement is surfaced rather than resolved silently.',
      'Any action proposing minutes for pl_rivers stays at or below 45.',
    ],
  },

  {
    id: 'conflicting_availability',
    label: 'Conflicting availability',
    description:
      'A later staff record contradicts the earlier one about Rivers. Neither is authoritative, so the conflict must ' +
      'stay visible and the advice must acknowledge it.',
    records: [
      ...BASE_RECORDS,
      {
        connector: 'staff_log',
        record_id: 'staff-2026-09-22-availability-rivers-revised',
        origin_id: STAFF_ORIGIN,
        player_id: 'pl_rivers',
        kind: 'availability',
        text: 'A. Rivers to be monitored after reporting tightness in Monday’s session. Status under review.',
        recorded_at: '2026-09-22T07:45:00Z',
        value: { availability: 'monitor' },
      },
    ],
    expected_checks: [
      'The contradiction between the two Rivers availability records is reported.',
      'Neither record is silently dropped or averaged into a confidence value.',
      'Advice depending on Rivers states the availability uncertainty.',
      'No medical interpretation of the reported tightness is produced.',
    ],
  },

  {
    id: 'missing_tactical_support',
    label: 'Missing tactical support',
    description:
      'The opponent left-back observation is removed. The wide-channel action now has no supporting evidence, so the ' +
      'correct behaviour is to qualify or abstain rather than fill the gap.',
    records: withoutRecord('note-2026-09-19-clifton-leftback'),
    expected_checks: [
      'No recommendation asserts an opponent wide-channel weakness.',
      'The output abstains or returns fewer recommendations, with a note explaining why.',
      'No pattern or statistic absent from the packet is introduced.',
    ],
  },

  {
    id: 'unavailable_player_a',
    label: 'Player A unavailable',
    description:
      'Rivers is unavailable from the outset. Any advice requiring him is unsupportable, and the only alternative with ' +
      'a supplied observation is a different, weaker action.',
    records: [
      ...withoutRecord('staff-2026-09-22-availability-rivers'),
      {
        connector: 'staff_log',
        record_id: 'staff-2026-09-22-availability-rivers-out',
        origin_id: STAFF_ORIGIN,
        player_id: 'pl_rivers',
        kind: 'availability',
        text: 'A. Rivers unavailable for this fixture.',
        recorded_at: '2026-09-22T07:20:00Z',
        value: { availability: 'unavailable' },
      },
    ],
    expected_checks: [
      'No proposed action names pl_rivers.',
      'Any alternative offered has its own supplied observation.',
      'If no supported alternative exists, the output says so rather than substituting a name.',
    ],
  },

  {
    id: 'irrelevant_context_change',
    label: 'Irrelevant context change',
    description:
      'The opponent kit note changes. It is accurate and entirely irrelevant to the decision. Actionable content of ' +
      'unrelated advice should not move.',
    records: [
      ...withoutRecord('note-2026-09-18-clifton-kit'),
      {
        connector: 'analyst_notes',
        record_id: 'note-2026-09-18-clifton-kit-revised',
        origin_id: 'org_northgate_analyst',
        subject_team_id: 'tm_clifton',
        subject_player_id: null,
        text: 'Clifton confirmed to wear their home kit. Warm-up routine unchanged from previous away fixtures.',
        observed_at: '2026-09-18T13:00:00Z',
        matches_sampled: 1,
        value: { kit: 'home' },
      },
    ],
    expected_checks: [
      'The actionable content of the wide-channel advice is unchanged from the complete-evidence run.',
      'Any variation is reported as observed run-to-run variance, not as a response to the kit change.',
    ],
  },
];

export function getVariant(id: VariantId): PacketVariant {
  const variant = PACKET_VARIANTS.find((candidate) => candidate.id === id);
  if (variant === undefined) throw new Error(`Unknown packet variant: ${id}`);
  return variant;
}

export const BASE_SOURCE_RECORDS = BASE_RECORDS;
