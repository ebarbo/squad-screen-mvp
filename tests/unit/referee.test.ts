import { describe, expect, it } from 'vitest';
import {
  REFEREE_MATCH_SAMPLE,
  computeRefereeSummary,
  loadRefereeContext,
  refereeSummaryToMetrics,
} from '@/server/connectors/referee';

describe('referee deterministic rates', () => {
  it('reconciles totals to the sample and handles unknown penalty denominators', () => {
    const summary = computeRefereeSummary(REFEREE_MATCH_SAMPLE);

    expect(summary.matchCount).toBe(6);
    expect(summary.rates.yellowCards.total).toBe(3 + 5 + 2 + 4 + 6 + 3);
    expect(summary.rates.redCards.total).toBe(1);
    expect(summary.rates.fouls.total).toBe(22 + 28 + 18 + 25 + 30 + 21);
    expect(summary.rates.yellowCards.perMatch).toBeCloseTo(summary.rates.yellowCards.total / 6, 2);

    // One match has penalties: null → excluded from denominator.
    expect(summary.rates.penalties.matchesInDenominator).toBe(5);
    expect(summary.rates.penalties.total).toBe(0 + 1 + 0 + 0 + 1);
    expect(summary.rates.penalties.limitation).toMatch(/unknown penalty/i);
  });

  it('returns a null rate rather than inventing one when the denominator is zero', () => {
    const summary = computeRefereeSummary([]);
    expect(summary.matchCount).toBe(0);
    expect(summary.rates.yellowCards.perMatch).toBeNull();
    expect(summary.rates.penalties.perMatch).toBeNull();
    expect(refereeSummaryToMetrics(summary, ['ev_referee_dale_window'])).toHaveLength(0);
  });

  it('exposes sample size, coverage and limitations as evidence', () => {
    const packet = loadRefereeContext({
      fixtureId: 'fx_northgate_clifton_2026_09_26',
      retrievedAt: '2026-09-22T08:30:00Z',
    });

    expect(packet.evidence.category).toBe('discipline');
    expect(packet.evidence.value).toMatchObject({ match_count: 6, yellow_total: 23 });
    expect(packet.coverageNote).toMatch(/All 6 supplied records/);
    expect(packet.limitations).toMatch(/not a live referee feed/i);
    expect(packet.metrics.every((metric) => metric.sample_size > 0)).toBe(true);
    expect(packet.interpretation === null || /not a forecast/i.test(packet.interpretation)).toBe(true);
  });

  it('does not invent LLM metrics — values come from the sample only', () => {
    const summary = computeRefereeSummary(REFEREE_MATCH_SAMPLE);
    const serialised = JSON.stringify(summary);
    expect(serialised).not.toMatch(/confidence|probability|win_chance/i);
  });
});
