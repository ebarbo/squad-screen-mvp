/**
 * Bounded referee sample (EWE-78).
 *
 * Synthetic, documented match-level records for one competition window.
 * Totals and rates are computed in code — never by a model.
 */

export interface RefereeMatchRecord {
  readonly match_id: string;
  readonly competition: string;
  readonly played_at: string;
  readonly referee_id: string;
  readonly referee_name: string;
  readonly yellow_cards: number;
  readonly red_cards: number;
  readonly fouls: number;
  /** Penalties awarded in the match. Null when the source did not record them. */
  readonly penalties: number | null;
}

export const REFEREE_SAMPLE_WINDOW = {
  competition: 'Second Tier (replay scenario)',
  /** Inclusive window. Rates are only comparable inside this competition+window. */
  from: '2026-08-01',
  to: '2026-09-21',
  referee_id: 'rf_dale',
  referee_name: 'A. Dale',
  limitations:
    'Bounded synthetic sample for the demo fixture. Not a live referee feed. ' +
    'Rates are descriptive of this window only; they do not predict a future decision.',
} as const;

/**
 * Six matches under one referee in one competition. Deliberately small so
 * sample_size and coverage stay honest in the briefing.
 */
export const REFEREE_MATCH_SAMPLE: readonly RefereeMatchRecord[] = [
  {
    match_id: 'rm_2026_08_09',
    competition: REFEREE_SAMPLE_WINDOW.competition,
    played_at: '2026-08-09T14:00:00Z',
    referee_id: REFEREE_SAMPLE_WINDOW.referee_id,
    referee_name: REFEREE_SAMPLE_WINDOW.referee_name,
    yellow_cards: 3,
    red_cards: 0,
    fouls: 22,
    penalties: 0,
  },
  {
    match_id: 'rm_2026_08_16',
    competition: REFEREE_SAMPLE_WINDOW.competition,
    played_at: '2026-08-16T14:00:00Z',
    referee_id: REFEREE_SAMPLE_WINDOW.referee_id,
    referee_name: REFEREE_SAMPLE_WINDOW.referee_name,
    yellow_cards: 5,
    red_cards: 1,
    fouls: 28,
    penalties: 1,
  },
  {
    match_id: 'rm_2026_08_23',
    competition: REFEREE_SAMPLE_WINDOW.competition,
    played_at: '2026-08-23T14:00:00Z',
    referee_id: REFEREE_SAMPLE_WINDOW.referee_id,
    referee_name: REFEREE_SAMPLE_WINDOW.referee_name,
    yellow_cards: 2,
    red_cards: 0,
    fouls: 18,
    penalties: 0,
  },
  {
    match_id: 'rm_2026_08_30',
    competition: REFEREE_SAMPLE_WINDOW.competition,
    played_at: '2026-08-30T14:00:00Z',
    referee_id: REFEREE_SAMPLE_WINDOW.referee_id,
    referee_name: REFEREE_SAMPLE_WINDOW.referee_name,
    yellow_cards: 4,
    red_cards: 0,
    fouls: 25,
    penalties: null, // Unknown — excluded from penalty rate denominator.
  },
  {
    match_id: 'rm_2026_09_06',
    competition: REFEREE_SAMPLE_WINDOW.competition,
    played_at: '2026-09-06T14:00:00Z',
    referee_id: REFEREE_SAMPLE_WINDOW.referee_id,
    referee_name: REFEREE_SAMPLE_WINDOW.referee_name,
    yellow_cards: 6,
    red_cards: 0,
    fouls: 30,
    penalties: 0,
  },
  {
    match_id: 'rm_2026_09_13',
    competition: REFEREE_SAMPLE_WINDOW.competition,
    played_at: '2026-09-13T14:00:00Z',
    referee_id: REFEREE_SAMPLE_WINDOW.referee_id,
    referee_name: REFEREE_SAMPLE_WINDOW.referee_name,
    yellow_cards: 3,
    red_cards: 0,
    fouls: 21,
    penalties: 1,
  },
];
