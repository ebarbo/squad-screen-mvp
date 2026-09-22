import type { Recommendation } from '@/domain/contracts';
import { buildRationaleChain, type RationaleStepKind } from '@/components/evidence/evidence-model';

/**
 * Renders the parts of a recommendation as separate, labelled statements.
 *
 * Keeping observation, inference and action apart is the product's core claim,
 * so each facet is distinguished three ways at once — rail colour, glyph and
 * written label — and none of the three is load-bearing on its own.
 */

interface FacetStyle {
  /** Full class strings, written out so the CSS scanner can see them. */
  rail: string;
  text: string;
  glyph: string;
}

const FACET_STYLE: Record<RationaleStepKind, FacetStyle> = {
  observation: {
    rail: 'bg-facet-observation',
    text: 'text-facet-observation',
    glyph: '◎',
  },
  inference: {
    rail: 'bg-facet-inference',
    text: 'text-facet-inference',
    glyph: '⇢',
  },
  action: {
    rail: 'bg-facet-action',
    text: 'text-facet-action',
    glyph: '▶',
  },
  trade_off: {
    rail: 'bg-facet-tradeoff',
    text: 'text-facet-tradeoff',
    glyph: '⇄',
  },
  uncertainty: {
    rail: 'bg-facet-uncertainty',
    text: 'text-facet-uncertainty',
    glyph: '?',
  },
  next_check: {
    rail: 'bg-facet-check',
    text: 'text-facet-check',
    glyph: '☑',
  },
};

/** Spelled out so a reader never has to infer what a facet means. */
const FACET_HINT: Record<RationaleStepKind, string> = {
  observation: 'What a source states',
  inference: 'What was concluded from it',
  action: 'What is proposed',
  trade_off: 'What it costs',
  uncertainty: 'What is not established',
  next_check: 'What to confirm before kickoff',
};

export function Facet({
  kind,
  label,
  text,
  emphasised = false,
}: {
  kind: RationaleStepKind;
  label: string;
  text: string;
  emphasised?: boolean;
}) {
  const style = FACET_STYLE[kind];
  return (
    <div className="flex gap-3 py-3 first:pt-1" data-facet={kind}>
      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        <span
          aria-hidden="true"
          className={`grid size-5 shrink-0 place-items-center rounded-md border border-current text-[10px] font-bold ${style.text}`}
        >
          {style.glyph}
        </span>
        <span aria-hidden="true" className={`w-px grow rounded-full opacity-35 ${style.rail}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ${style.text}`}
        >
          {label}
          <span className="ml-2 font-medium normal-case tracking-normal text-ink-2/70">
            {FACET_HINT[kind]}
          </span>
        </p>
        <p
          className={`source-text text-[14.5px] leading-relaxed ${
            emphasised ? 'font-medium text-ink-0' : 'text-ink-1'
          }`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

export function ReasoningFacets({ recommendation }: { recommendation: Recommendation }) {
  const steps = buildRationaleChain(recommendation);

  if (steps.length === 0) {
    return (
      <p className="py-3 text-sm italic text-ink-2">
        This recommendation arrived with no reasoning fields populated.
      </p>
    );
  }

  return (
    <div className="divide-y divide-surface-2/70">
      {steps.map((step) => (
        <Facet
          key={step.kind}
          kind={step.kind}
          label={step.label}
          text={step.text}
          emphasised={step.kind === 'action'}
        />
      ))}
    </div>
  );
}
