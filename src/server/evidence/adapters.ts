/**
 * Source adapters (EWE-64).
 *
 * Each connector's raw records become `EvidenceItem`s carrying their source,
 * exact excerpt and dates. Adapters do not judge: they translate. Status starts
 * at `unverified` and is decided by the rules in `rules.ts`, so that the
 * decision about what to believe lives in one auditable place rather than being
 * scattered across three translators.
 *
 * Source text is treated as data throughout. Nothing here interprets an excerpt
 * as an instruction.
 */
import type {
  Availability,
  DataMode,
  EvidenceCategory,
  EvidenceItem,
  EvidenceValue,
  SubjectType,
} from '@/domain/contracts';
import type {
  AnalystNoteRecord,
  PublicContextRecord,
  SourceRecord,
  StaffLogRecord,
} from '~/data/sources/types';

/**
 * Derive a contract-shaped evidence ID from a connector's record ID.
 *
 * The mapping is deterministic so that the same record always produces the same
 * evidence ID — which is what lets a snapshot be reproducible and a citation be
 * checked against its origin.
 */
export function toEvidenceId(recordId: string): string {
  const slug = recordId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `ev_${slug}`;
}

export interface AdapterContext {
  readonly fixtureId: string;
  readonly informationCutoff: string;
  readonly retrievedAt: string;
}

/** A record observed after the cutoff must not enter the packet. */
export function isWithinCutoff(observedAt: string, cutoff: string): boolean {
  return new Date(observedAt).getTime() <= new Date(cutoff).getTime();
}

function base(
  id: string,
  context: AdapterContext,
  fields: {
    subjectType: SubjectType;
    subjectId: string | null;
    category: EvidenceCategory;
    claim: string;
    value: EvidenceValue;
    dataMode: DataMode;
    observedAt: string;
    publishedAt: string | null;
    source: EvidenceItem['source'];
  },
): EvidenceItem {
  return {
    id,
    fixture_id: context.fixtureId,
    subject_type: fields.subjectType,
    subject_id: fields.subjectId,
    category: fields.category,
    claim: fields.claim,
    value: fields.value,
    source: fields.source,
    observed_at: fields.observedAt,
    published_at: fields.publishedAt,
    retrieved_at: context.retrievedAt,
    valid_for_fixture: true,
    data_mode: fields.dataMode,
    status: 'unverified',
    conflicts_with: [],
    check_notes: 'Not yet evaluated.',
  };
}

const STAFF_CATEGORY: Record<StaffLogRecord['kind'], EvidenceCategory> = {
  availability: 'availability',
  minutes_limit: 'constraint',
  capability: 'capability',
};

export function adaptStaffLogRecord(record: StaffLogRecord, context: AdapterContext): EvidenceItem {
  return base(toEvidenceId(record.record_id), context, {
    subjectType: 'player',
    subjectId: record.player_id,
    category: STAFF_CATEGORY[record.kind],
    claim: record.text,
    value: record.value,
    dataMode: 'synthetic',
    observedAt: record.recorded_at,
    // A private log entry has no publication date, and inventing one would put a
    // fabricated timestamp next to a real excerpt.
    publishedAt: null,
    source: {
      name: 'Coaching staff log (synthetic)',
      connector: record.connector,
      url: null,
      record_id: record.record_id,
      excerpt: record.text,
      origin_id: record.origin_id,
    },
  });
}

export function adaptAnalystNoteRecord(record: AnalystNoteRecord, context: AdapterContext): EvidenceItem {
  const isSetPiece = record.value !== null && 'corner_scheme' in record.value;

  return base(toEvidenceId(record.record_id), context, {
    subjectType: record.subject_player_id === null ? 'opponent' : 'player',
    subjectId: record.subject_player_id ?? record.subject_team_id,
    category: isSetPiece ? 'set_piece' : 'tactical_observation',
    claim: record.text,
    value:
      record.value === null
        ? { matches_sampled: record.matches_sampled }
        : { ...record.value, matches_sampled: record.matches_sampled },
    dataMode: 'synthetic',
    observedAt: record.observed_at,
    publishedAt: null,
    source: {
      name: 'Opposition analyst notes (synthetic)',
      connector: record.connector,
      url: null,
      record_id: record.record_id,
      excerpt: record.text,
      origin_id: record.origin_id,
    },
  });
}

export function adaptPublicContextRecord(record: PublicContextRecord, context: AdapterContext): EvidenceItem {
  const isAvailability = /training|available|assessed|injur|doubt|sat out/i.test(record.excerpt);

  return base(toEvidenceId(record.record_id), context, {
    subjectType: record.subject_player_id === null ? 'opponent' : 'player',
    subjectId: record.subject_player_id ?? record.subject_team_id,
    category: isAvailability ? 'availability' : 'context',
    claim: record.title,
    value: null,
    dataMode: 'snapshot',
    // Where no publication date is stated, retrieval time is the only instant we
    // actually observed. Using it here keeps `published_at` honestly null.
    observedAt: record.published_at ?? record.retrieved_at,
    publishedAt: record.published_at,
    source: {
      name: record.outlet,
      connector: record.connector,
      url: record.url,
      record_id: null,
      excerpt: record.excerpt,
      origin_id: record.origin_id,
    },
  });
}

export interface AdaptResult {
  readonly evidence: readonly EvidenceItem[];
  /** Records excluded because they fall after the information cutoff. */
  readonly excludedAfterCutoff: readonly string[];
}

export function adaptRecords(records: readonly SourceRecord[], context: AdapterContext): AdaptResult {
  const evidence: EvidenceItem[] = [];
  const excludedAfterCutoff: string[] = [];

  for (const record of records) {
    const observedAt =
      record.connector === 'staff_log'
        ? record.recorded_at
        : record.connector === 'analyst_notes'
          ? record.observed_at
          : (record.published_at ?? record.retrieved_at);

    if (!isWithinCutoff(observedAt, context.informationCutoff)) {
      excludedAfterCutoff.push(record.record_id);
      continue;
    }

    switch (record.connector) {
      case 'staff_log':
        evidence.push(adaptStaffLogRecord(record, context));
        break;
      case 'analyst_notes':
        evidence.push(adaptAnalystNoteRecord(record, context));
        break;
      case 'public_context':
        evidence.push(adaptPublicContextRecord(record, context));
        break;
    }
  }

  return { evidence, excludedAfterCutoff };
}

/** Read the availability a staff record asserts, if it asserts one. */
export function readAvailability(item: EvidenceItem): Availability | null {
  if (item.category !== 'availability') return null;

  if (item.value !== null && typeof item.value === 'object' && 'availability' in item.value) {
    const raw = item.value.availability;
    if (raw === 'available' || raw === 'unavailable' || raw === 'monitor') return raw;
  }

  // Public prose carries no structured value, so the claim is read from the
  // excerpt. The match is deliberately narrow: an unrecognised phrasing yields
  // null and the item stays uninterpreted rather than being guessed at.
  const text = item.source.excerpt.toLowerCase();
  if (/sat out|will be assessed|doubt|unavailable/.test(text)) return 'monitor';
  if (/completed full training|is expected to be available|available for selection/.test(text)) return 'available';
  return null;
}
