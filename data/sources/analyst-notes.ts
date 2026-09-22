/**
 * Bounded opponent observations (EWE-62).
 *
 * Every note states how many matches it was drawn from. That number is carried
 * through to the derived metric's `sample_size`, so a two-match pattern is
 * presented as a two-match pattern rather than as a tendency. The demo's whole
 * argument depends on a reviewer being able to see how thin the evidence is.
 */
import type { AnalystNoteRecord } from './types';

export const ANALYST_ORIGIN = 'org_northgate_analyst';

export const ANALYST_NOTE_RECORDS: readonly AnalystNoteRecord[] = [
  {
    connector: 'analyst_notes',
    record_id: 'note-2026-09-19-clifton-leftback',
    origin_id: ANALYST_ORIGIN,
    subject_team_id: 'tm_clifton',
    subject_player_id: 'pl_clifton_marsh',
    text:
      'Clifton left-back (Marsh) advanced beyond the halfway line in 14 of 18 opponent build-up sequences across the ' +
      'two matches reviewed. Recovery runs were slow on both transitions conceded. No cover shuffle from the centre-backs.',
    observed_at: '2026-09-19T16:00:00Z',
    matches_sampled: 2,
    value: { high_positions: 14, build_ups_reviewed: 18, side: 'left' },
  },
  {
    connector: 'analyst_notes',
    record_id: 'note-2026-09-19-clifton-press',
    origin_id: ANALYST_ORIGIN,
    subject_team_id: 'tm_clifton',
    subject_player_id: null,
    text:
      'Clifton pressed in a mid-block in both matches reviewed, engaging around the halfway line rather than high. ' +
      'Central lanes were compact; the press did not follow play into wide areas quickly.',
    observed_at: '2026-09-19T16:20:00Z',
    matches_sampled: 2,
    value: { block: 'mid', engagement_zone: 'halfway' },
  },
  {
    connector: 'analyst_notes',
    record_id: 'note-2026-09-19-clifton-setpieces',
    origin_id: ANALYST_ORIGIN,
    subject_team_id: 'tm_clifton',
    subject_player_id: null,
    text:
      'Clifton defended corners zonally in both matches reviewed. Two headed clearances fell inside the penalty area ' +
      'to an unmarked edge-of-box position.',
    observed_at: '2026-09-19T16:35:00Z',
    matches_sampled: 2,
    value: { corner_scheme: 'zonal', second_balls_conceded: 2 },
  },

  // The irrelevant-change control. This note is real, dated and accurate, and
  // it has no bearing on the wide-channel decision. Toggling it must not
  // rewrite the actionable content of unrelated advice — that stability is what
  // the evaluation harness measures.
  {
    connector: 'analyst_notes',
    record_id: 'note-2026-09-18-clifton-kit',
    origin_id: ANALYST_ORIGIN,
    subject_team_id: 'tm_clifton',
    subject_player_id: null,
    text: 'Clifton confirmed to wear their change kit. Warm-up routine unchanged from previous away fixtures.',
    observed_at: '2026-09-18T12:00:00Z',
    matches_sampled: 1,
    value: { kit: 'change' },
  },
];
