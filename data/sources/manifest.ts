/**
 * Source manifest (EWE-62).
 *
 * One entry per connector, recording what it is, how its data may be used, and
 * what its limits are. The `data_mode` column is what the UI badges read from,
 * and it is the difference between "a coach wrote this down" and "a wire
 * service published this".
 */
import type { DataMode } from '@/domain/contracts';

export interface SourceManifestEntry {
  readonly connector: string;
  readonly display_name: string;
  readonly data_mode: DataMode;
  readonly description: string;
  /** What this source is not, and must not be presented as. */
  readonly limitations: string;
  readonly usage_context: string;
}

export const SOURCE_MANIFEST: readonly SourceManifestEntry[] = [
  {
    connector: 'staff_log',
    display_name: 'Coaching staff log (synthetic)',
    data_mode: 'synthetic',
    description:
      'Availability, staff-supplied minute limits and capability observations for the fictional Northgate Rovers squad.',
    limitations:
      'Entirely fictional. Contains no medical information and describes no real person. A minute limit is recorded ' +
      'as the staff stated it; the system does not derive a safe playing time.',
    usage_context: 'Private squad context. Never included in any public query.',
  },
  {
    connector: 'analyst_notes',
    display_name: 'Opposition analyst notes (synthetic)',
    data_mode: 'synthetic',
    description: 'Bounded opponent observations drawn from a stated number of reviewed matches.',
    limitations:
      'Two-match samples. Descriptive of what was observed in those matches only, and not a claim about the ' +
      'opponent’s general tendencies.',
    usage_context: 'Private analysis context. Never included in any public query.',
  },
  {
    connector: 'public_context',
    display_name: 'Public source snapshot',
    data_mode: 'snapshot',
    description:
      'Dated public items retained with outlet, URL, excerpt, publication date where stated, and retrieval date.',
    limitations:
      'A snapshot taken before the information cutoff. It is not a live feed, and the demo must not present it as one. ' +
      'Items sharing an origin_id are one source, not several. Illustrative snapshots use the reserved example.invalid ' +
      'domain rather than reproducing third-party content.',
    usage_context: 'Public fixture and opponent context only.',
  },
];
