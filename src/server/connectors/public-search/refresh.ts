/**
 * Bounded public-source refresh (EWE-76).
 *
 * Attempts one allowlisted refresh for the chosen fixture. On failure the last
 * dated snapshot is preserved and a visible `source_unavailable` warning is
 * returned. Live items are labeled `data_mode: "live"` so they cannot be
 * mistaken for the saved snapshot.
 *
 * This module is never invoked from an availability-only what-if: scenario
 * re-evaluation reuses the frozen evidence snapshot and must not call here.
 *
 * Snapshot hashing/freezing are local copies of the EWE-64 helpers so this
 * connector stays additive and does not import the full evidence build path.
 */
import { createHash } from 'node:crypto';
import type { BaseMatchContext, EvidenceItem, Warning } from '@/domain/contracts';
import { DEMO_FIXTURE_ALLOWLIST, findAllowlistEntry, type AllowlistedHost } from './allowlist';
import {
  extractObservationsDeterministically,
  validateExtractionAgainstSource,
  type ExtractedObservation,
} from './extract';
import { fetchPageLive, htmlToText, type FetchedPage, type PageFetcher } from './fetch';
import { buildDemoPublicRefreshQuery } from './queries';

function computeSnapshotId(evidence: readonly EvidenceItem[]): string {
  const material = [...evidence]
    .map((item) => `${item.id}|${item.status}|${item.claim}|${item.source.origin_id}|${item.observed_at}`)
    .sort()
    .join('\n');
  return `snap_${createHash('sha256').update(material).digest('hex').slice(0, 16)}`;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return Object.freeze(value);
}

export interface PublicRefreshInput {
  readonly context: BaseMatchContext;
  /** Opt-in. Default false so the core demo path is unchanged. */
  readonly enabled?: boolean;
  readonly fetcher?: PageFetcher;
  readonly allowlist?: readonly AllowlistedHost[];
  readonly now?: () => string;
}

export interface PublicRefreshResult {
  readonly context: BaseMatchContext;
  readonly warnings: readonly Warning[];
  /** True when at least one live page replaced a snapshot item. */
  readonly refreshed: boolean;
  readonly queryText: string | null;
}

function snapshotPublicItems(context: BaseMatchContext): EvidenceItem[] {
  return context.evidence.filter(
    (item) => item.data_mode === 'snapshot' && item.source.url !== null && item.source.connector === 'public_context',
  );
}

function observationToLiveItem(
  base: EvidenceItem,
  observation: ExtractedObservation,
  page: FetchedPage,
  allowlistEntry: AllowlistedHost,
): EvidenceItem {
  const slug = base.id.replace(/^ev_/, '');
  return {
    ...base,
    id: `ev_live_${slug}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 80),
    category: observation.category,
    claim: observation.claim,
    value: {
      stance: observation.stance,
      source_category: allowlistEntry.category,
      refresh: 'live',
    },
    source: {
      ...base.source,
      excerpt: observation.excerpt,
      name:
        allowlistEntry.category === 'reporting'
          ? `${base.source.name} (live reporting — unconfirmed)`
          : `${base.source.name} (live refresh)`,
    },
    observed_at: observation.published_at ?? page.fetchedAt,
    published_at: observation.published_at,
    retrieved_at: page.fetchedAt,
    data_mode: 'live',
    status: 'unverified',
    conflicts_with: [],
    check_notes:
      allowlistEntry.category === 'reporting'
        ? 'Live reporting extract. Labeled reporting/unconfirmed until an official confirmation arrives.'
        : 'Live refresh from an allowlisted official page. Excerpt retained; status not yet rule-checked.',
  };
}

/**
 * Apply a bounded live refresh on top of a base context.
 *
 * Failure leaves `context` usable (same snapshot evidence) and surfaces a
 * warning. Success replaces matching snapshot public items with `live` ones and
 * recomputes the snapshot ID.
 */
export async function applyBoundedPublicRefresh(input: PublicRefreshInput): Promise<PublicRefreshResult> {
  const enabled = input.enabled === true;
  if (!enabled) {
    return { context: input.context, warnings: [], refreshed: false, queryText: null };
  }

  const allowlist = input.allowlist ?? DEMO_FIXTURE_ALLOWLIST;
  const fetcher = input.fetcher ?? fetchPageLive;
  const now = input.now ?? (() => new Date().toISOString());
  const warnings: Warning[] = [];

  const publicItems = snapshotPublicItems(input.context);
  const snapshotUrls = publicItems
    .map((item) => item.source.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  const query = buildDemoPublicRefreshQuery({
    fixtureId: input.context.fixture.id,
    opponentName: input.context.opponent.team.name,
    competition: input.context.fixture.competition,
    snapshotUrls,
  });

  if (snapshotUrls.length === 0) {
    warnings.push({
      code: 'source_unavailable',
      message: 'Public refresh enabled but no snapshot URLs were present; existing brief unchanged.',
      related_ids: [],
    });
    return { context: input.context, warnings, refreshed: false, queryText: query.queryText };
  }

  const liveByOrigin = new Map<string, EvidenceItem>();
  const failedUrls: string[] = [];

  for (const item of publicItems) {
    const url = item.source.url;
    if (url === null) continue;

    const entry = findAllowlistEntry(url, allowlist);
    if (entry === null) {
      failedUrls.push(url);
      warnings.push({
        code: 'source_unavailable',
        message: `URL not on the bounded allowlist; skipped: ${url}`,
        related_ids: [item.id],
      });
      continue;
    }

    const page = await fetcher(url);
    if (!page.ok || page.bodyText === null) {
      failedUrls.push(url);
      continue;
    }

    const pageText = htmlToText(page.bodyText);
    const extracted = extractObservationsDeterministically({
      pageText,
      sourceCategory: entry.category,
      publishedAt: item.published_at,
    });
    const validated = validateExtractionAgainstSource(extracted, pageText);
    if (!validated.ok || validated.value.observations.length === 0) {
      // Page fetched but nothing extractable — keep snapshot for this origin.
      warnings.push({
        code: 'source_unavailable',
        message:
          `Live page fetched for ${url} but no source-supported observation could be extracted` +
          (validated.ok ? '' : ` (${validated.reason})`) +
          '. Snapshot retained.',
        related_ids: [item.id],
      });
      continue;
    }

    const observation = validated.value.observations[0]!;
    liveByOrigin.set(item.source.origin_id, observationToLiveItem(item, observation, page, entry));
  }

  if (liveByOrigin.size === 0) {
    warnings.push({
      code: 'source_unavailable',
      message:
        failedUrls.length > 0
          ? `Public refresh failed for ${failedUrls.length} URL(s). Last dated snapshot retained; briefing remains usable.`
          : 'Public refresh produced no live observations. Last dated snapshot retained.',
      related_ids: publicItems.map((item) => item.id),
    });
    return { context: input.context, warnings, refreshed: false, queryText: query.queryText };
  }

  const refreshedEvidence: EvidenceItem[] = [];
  const replacedIds: string[] = [];

  for (const item of input.context.evidence) {
    if (item.data_mode === 'snapshot' && item.source.connector === 'public_context' && liveByOrigin.has(item.source.origin_id)) {
      const live = liveByOrigin.get(item.source.origin_id)!;
      // One live item per origin — collapse further snapshot copies of the same origin.
      if (!refreshedEvidence.some((existing) => existing.id === live.id)) {
        refreshedEvidence.push(live);
        replacedIds.push(item.id);
      }
      continue;
    }
    refreshedEvidence.push(item);
  }

  const next: BaseMatchContext = {
    ...input.context,
    evidence_snapshot_id: computeSnapshotId(refreshedEvidence),
    as_of: now(),
    evidence: refreshedEvidence,
    external_context: refreshedEvidence
      .filter((item) => item.data_mode === 'snapshot' || item.data_mode === 'live')
      .map((item) => item.id),
    opponent: {
      ...input.context.opponent,
      observations: refreshedEvidence
        .filter(
          (item) =>
            item.subject_type === 'opponent' || item.subject_id === input.context.opponent.team.id,
        )
        .map((item) => item.id),
    },
  };

  warnings.push({
    code: 'stale_evidence',
    message: `Live public refresh replaced ${replacedIds.length} snapshot item(s). Live items are labeled data_mode=live.`,
    related_ids: replacedIds,
  });

  return {
    context: deepFreeze(next),
    warnings,
    refreshed: true,
    queryText: query.queryText,
  };
}
