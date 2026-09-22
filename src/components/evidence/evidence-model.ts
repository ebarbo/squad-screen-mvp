import type { EvidenceItem, EvidenceStatus, Recommendation } from '@/domain/contracts';

/**
 * Resolution rules for the evidence drawer: which references exist, which do
 * not, which records disagree, and which records are really one source counted
 * twice.
 */

export type EvidenceIndex = ReadonlyMap<string, EvidenceItem>;

export function buildEvidenceIndex(evidence: readonly EvidenceItem[] | null | undefined): EvidenceIndex {
  const index = new Map<string, EvidenceItem>();
  for (const item of evidence ?? []) {
    if (!index.has(item.id)) index.set(item.id, item);
  }
  return index;
}

export interface ResolvedReferences {
  resolved: EvidenceItem[];
  /** Referenced IDs with no matching record. Shown explicitly rather than dropped. */
  unresolvedIds: string[];
  /** IDs listed more than once on one recommendation. */
  duplicateIds: string[];
}

export function resolveReferences(
  evidenceIds: readonly string[] | null | undefined,
  index: EvidenceIndex,
): ResolvedReferences {
  const resolved: EvidenceItem[] = [];
  const unresolvedIds: string[] = [];
  const duplicateIds: string[] = [];
  const seen = new Set<string>();

  for (const rawId of evidenceIds ?? []) {
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (id.length === 0) {
      unresolvedIds.push(String(rawId));
      continue;
    }
    if (seen.has(id)) {
      if (!duplicateIds.includes(id)) duplicateIds.push(id);
      continue;
    }
    seen.add(id);

    const item = index.get(id);
    if (item) resolved.push(item);
    else unresolvedIds.push(id);
  }

  return { resolved, unresolvedIds, duplicateIds };
}

export interface ConflictLink {
  /** The record being read. */
  fromId: string;
  /** The record it disagrees with. */
  toId: string;
  /** False when `conflicts_with` points at an ID this run never returned. */
  targetExists: boolean;
  targetClaim: string | null;
  targetSourceName: string | null;
}

export function conflictLinksFor(item: EvidenceItem, index: EvidenceIndex): ConflictLink[] {
  return (item.conflicts_with ?? []).map((toId) => {
    const target = index.get(toId);
    return {
      fromId: item.id,
      toId,
      targetExists: Boolean(target),
      targetClaim: target?.claim ?? null,
      targetSourceName: target?.source.name ?? null,
    };
  });
}

export interface OriginGroup {
  originId: string;
  items: EvidenceItem[];
  sourceNames: string[];
}

/**
 * Records sharing an `origin_id` are one source reported more than once, so
 * they are not independent corroboration.
 */
export function sharedOriginGroups(evidence: readonly EvidenceItem[] | null | undefined): OriginGroup[] {
  const byOrigin = new Map<string, EvidenceItem[]>();
  for (const item of evidence ?? []) {
    const bucket = byOrigin.get(item.source.origin_id);
    if (bucket) bucket.push(item);
    else byOrigin.set(item.source.origin_id, [item]);
  }

  return [...byOrigin.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([originId, items]) => ({
      originId,
      items,
      sourceNames: [...new Set(items.map((item) => item.source.name))],
    }))
    .sort((a, b) => a.originId.localeCompare(b.originId));
}

export function originIdsWithSiblings(
  evidence: readonly EvidenceItem[] | null | undefined,
): Set<string> {
  return new Set(sharedOriginGroups(evidence).map((group) => group.originId));
}

export type RationaleStepKind =
  | 'observation'
  | 'inference'
  | 'action'
  | 'trade_off'
  | 'uncertainty'
  | 'next_check';

export interface RationaleStep {
  kind: RationaleStepKind;
  label: string;
  text: string;
}

const RATIONALE_SEQUENCE: ReadonlyArray<{ kind: RationaleStepKind; label: string }> = [
  { kind: 'observation', label: 'Observed' },
  { kind: 'inference', label: 'Inferred' },
  { kind: 'action', label: 'Proposed action' },
  { kind: 'trade_off', label: 'Trade-off' },
  { kind: 'uncertainty', label: 'Uncertainty' },
  { kind: 'next_check', label: 'Next check' },
];

/** Ordered observation → inference → action chain, skipping parts the run left empty. */
export function buildRationaleChain(recommendation: Recommendation): RationaleStep[] {
  const steps: RationaleStep[] = [];
  for (const { kind, label } of RATIONALE_SEQUENCE) {
    const text = recommendation[kind];
    if (typeof text === 'string' && text.trim().length > 0) {
      steps.push({ kind, label, text: text.trim() });
    }
  }
  return steps;
}

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  accepted: 'Accepted',
  disputed: 'Disputed',
  stale: 'Stale',
  missing: 'Missing',
  unverified: 'Unverified',
};

export const EVIDENCE_STATUS_MEANING: Record<EvidenceStatus, string> = {
  accepted: 'Checked against the supplied source. Checked is not the same as true.',
  disputed: 'Another record contradicts this one and the disagreement is unresolved.',
  stale: 'Older than the freshness rule applied to this fixture.',
  missing: 'Expected for this claim but not supplied by any source.',
  unverified: 'Supplied, but no check rule applied to it.',
};

/** Statuses that must stay visible rather than being folded into a summary. */
export function needsAttention(item: EvidenceItem): boolean {
  return item.status === 'disputed' || item.status === 'stale' || item.status === 'missing';
}

export interface EvidenceSourceLocator {
  kind: 'url' | 'record' | 'none';
  label: string;
  href: string | null;
}

export function sourceLocator(item: EvidenceItem): EvidenceSourceLocator {
  const url = item.source.url;
  if (typeof url === 'string' && url.trim().length > 0) {
    const trimmed = url.trim();
    return { kind: 'url', label: trimmed, href: trimmed };
  }
  const recordId = item.source.record_id;
  if (typeof recordId === 'string' && recordId.trim().length > 0) {
    return { kind: 'record', label: recordId.trim(), href: null };
  }
  return { kind: 'none', label: 'No URL or record ID supplied', href: null };
}

/** DOM id for a record inside the drawer, so a conflict link can scroll to it. */
export function evidenceAnchorId(evidenceId: string): string {
  return `evidence-record-${evidenceId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}
