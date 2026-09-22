import { describe, expect, it } from 'vitest';
import type { EvidenceItem, Recommendation, RunResult, Telemetry } from '@/domain/contracts';
import {
  exampleAbstainingRunResult,
  exampleEvidence,
  exampleRecommendation,
  exampleRunResult,
  exampleTelemetry,
} from '@/domain/examples';
import {
  MAX_RECOMMENDATIONS,
  briefingOutcome,
  countRun,
  describeTelemetry,
  formatTimestamp,
  isStubRun,
  partitionRecommendations,
  unresolvedConflictKeys,
} from '@/components/briefing/briefing-model';

function withId(id: string): Recommendation {
  return { ...exampleRecommendation, id };
}

const [wideOverload, capability, minutesLimit] = exampleEvidence;
if (!wideOverload || !capability || !minutesLimit) throw new Error('example evidence missing');

describe('partitionRecommendations', () => {
  it('caps the visible list at the contract maximum', () => {
    const four = [
      withId('rec_one'),
      withId('rec_two'),
      withId('rec_three'),
      withId('rec_four'),
    ];

    const { visible, overflow } = partitionRecommendations(four);

    expect(MAX_RECOMMENDATIONS).toBe(3);
    expect(visible).toHaveLength(3);
    expect(overflow.map((item) => item.id)).toEqual(['rec_four']);
  });

  it('reports no overflow for a compliant response, and handles zero', () => {
    expect(partitionRecommendations(exampleRunResult.recommendations).overflow).toEqual([]);
    expect(partitionRecommendations([])).toEqual({ visible: [], overflow: [] });
    expect(partitionRecommendations(null)).toEqual({ visible: [], overflow: [] });
  });
});

describe('countRun', () => {
  it('counts only what the response carries', () => {
    const counts = countRun(exampleRunResult);

    expect(counts.recommendationCount).toBe(exampleRunResult.recommendations.length);
    expect(counts.evidenceCount).toBe(exampleRunResult.evidence.length);
    expect(counts.warningCount).toBe(exampleRunResult.warnings.length);
    expect(counts.citedEvidenceCount + counts.uncitedEvidenceCount).toBe(counts.evidenceCount);
  });

  it('collapses records that share an origin, so copies are not corroboration', () => {
    // Two of the three example records are the same staff origin.
    const counts = countRun(exampleRunResult);

    expect(counts.evidenceCount).toBe(3);
    expect(counts.distinctSourceNameCount).toBe(3);
    expect(counts.distinctOriginCount).toBe(2);
  });

  it('counts a conflicting pair once, not twice', () => {
    const disputedA: EvidenceItem = {
      ...wideOverload,
      id: 'ev_dispute_a',
      status: 'disputed',
      conflicts_with: ['ev_dispute_b'],
    };
    const disputedB: EvidenceItem = {
      ...capability,
      id: 'ev_dispute_b',
      status: 'disputed',
      conflicts_with: ['ev_dispute_a'],
    };

    const run: RunResult = { ...exampleRunResult, evidence: [disputedA, disputedB] };

    expect(unresolvedConflictKeys([disputedA, disputedB])).toEqual(['ev_dispute_a::ev_dispute_b']);
    expect(countRun(run).unresolvedConflictCount).toBe(1);
  });

  it('ignores a conflict pointing at a record the run did not return', () => {
    const dangling: EvidenceItem = {
      ...wideOverload,
      conflicts_with: ['ev_never_returned'],
    };

    expect(countRun({ ...exampleRunResult, evidence: [dangling] }).unresolvedConflictCount).toBe(0);
  });

  it('tallies evidence status without inventing a score', () => {
    const counts = countRun({
      ...exampleRunResult,
      evidence: [
        wideOverload,
        { ...capability, id: 'ev_stale_one', status: 'stale' },
        { ...minutesLimit, id: 'ev_disputed_one', status: 'disputed' },
      ],
    });

    expect(counts.statusCounts).toEqual([
      { status: 'accepted', count: 1 },
      { status: 'disputed', count: 1 },
      { status: 'stale', count: 1 },
    ]);
  });
});

describe('describeTelemetry', () => {
  it('reports a missing token count as absent with the provider reason, never as zero', () => {
    const rows = describeTelemetry(exampleTelemetry);
    const inputTokens = rows.find((row) => row.label === 'Input tokens');

    expect(inputTokens?.value).toBeNull();
    expect(inputTokens?.reason).toBe(exampleTelemetry.usage_note);
    expect(rows.every((row) => row.value !== '0' || row.label !== 'Input tokens')).toBe(true);
  });

  it('formats reported values and counts retries separately from calls', () => {
    const telemetry: Telemetry = {
      ...exampleTelemetry,
      transport: 'live',
      duration_ms: 2450,
      input_tokens: 1234,
      output_tokens: 567,
      usage_note: null,
      call_count: 3,
      retry_count: 2,
      estimated_inference_cost_usd: 0.00123,
    };

    const byLabel = new Map(describeTelemetry(telemetry).map((row) => [row.label, row.value]));

    expect(byLabel.get('Duration')).toBe('2.45 s');
    expect(byLabel.get('Input tokens')).toBe('1,234');
    expect(byLabel.get('Calls (including retries)')).toBe('3');
    expect(byLabel.get('Retries')).toBe('2');
    expect(byLabel.get('Estimated inference cost')).toBe('$0.0012');
  });

  it('says so when there is no run at all', () => {
    expect(describeTelemetry(null)).toEqual([
      { label: 'Telemetry', value: null, reason: 'No run has been generated yet' },
    ]);
  });
});

describe('run classification', () => {
  it('treats zero recommendations as an answer, not a failure', () => {
    expect(briefingOutcome(exampleAbstainingRunResult)).toBe('abstained');
    expect(briefingOutcome(exampleRunResult)).toBe('recommended');
  });

  it('flags a stub transport so it cannot read as completed live inference', () => {
    expect(isStubRun(exampleRunResult)).toBe(true);
    expect(isStubRun({ telemetry: { ...exampleTelemetry, transport: 'live' } })).toBe(false);
    expect(isStubRun(null)).toBe(false);
  });
});

describe('formatTimestamp', () => {
  it('renders an instant in UTC and leaves unknown values unknown', () => {
    expect(formatTimestamp('2026-09-22T09:00:00Z')).toBe('22 Sept 2026, 09:00 UTC');
    expect(formatTimestamp(null)).toBe('Unknown');
  });

  it('returns an unparseable value unchanged rather than inventing a date', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});
