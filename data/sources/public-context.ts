/**
 * Dated public snapshots (EWE-62).
 *
 * Two things are being set up here on purpose.
 *
 * **Shared origin.** `pub-regional-marsh-fit` and `pub-aggregator-marsh-fit` are
 * two outlets carrying the same agency copy, and they share
 * `org_agency_wire_2026_09_21`. A naive counter would read them as two
 * independent confirmations. The normalizer collapses them to one, which is the
 * behaviour EWE-64's first acceptance criterion checks.
 *
 * **Unresolved conflict.** The agency copy says Marsh trained fully; the older
 * club statement says he was a doubt. There is no authority rule that settles
 * this, so both stay visible and the disagreement is surfaced rather than
 * averaged into a confidence number.
 *
 * URLs use the reserved `example.invalid` domain: these are illustrative
 * snapshots carrying real structure, not scraped third-party content, and
 * labeling them as anything else would be the kind of overclaim this project
 * exists to avoid.
 */
import type { PublicContextRecord } from './types';

export const AGENCY_ORIGIN = 'org_agency_wire_2026_09_21';
export const CLUB_ORIGIN = 'org_clifton_club_statement';

export const PUBLIC_CONTEXT_RECORDS: readonly PublicContextRecord[] = [
  {
    connector: 'public_context',
    record_id: 'pub-regional-marsh-fit',
    origin_id: AGENCY_ORIGIN,
    outlet: 'Regional Sports Wire',
    url: 'https://regional-sports-wire.example.invalid/clifton-team-news-2026-09-21',
    title: 'Clifton Park report a clean bill of health ahead of the weekend',
    excerpt:
      'Clifton Park manager confirmed that full-back Marsh completed full training on Sunday and is expected to be ' +
      'available for the weekend fixture.',
    published_at: '2026-09-21T18:30:00Z',
    retrieved_at: '2026-09-22T07:55:00Z',
    subject_team_id: 'tm_clifton',
    subject_player_id: 'pl_clifton_marsh',
  },
  {
    connector: 'public_context',
    record_id: 'pub-aggregator-marsh-fit',
    origin_id: AGENCY_ORIGIN,
    outlet: 'Matchday Aggregator',
    url: 'https://matchday-aggregator.example.invalid/news/clifton-2026-09-21',
    title: 'Clifton Park team news round-up',
    excerpt:
      'Clifton Park manager confirmed that full-back Marsh completed full training on Sunday and is expected to be ' +
      'available for the weekend fixture.',
    published_at: '2026-09-21T20:05:00Z',
    retrieved_at: '2026-09-22T07:56:00Z',
    subject_team_id: 'tm_clifton',
    subject_player_id: 'pl_clifton_marsh',
  },
  {
    connector: 'public_context',
    record_id: 'pub-club-marsh-doubt',
    origin_id: CLUB_ORIGIN,
    outlet: 'Clifton Park FC official site',
    url: 'https://clifton-park-fc.example.invalid/news/injury-update-2026-09-19',
    title: 'Squad update ahead of a busy week',
    excerpt:
      'Marsh sat out Thursday’s session and will be assessed later in the week. The club will provide a further update ' +
      'before the weekend.',
    published_at: '2026-09-19T09:00:00Z',
    retrieved_at: '2026-09-22T07:57:00Z',
    subject_team_id: 'tm_clifton',
    subject_player_id: 'pl_clifton_marsh',
  },
  {
    connector: 'public_context',
    record_id: 'pub-league-fixture-listing',
    origin_id: 'org_league_listing',
    outlet: 'League fixture listing',
    url: 'https://league-listing.example.invalid/fixtures/2026-09-26',
    title: 'Fixture listing — matchday 8',
    excerpt: 'Northgate Rovers v Clifton Park FC, Saturday 26 September, 14:00, Northgate Park.',
    published_at: null,
    retrieved_at: '2026-09-22T07:58:00Z',
    subject_team_id: 'tm_clifton',
    subject_player_id: null,
  },
];
