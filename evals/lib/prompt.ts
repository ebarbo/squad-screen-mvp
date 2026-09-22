import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { type BaseMatchContext } from '@/domain/contracts';
import { canonicalJson, sha256 } from './fingerprint';
import { repoRoot } from './paths';

export interface LoadedPrompt {
  /** Where the instruction text came from. Recorded in every run. */
  source: 'prompts/strategy.md' | 'evals/prompt/eval-prompt.md';
  /** Content hash, so a silently edited prompt cannot be passed off as the same one. */
  version: string;
  template: string;
}

/**
 * The product's synthesis prompt is the one under test whenever it exists
 * (EWE-65 owns `prompts/strategy.md`). The harness's own prompt is a fallback
 * for development before that lands, and the report says which was used —
 * comparing models on a prompt the product does not ship would measure the
 * wrong thing.
 */
export function loadPrompt(root = repoRoot()): LoadedPrompt {
  const productPrompt = path.join(root, 'prompts', 'strategy.md');
  if (existsSync(productPrompt)) {
    const template = readFileSync(productPrompt, 'utf8');
    return {
      source: 'prompts/strategy.md',
      version: `strategy-${sha256(template).slice(0, 12)}`,
      template,
    };
  }
  const fallback = path.join(root, 'evals', 'prompt', 'eval-prompt.md');
  const template = readFileSync(fallback, 'utf8');
  return {
    source: 'evals/prompt/eval-prompt.md',
    version: `eval-${sha256(template).slice(0, 12)}`,
    template,
  };
}

export interface RenderedPrompt {
  text: string;
  version: string;
  source: LoadedPrompt['source'];
}

/**
 * Renders the instruction text plus the context, deterministically.
 *
 * The context is serialised with the canonical key-sorted encoder, so two
 * models are guaranteed the same bytes and the input fingerprint is stable
 * across processes. Prior recommendations are included only on a rerun, which
 * is what lets a model explain a revision.
 */
export function renderPrompt(
  prompt: LoadedPrompt,
  context: BaseMatchContext,
  priorRecommendations: unknown = null,
  assumptions: unknown = null,
): RenderedPrompt {
  const sections = [
    prompt.template.trim(),
    '',
    '## Match context',
    '',
    '```json',
    canonicalJson(context),
    '```',
  ];
  if (priorRecommendations !== null) {
    sections.push(
      '',
      '## Prior recommendations to revise',
      '',
      '```json',
      canonicalJson(priorRecommendations),
      '```',
    );
  }
  if (assumptions !== null) {
    sections.push(
      '',
      '## Hypothetical assumptions applied to this rerun',
      '',
      '```json',
      canonicalJson(assumptions),
      '```',
    );
  }
  return { text: sections.join('\n'), version: prompt.version, source: prompt.source };
}
