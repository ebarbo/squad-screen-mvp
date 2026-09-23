/**
 * Bounded public-source allowlist (EWE-76).
 *
 * Only opponent-club official pages and competition/bond pages for the chosen
 * fixture may be refreshed. Named publishers are opt-in and labeled as
 * reporting, never confirmation. Social networks are not queried.
 */

export type SourceCategory = 'club' | 'organizer' | 'reporting';

export interface AllowlistedHost {
  readonly host: string;
  readonly category: SourceCategory;
  readonly label: string;
}

/**
 * Hosts permitted for the Northgate–Clifton demo fixture.
 *
 * Real Dutch/UEFA hosts are listed for the competition class this replay
 * represents. The demo packet itself uses `example.invalid` placeholders; those
 * are allowlisted so a refresh attempt can be distinguished from an out-of-policy
 * URL without pretending they are live third-party pages.
 */
export const DEMO_FIXTURE_ALLOWLIST: readonly AllowlistedHost[] = [
  { host: 'clifton-park-fc.example.invalid', category: 'club', label: 'Opponent club official site' },
  { host: 'league-listing.example.invalid', category: 'organizer', label: 'Competition fixture listing' },
  { host: 'regional-sports-wire.example.invalid', category: 'reporting', label: 'Named publisher (reporting only)' },
  { host: 'matchday-aggregator.example.invalid', category: 'reporting', label: 'Named publisher (reporting only)' },
  { host: 'eredivisie.nl', category: 'organizer', label: 'Eredivisie' },
  { host: 'www.eredivisie.nl', category: 'organizer', label: 'Eredivisie' },
  { host: 'knvb.nl', category: 'organizer', label: 'KNVB' },
  { host: 'www.knvb.nl', category: 'organizer', label: 'KNVB' },
  { host: 'uefa.com', category: 'organizer', label: 'UEFA' },
  { host: 'www.uefa.com', category: 'organizer', label: 'UEFA' },
];

const BLOCKED_HOST_SUFFIXES = ['x.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'www.tiktok.com'];

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isBlockedSocialHost(host: string): boolean {
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function findAllowlistEntry(
  url: string,
  allowlist: readonly AllowlistedHost[] = DEMO_FIXTURE_ALLOWLIST,
): AllowlistedHost | null {
  const host = hostnameOf(url);
  if (host === null || isBlockedSocialHost(host)) return null;
  return allowlist.find((entry) => entry.host === host) ?? null;
}

export function assertPublicQuery(query: string): void {
  // Private squad identifiers must never enter a public search string.
  const banned = /\b(pl_|con_|staff_log|max_minutes|medical|injury diagnosis)\b/i;
  if (banned.test(query)) {
    throw new Error('Public refresh query must not include private squad identifiers or medical detail.');
  }
}
