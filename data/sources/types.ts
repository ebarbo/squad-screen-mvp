/**
 * Raw source records, as they arrive from each connector.
 *
 * These are deliberately *not* `EvidenceItem`s. Normalization — entity
 * resolution, deduplication by origin, staleness and conflict rules — is the
 * job of `src/server/evidence/` (EWE-64). Keeping the raw shape separate is
 * what makes that step testable: if the data files already contained finished
 * evidence, the adapters would have nothing to prove.
 *
 * Source text is untrusted data. It is never interpolated into a prompt as
 * instructions, and nothing in these records is executable.
 */

/** A private, synthetic record from the coaching staff. Fictional throughout. */
export interface StaffLogRecord {
  readonly connector: 'staff_log';
  readonly record_id: string;
  readonly origin_id: string;
  /** Player this record concerns, by stable ID. */
  readonly player_id: string;
  readonly kind: 'availability' | 'minutes_limit' | 'capability';
  /** Verbatim text as the staff wrote it. */
  readonly text: string;
  readonly recorded_at: string;
  /** Structured payload where the record carries one. */
  readonly value: Record<string, string | number | boolean | null> | null;
}

/** A bounded opponent observation from the opposition analyst. */
export interface AnalystNoteRecord {
  readonly connector: 'analyst_notes';
  readonly record_id: string;
  readonly origin_id: string;
  readonly subject_team_id: string;
  readonly subject_player_id: string | null;
  readonly text: string;
  readonly observed_at: string;
  /** How many matches the observation is drawn from. Carried into sample sizes. */
  readonly matches_sampled: number;
  readonly value: Record<string, string | number | boolean | null> | null;
}

/**
 * A dated public snapshot. `origin_id` identifies the *original* reporting: two
 * outlets carrying the same agency copy share one, which is how the normalizer
 * knows they are not independent corroboration.
 */
export interface PublicContextRecord {
  readonly connector: 'public_context';
  readonly record_id: string;
  readonly origin_id: string;
  readonly outlet: string;
  readonly url: string;
  readonly title: string;
  readonly excerpt: string;
  /** Null when the source states no publication date. Never inferred. */
  readonly published_at: string | null;
  readonly retrieved_at: string;
  readonly subject_team_id: string;
  readonly subject_player_id: string | null;
}

export type SourceRecord = StaffLogRecord | AnalystNoteRecord | PublicContextRecord;
