/**
 * One approved public fixture/opponent query (EWE-76).
 *
 * Queries name only the public opponent and competition. Private squad IDs,
 * staff constraints and medical detail are never included.
 */
import { assertPublicQuery } from './allowlist';

export interface PublicRefreshQuery {
  readonly fixtureId: string;
  readonly opponentName: string;
  readonly competition: string;
  /** Human-readable query string for logging — not sent to an open web search API. */
  readonly queryText: string;
  /** Exact URLs that may be refreshed for this fixture. */
  readonly allowedUrls: readonly string[];
}

export function buildDemoPublicRefreshQuery(input: {
  readonly fixtureId: string;
  readonly opponentName: string;
  readonly competition: string;
  readonly snapshotUrls: readonly string[];
}): PublicRefreshQuery {
  const queryText = `Official public updates for ${input.opponentName} and ${input.competition} fixture listing`;
  assertPublicQuery(queryText);

  return {
    fixtureId: input.fixtureId,
    opponentName: input.opponentName,
    competition: input.competition,
    queryText,
    allowedUrls: [...input.snapshotUrls],
  };
}
