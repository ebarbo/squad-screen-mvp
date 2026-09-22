import { describe, expect, it } from 'vitest';
import type { EvidenceItem } from '@/domain/contracts';
import { exampleEvidence, exampleRecommendation } from '@/domain/examples';
import {
  buildEvidenceIndex,
  buildRationaleChain,
  conflictLinksFor,
  evidenceAnchorId,
  needsAttention,
  originIdsWithSiblings,
  resolveReferences,
  sharedOriginGroups,
  sourceLocator,
} from '@/components/evidence/evidence-model';

const [wideOverload, capability, minutesLimit] = exampleEvidence;
if (!wideOverload || !capability || !minutesLimit) throw new Error('example evidence missing');

const index = buildEvidenceIndex(exampleEvidence);

describe('resolveReferences', () => {
  it('resolves every citation the run carries', () => {
    const { resolved, unresolvedIds } = resolveReferences(exampleRecommendation.evidence_ids, index);

    expect(resolved.map((item) => item.id)).toEqual(exampleRecommendation.evidence_ids);
    expect(unresolvedIds).toEqual([]);
  });

  it('surfaces an ID with no record rather than dropping it', () => {
    const { resolved, unresolvedIds } = resolveReferences(
      ['ev_example_capability', 'ev_does_not_exist'],
      index,
    );

    expect(resolved.map((item) => item.id)).toEqual(['ev_example_capability']);
    expect(unresolvedIds).toEqual(['ev_does_not_exist']);
  });

  it('reports a repeated citation instead of listing the record twice', () => {
    const { resolved, duplicateIds } = resolveReferences(
      ['ev_example_capability', 'ev_example_capability'],
      index,
    );

    expect(resolved).toHaveLength(1);
    expect(duplicateIds).toEqual(['ev_example_capability']);
  });

  it('treats an empty or blank reference as unresolved', () => {
    const { resolved, unresolvedIds } = resolveReferences(['', '   '], index);

    expect(resolved).toEqual([]);
    expect(unresolvedIds).toHaveLength(2);
  });

  it('handles a recommendation with no citations', () => {
    expect(resolveReferences(undefined, index)).toEqual({
      resolved: [],
      unresolvedIds: [],
      duplicateIds: [],
    });
  });
});

describe('conflictLinksFor', () => {
  const left: EvidenceItem = {
    ...wideOverload,
    id: 'ev_left',
    status: 'disputed',
    conflicts_with: ['ev_right', 'ev_missing'],
  };
  const right: EvidenceItem = { ...capability, id: 'ev_right', status: 'disputed' };
  const pairIndex = buildEvidenceIndex([left, right]);

  it('links to the contradicting record and carries its claim', () => {
    const links = conflictLinksFor(left, pairIndex);
    const toRight = links.find((link) => link.toId === 'ev_right');

    expect(toRight?.targetExists).toBe(true);
    expect(toRight?.targetClaim).toBe(right.claim);
  });

  it('keeps a conflict pointing at an absent record visible and marked', () => {
    const links = conflictLinksFor(left, pairIndex);
    const dangling = links.find((link) => link.toId === 'ev_missing');

    expect(dangling).toBeDefined();
    expect(dangling?.targetExists).toBe(false);
    expect(dangling?.targetClaim).toBeNull();
  });
});

describe('sharedOriginGroups', () => {
  it('groups the two staff records that come from one origin', () => {
    const groups = sharedOriginGroups(exampleEvidence);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.originId).toBe('org_example_staff');
    expect(groups[0]?.items.map((item) => item.id).sort()).toEqual([
      'ev_example_capability',
      'ev_example_minutes_limit',
    ]);
  });

  it('does not group a record that is the only one from its origin', () => {
    expect(sharedOriginGroups([wideOverload])).toEqual([]);
    expect(originIdsWithSiblings(exampleEvidence).has('org_example_analyst')).toBe(false);
    expect(originIdsWithSiblings(exampleEvidence).has('org_example_staff')).toBe(true);
  });
});

describe('buildRationaleChain', () => {
  it('orders the chain observation, inference, then action', () => {
    const chain = buildRationaleChain(exampleRecommendation);

    expect(chain.map((step) => step.kind)).toEqual([
      'observation',
      'inference',
      'action',
      'trade_off',
      'uncertainty',
      'next_check',
    ]);
    expect(chain[0]?.text).toBe(exampleRecommendation.observation);
  });

  it('skips a facet the run left blank rather than printing an empty heading', () => {
    const chain = buildRationaleChain({
      ...exampleRecommendation,
      trade_off: '   ',
      next_check: '',
    });

    expect(chain.map((step) => step.kind)).toEqual([
      'observation',
      'inference',
      'action',
      'uncertainty',
    ]);
  });
});

describe('sourceLocator', () => {
  it('uses the record ID for a private source', () => {
    expect(sourceLocator(capability)).toEqual({
      kind: 'record',
      label: 'staff-2026-09-20-07',
      href: null,
    });
  });

  it('uses the URL for a public source', () => {
    const publicItem: EvidenceItem = {
      ...wideOverload,
      source: { ...wideOverload.source, url: 'https://example.invalid/report', record_id: null },
    };

    expect(sourceLocator(publicItem)).toEqual({
      kind: 'url',
      label: 'https://example.invalid/report',
      href: 'https://example.invalid/report',
    });
  });

  it('says plainly when neither was supplied', () => {
    const orphan: EvidenceItem = {
      ...wideOverload,
      source: { ...wideOverload.source, url: null, record_id: null },
    };

    expect(sourceLocator(orphan).kind).toBe('none');
  });
});

describe('status helpers', () => {
  it('marks disputed, stale and missing as needing attention; accepted does not', () => {
    expect(needsAttention({ ...wideOverload, status: 'disputed' })).toBe(true);
    expect(needsAttention({ ...wideOverload, status: 'stale' })).toBe(true);
    expect(needsAttention({ ...wideOverload, status: 'missing' })).toBe(true);
    expect(needsAttention({ ...wideOverload, status: 'accepted' })).toBe(false);
  });

  it('produces a DOM-safe anchor for any evidence ID', () => {
    expect(evidenceAnchorId('ev_example_capability')).toBe('evidence-record-ev_example_capability');
    expect(evidenceAnchorId('ev a/b')).toBe('evidence-record-ev_a_b');
  });
});
