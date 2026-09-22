import type { DataMode, EvidenceStatus } from '@/domain/contracts';
import { DATA_MODE_DESCRIPTION, DATA_MODE_LABEL } from '@/components/briefing/briefing-model';
import { EVIDENCE_STATUS_LABEL, EVIDENCE_STATUS_MEANING } from './evidence-model';

/** Glyphs repeat the distinction the colours make, for greyscale projection and low vision. */
const STATUS_GLYPH: Record<EvidenceStatus, string> = {
  accepted: '✓',
  disputed: '≠',
  stale: '⌛',
  missing: '∅',
  unverified: '?',
};

const STATUS_CLASS: Record<EvidenceStatus, string> = {
  accepted: 'border-action/50 bg-action/10 text-action',
  disputed: 'border-danger/60 bg-danger/12 text-danger',
  stale: 'border-warn/60 bg-warn/12 text-warn',
  missing: 'border-mock/60 bg-mock/12 text-mock',
  unverified: 'border-surface-3 bg-surface-2 text-ink-2',
};

const BADGE_BASE =
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide';

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span className={`${BADGE_BASE} ${STATUS_CLASS[status]}`} title={EVIDENCE_STATUS_MEANING[status]}>
      <span aria-hidden="true" className="text-[10px] leading-none">
        {STATUS_GLYPH[status]}
      </span>
      {EVIDENCE_STATUS_LABEL[status]}
      <span className="sr-only">. {EVIDENCE_STATUS_MEANING[status]}</span>
    </span>
  );
}

const MODE_GLYPH: Record<DataMode, string> = {
  synthetic: '◇',
  snapshot: '▣',
  live: '◉',
};

const MODE_CLASS: Record<DataMode, string> = {
  synthetic: 'border-synthetic/60 bg-synthetic/12 text-synthetic',
  snapshot: 'border-fact/60 bg-fact/12 text-fact',
  live: 'border-action/60 bg-action/12 text-action',
};

export function DataModeBadge({ mode }: { mode: DataMode }) {
  return (
    <span className={`${BADGE_BASE} ${MODE_CLASS[mode]}`} title={DATA_MODE_DESCRIPTION[mode]}>
      <span aria-hidden="true" className="text-[10px] leading-none">
        {MODE_GLYPH[mode]}
      </span>
      {DATA_MODE_LABEL[mode]}
      <span className="sr-only">. {DATA_MODE_DESCRIPTION[mode]}</span>
    </span>
  );
}

/** Small colour key used on evidence reference chips in the briefing. */
export const STATUS_DOT_CLASS: Record<EvidenceStatus, string> = {
  accepted: 'bg-action',
  disputed: 'bg-danger',
  stale: 'bg-warn',
  missing: 'bg-mock',
  unverified: 'bg-ink-2',
};
