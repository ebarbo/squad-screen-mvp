/**
 * Roster identity for the fictional Northgate Rovers squad (EWE-62).
 *
 * Identity only — name, position, ID. Availability, minute limits and
 * capabilities are *not* here: they come from the staff log through the evidence
 * adapters, so that every piece of squad state in the briefing traces back to a
 * dated record somebody wrote, rather than to a hardcoded field.
 *
 * All players are fictional.
 */
import type { Position } from '@/domain/contracts';

export interface RosterEntry {
  readonly id: string;
  readonly display_name: string;
  readonly position: Position;
}

/** The player the demo's what-if removes. */
export const PLAYER_A_ID = 'pl_rivers';

export const NORTHGATE_ROSTER: readonly RosterEntry[] = [
  { id: 'pl_rivers', display_name: 'A. Rivers', position: 'FW' },
  { id: 'pl_okonkwo', display_name: 'T. Okonkwo', position: 'MF' },
  { id: 'pl_hale', display_name: 'D. Hale', position: 'DF' },
  { id: 'pl_vance', display_name: 'R. Vance', position: 'FW' },
];

/** Opponent players referenced by analyst notes and public items. */
export const CLIFTON_ROSTER: readonly RosterEntry[] = [
  { id: 'pl_clifton_marsh', display_name: 'J. Marsh', position: 'DF' },
];
