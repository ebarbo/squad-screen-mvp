/**
 * Optional referee connector (EWE-78).
 *
 * Importing or omitting this module does not change the core generate path.
 * Call `loadRefereeContext` only when the briefing should include referee rates.
 */
export {
  computeRefereeSummary,
  refereeSummaryToMetrics,
  buildRefereeEvidenceItem,
  type RefereeRate,
  type RefereeSummary,
} from './compute';
export { REFEREE_MATCH_SAMPLE, REFEREE_SAMPLE_WINDOW, type RefereeMatchRecord } from '~/data/referee/sample';

import type { DerivedMetric, EvidenceItem } from '@/domain/contracts';
import { buildRefereeEvidenceItem, computeRefereeSummary, refereeSummaryToMetrics } from './compute';
import { REFEREE_MATCH_SAMPLE, REFEREE_SAMPLE_WINDOW } from '~/data/referee/sample';

export interface RefereeContextPacket {
  readonly evidence: EvidenceItem;
  readonly metrics: readonly DerivedMetric[];
  readonly interpretation: string | null;
  readonly coverageNote: string;
  readonly limitations: string;
}

/** Optional helper for callers that want referee evidence + metrics together. */
export function loadRefereeContext(input: {
  readonly fixtureId: string;
  readonly retrievedAt: string;
}): RefereeContextPacket {
  const summary = computeRefereeSummary(REFEREE_MATCH_SAMPLE, REFEREE_SAMPLE_WINDOW);
  const evidence = buildRefereeEvidenceItem({
    fixtureId: input.fixtureId,
    summary,
    retrievedAt: input.retrievedAt,
  });
  return {
    evidence,
    metrics: refereeSummaryToMetrics(summary, [evidence.id]),
    interpretation: summary.interpretation,
    coverageNote: summary.coverageNote,
    limitations: summary.limitations,
  };
}
