/**
 * Synthetic coaching-staff records (EWE-62).
 *
 * Every person here is fictional. The records describe availability, a
 * staff-supplied minute limit, and capability observations — and nothing else.
 * There is no diagnosis, no medical status, and no "cleared to play" language,
 * because the system must not imply clinical judgement it cannot make.
 *
 * Note what a capability record is: an observation someone actually made, on a
 * date, written down. The system knows a player can do something only because a
 * coach recorded seeing it.
 */
import type { StaffLogRecord } from './types';

export const STAFF_ORIGIN = 'org_northgate_staff';

export const STAFF_LOG_RECORDS: readonly StaffLogRecord[] = [
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-22-availability-rivers',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_rivers',
    kind: 'availability',
    text: 'A. Rivers available for selection this weekend.',
    recorded_at: '2026-09-22T07:10:00Z',
    value: { availability: 'available' },
  },
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-22-minutes-rivers',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_rivers',
    kind: 'minutes_limit',
    text: 'A. Rivers capped at 45 minutes for this fixture. Staff decision, not to be exceeded.',
    recorded_at: '2026-09-22T07:12:00Z',
    value: { max_minutes: 45 },
  },
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-20-capability-rivers',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_rivers',
    kind: 'capability',
    text:
      'A. Rivers won the outside channel repeatedly in 1v1 work on Friday and again in Saturday possession games. ' +
      'Sharpest of the wide options this week.',
    recorded_at: '2026-09-20T11:00:00Z',
    value: { capability: 'wide_1v1', sessions_observed: 2 },
  },

  // The supported alternative. Deliberately weaker than Rivers: it is an
  // observation of a different action, so the system should propose it as a
  // trade-off rather than as a like-for-like replacement.
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-20-capability-okonkwo',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_okonkwo',
    kind: 'capability',
    text:
      'T. Okonkwo consistently found the forward pass between the lines in Friday rondo and the Saturday phase play. ' +
      'Not a wide option; progression comes through the middle.',
    recorded_at: '2026-09-20T11:05:00Z',
    value: { capability: 'central_progression', sessions_observed: 2 },
  },
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-22-availability-okonkwo',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_okonkwo',
    kind: 'availability',
    text: 'T. Okonkwo available for selection.',
    recorded_at: '2026-09-22T07:14:00Z',
    value: { availability: 'available' },
  },

  // Monitor status. This is uncertainty about availability and nothing more:
  // the briefing should acknowledge it, not treat it as a clearance either way.
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-22-availability-hale',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_hale',
    kind: 'availability',
    text: 'D. Hale to be monitored through the week. Decision at the Friday session.',
    recorded_at: '2026-09-22T07:16:00Z',
    value: { availability: 'monitor' },
  },

  // The missing-support case: a player with availability but no capability
  // observation at all. Any advice proposing a specific role for Vance is
  // unsupported, and the system is expected to say so rather than invent one.
  {
    connector: 'staff_log',
    record_id: 'staff-2026-09-22-availability-vance',
    origin_id: STAFF_ORIGIN,
    player_id: 'pl_vance',
    kind: 'availability',
    text: 'R. Vance available for selection.',
    recorded_at: '2026-09-22T07:18:00Z',
    value: { availability: 'available' },
  },
];
