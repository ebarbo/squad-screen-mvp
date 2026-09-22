/**
 * The demo fixture (EWE-62).
 *
 * This is a **historical replay with a documented information cutoff**, not a
 * live fixture. The two clubs are explicitly fictional so that synthetic squad
 * records — availability, minute limits, capability observations — cannot be
 * read as claims about any real person. That matters more than realism here:
 * the project forbids implying medical facts about real players, and the
 * cleanest way to honour that is for the people in the packet not to exist.
 *
 * The public-source layer is different: it carries real URLs, excerpts and
 * retrieval dates, and is labeled `snapshot`. The UI distinguishes the two.
 */
import type { Fixture, Team } from '@/domain/contracts';

export const OWN_TEAM: Team = {
  id: 'tm_northgate',
  name: 'Northgate Rovers',
  is_fictional: true,
};

export const OPPONENT_TEAM: Team = {
  id: 'tm_clifton',
  name: 'Clifton Park FC',
  is_fictional: true,
};

export const FIXTURE_ID = 'fx_northgate_clifton_2026_09_26';

/**
 * The instant past which nothing may enter the packet. Everything in
 * `data/sources/` is checked against this, so a late-breaking observation
 * cannot silently improve the demo.
 */
export const INFORMATION_CUTOFF = '2026-09-22T08:00:00Z';

export const AS_OF = '2026-09-22T08:30:00Z';

export const DEMO_FIXTURE: Fixture = {
  id: FIXTURE_ID,
  competition: 'Second Tier (replay scenario)',
  kickoff_at: '2026-09-26T14:00:00Z',
  home_team: OWN_TEAM,
  away_team: OPPONENT_TEAM,
  venue: 'Northgate Park',
  information_cutoff: INFORMATION_CUTOFF,
  provenance_note:
    'Historical replay built for the hackathon demo. Both clubs are fictional; squad records are synthetic. ' +
    'Public-context items are real dated snapshots retained with their URL and excerpt. ' +
    'Nothing observed after the information cutoff enters this packet.',
  data_modes: ['synthetic', 'snapshot'],
};
