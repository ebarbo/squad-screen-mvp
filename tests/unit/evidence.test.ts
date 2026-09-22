import { describe, expect, it } from 'vitest';
import { AS_OF, DEMO_FIXTURE, OPPONENT_TEAM, OWN_TEAM } from '~/data/demo/fixture';
import { NORTHGATE_ROSTER } from '~/data/demo/squad';
import { BASE_SOURCE_RECORDS, getVariant } from '~/data/demo/variants';
import { AGENCY_ORIGIN } from '~/data/sources/public-context';
import type { SourceRecord } from '~/data/sources/types';
import { BaseMatchContextSchema } from '@/domain/contracts';
import { buildBaseContext, computeSnapshotId, deepFreeze } from '@/server/evidence/context';

function build(records: readonly SourceRecord[] = BASE_SOURCE_RECORDS) {
  return buildBaseContext({
    fixture: DEMO_FIXTURE,
    ownTeam: OWN_TEAM,
    opponentTeam: OPPONENT_TEAM,
    roster: NORTHGATE_ROSTER,
    records,
    asOf: AS_OF,
    retrievedAt: AS_OF,
  });
}

describe('context construction', () => {
  it('produces a context that satisfies the contract', () => {
    const { context } = build();
    expect(BaseMatchContextSchema.safeParse(context).success).toBe(true);
  });

  it('gives every accepted claim an inspectable source excerpt', () => {
    const { context } = build();
    for (const item of context.evidence) {
      expect(item.source.excerpt.length).toBeGreaterThan(0);
      // A public source has a URL; a private record has an ID. Never neither.
      expect(item.source.url !== null || item.source.record_id !== null).toBe(true);
    }
  });

  it('labels synthetic and snapshot evidence distinctly', () => {
    const { context } = build();
    const modes = new Set(context.evidence.map((item) => item.data_mode));
    expect(modes.has('synthetic')).toBe(true);
    expect(modes.has('snapshot')).toBe(true);
    expect(modes.has('live')).toBe(false);
  });
});

describe('shared origins', () => {
  it('counts two outlets carrying one agency report as a single source', () => {
    const { context, warnings } = build();

    const agencyItems = context.evidence.filter((item) => item.source.origin_id === AGENCY_ORIGIN);
    expect(agencyItems).toHaveLength(1);

    const collapsed = warnings.find((warning) => warning.code === 'duplicate_origin_collapsed');
    expect(collapsed).toBeDefined();
    expect(collapsed!.related_ids.length).toBeGreaterThan(1);
  });

  it('explains the collapse in the surviving item rather than hiding it', () => {
    const { context } = build();
    const agencyItem = context.evidence.find((item) => item.source.origin_id === AGENCY_ORIGIN)!;
    expect(agencyItem.check_notes).toMatch(/not counted as independent corroboration/i);
  });

  it('does not collapse distinct statements that merely share an origin', () => {
    // Several staff records share one origin and must all survive.
    const { context } = build();
    const staffItems = context.evidence.filter((item) => item.source.connector === 'staff_log');
    expect(staffItems.length).toBeGreaterThan(3);
  });
});

describe('conflicting evidence', () => {
  it('surfaces an unresolved cross-source disagreement instead of picking a winner', () => {
    const { context } = build();

    const conflict = context.conflicts.find((entry) => entry.subject_id === 'pl_clifton_marsh');
    expect(conflict).toBeDefined();
    expect(conflict!.resolution).toBeNull();

    const disputed = context.evidence.filter((item) => item.status === 'disputed');
    expect(disputed.length).toBeGreaterThanOrEqual(2);
  });

  it('never averages a disagreement into a confidence value', () => {
    const { context } = build();
    const serialised = JSON.stringify(context);
    expect(serialised).not.toMatch(/confidence|probability|likelihood/i);
  });

  it('marks a superseded record stale rather than deleting it', () => {
    const { context } = build(getVariant('conflicting_availability').records);

    const riversItems = context.evidence.filter((item) => item.subject_id === 'pl_rivers');
    const stale = riversItems.filter((item) => item.status === 'stale');

    expect(stale.length).toBeGreaterThanOrEqual(1);
    expect(stale[0]!.check_notes).toMatch(/superseded/i);
    // Retained, not dropped: the earlier record is still inspectable.
    expect(stale[0]!.source.excerpt.length).toBeGreaterThan(0);

    const conflict = context.conflicts.find((entry) => entry.subject_id === 'pl_rivers');
    expect(conflict?.resolution).toMatch(/later record from the same source/i);
  });
});

describe('derived metrics', () => {
  it('computes rates in code and states the denominator and sample', () => {
    const { derivedMetrics } = build();
    const metric = derivedMetrics[0];

    expect(metric).toBeDefined();
    // 14 of 18 reviewed build-ups.
    expect(metric!.value).toBeCloseTo(77.8, 1);
    expect(metric!.sample_size).toBe(2);
    expect(metric!.window).toMatch(/18 build-up sequences/);
    expect(metric!.evidence_ids.length).toBeGreaterThan(0);
  });
});

describe('squad state derived from dated records', () => {
  it('reads availability and the staff-supplied limit from evidence', () => {
    const { context } = build();
    const rivers = context.own_team.players.find((player) => player.id === 'pl_rivers')!;

    expect(rivers.availability).toBe('available');
    expect(rivers.staff_constraint?.max_minutes).toBe(45);
    expect(rivers.staff_constraint?.evidence_ids.length).toBeGreaterThan(0);
    expect(rivers.capabilities.length).toBeGreaterThan(0);
  });

  it('carries monitor status through without turning it into a clearance', () => {
    const { context } = build();
    const hale = context.own_team.players.find((player) => player.id === 'pl_hale')!;
    expect(hale.availability).toBe('monitor');
  });

  it('records a selectable player with no capability observation as a known gap', () => {
    const { context } = build();
    const vance = context.own_team.players.find((player) => player.id === 'pl_vance')!;

    expect(vance.capabilities).toHaveLength(0);
    expect(context.missing_information.some((gap) => gap.topic.includes('R. Vance'))).toBe(true);
  });

  it('applies the unavailable variant to the squad', () => {
    const { context } = build(getVariant('unavailable_player_a').records);
    const rivers = context.own_team.players.find((player) => player.id === 'pl_rivers')!;
    expect(rivers.availability).toBe('unavailable');
  });
});

describe('snapshot identity', () => {
  it('is stable across rebuilds of the same packet', () => {
    expect(build().context.evidence_snapshot_id).toBe(build().context.evidence_snapshot_id);
  });

  it('changes when the evidence changes', () => {
    const base = build().context.evidence_snapshot_id;
    const altered = build(getVariant('missing_tactical_support').records).context.evidence_snapshot_id;
    expect(altered).not.toBe(base);
  });

  it('does not depend on the order records arrive in', () => {
    const reversed = [...BASE_SOURCE_RECORDS].reverse();
    expect(build(reversed).context.evidence_snapshot_id).toBe(build().context.evidence_snapshot_id);
  });

  it('ignores retrieval time, so re-reading sources does not invalidate a snapshot', () => {
    const { context } = build();
    const rebuilt = buildBaseContext({
      fixture: DEMO_FIXTURE,
      ownTeam: OWN_TEAM,
      opponentTeam: OPPONENT_TEAM,
      roster: NORTHGATE_ROSTER,
      records: BASE_SOURCE_RECORDS,
      asOf: AS_OF,
      retrievedAt: '2026-09-22T23:59:00Z',
    });
    expect(rebuilt.context.evidence_snapshot_id).toBe(context.evidence_snapshot_id);
  });

  it('is a pure function of the evidence set', () => {
    const { context } = build();
    expect(computeSnapshotId(context.evidence)).toBe(context.evidence_snapshot_id);
  });
});

describe('base context immutability', () => {
  it('is frozen, so a scenario overlay has to copy rather than write', () => {
    const { context } = build();
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.evidence)).toBe(true);
    expect(Object.isFrozen(context.own_team.players[0])).toBe(true);
  });

  it('rejects a write to a nested player record', () => {
    const { context } = build();
    expect(() => {
      // @ts-expect-error deliberately violating readonly to prove the freeze holds
      context.own_team.players[0].availability = 'unavailable';
    }).toThrow(TypeError);
  });

  it('freezes arbitrarily nested structures', () => {
    const frozen = deepFreeze({ a: { b: { c: [1, 2, 3] } } });
    expect(Object.isFrozen(frozen.a.b.c)).toBe(true);
  });
});

describe('information cutoff', () => {
  it('excludes records observed after the cutoff', () => {
    const late: SourceRecord = {
      connector: 'analyst_notes',
      record_id: 'note-after-cutoff',
      origin_id: 'org_northgate_analyst',
      subject_team_id: 'tm_clifton',
      subject_player_id: null,
      text: 'Late-breaking observation that must not enter the packet.',
      observed_at: '2026-09-25T12:00:00Z',
      matches_sampled: 1,
      value: null,
    };

    const { context, warnings } = build([...BASE_SOURCE_RECORDS, late]);

    expect(context.evidence.some((item) => item.id.includes('after_cutoff'))).toBe(false);
    expect(warnings.some((warning) => warning.related_ids.includes('note-after-cutoff'))).toBe(true);
  });
});
