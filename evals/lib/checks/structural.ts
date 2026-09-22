import {
  ModelSynthesisSchema,
  RunResultSchema,
  ScenarioResultSchema,
  findFabricatedConfidence,
} from '@/domain/contracts';
import { fail, fromViolations, pass, type CheckResult, type Violation } from './types';
import { NUMERIC_CONFIDENCE_PATTERNS, scanText } from './language';
import {
  narrativeFields,
  subjectRecommendations,
  subjectRun,
  subjectWarnings,
  warningFields,
  type CheckContext,
} from './context';

const MAX_RECOMMENDATIONS = 3;

/**
 * S1 — the product's own schema is the judge.
 *
 * Both halves are checked: the raw model output against `ModelSynthesisSchema`
 * (which is strict, so an invented field such as `confidence` fails here), and
 * the assembled result against `RunResultSchema` or `ScenarioResultSchema`.
 */
export function checkS1(context: CheckContext): CheckResult {
  const violations: Violation[] = [];

  if (context.rawModelOutput !== null && context.rawModelOutput !== undefined) {
    const parsed = ModelSynthesisSchema.safeParse(context.rawModelOutput);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        violations.push({
          recommendation_id: null,
          detail: `Model output: ${issue.path.join('.') || '(root)'} — ${issue.message}`,
        });
      }
    }
  }

  const resultSchema = context.rerun === null ? RunResultSchema : ScenarioResultSchema;
  const parsedResult = resultSchema.safeParse(subjectRun(context));
  if (!parsedResult.success) {
    for (const issue of parsedResult.error.issues) {
      violations.push({
        recommendation_id: null,
        detail: `Run result: ${issue.path.join('.') || '(root)'} — ${issue.message}`,
      });
    }
  }

  if (violations.length > 0) {
    return fail(
      'S1',
      `Output does not satisfy the domain contract schema (${violations.length} issue${violations.length === 1 ? '' : 's'}).`,
      violations,
    );
  }
  return pass('S1', 'Model output and assembled run result both validate against the contract.');
}

/** S2 — zero is allowed and three is the ceiling. Abstention is not a failure. */
export function checkS2(context: CheckContext): CheckResult {
  const count = subjectRecommendations(context).length;
  if (count > MAX_RECOMMENDATIONS) {
    return fail(
      'S2',
      `Returned ${count} recommendations; the contract allows at most ${MAX_RECOMMENDATIONS}.`,
      [{ recommendation_id: null, detail: `count=${count}`, offending_value: count }],
    );
  }
  if (count === 0) {
    const note = subjectRun(context).abstention_note;
    if (note === null || note.trim() === '') {
      return fail('S2', 'Abstained without an abstention_note explaining why.', [
        { recommendation_id: null, detail: 'recommendations is empty and abstention_note is null.' },
      ]);
    }
    return pass('S2', 'Abstained with an explanation, which the contract permits.');
  }
  return pass(
    'S2',
    `Returned ${count} recommendation${count === 1 ? '' : 's'}, within the zero-to-three bound.`,
  );
}

/**
 * S3 — no invented certainty, in any field, in any form.
 *
 * Two layers: the contract's own `findFabricatedConfidence`, which catches a
 * stray `confidence`-style key anywhere in the payload, and the harness's
 * published prose patterns, which catch "roughly 70% likely" in a sentence.
 */
export function checkS3(context: CheckContext): CheckResult {
  const violations: Violation[] = [];

  for (const hit of findFabricatedConfidence(subjectRun(context))) {
    violations.push({ recommendation_id: null, detail: `Contract guard: ${hit}` });
  }

  for (const recommendation of subjectRecommendations(context)) {
    for (const hit of scanText(narrativeFields(recommendation), NUMERIC_CONFIDENCE_PATTERNS)) {
      violations.push({
        recommendation_id: recommendation.id,
        detail: `${hit.description} in '${hit.field}': ${hit.excerpt}`,
        offending_value: hit.pattern_id,
      });
    }
  }
  for (const hit of scanText(warningFields(subjectWarnings(context)), NUMERIC_CONFIDENCE_PATTERNS)) {
    violations.push({
      recommendation_id: null,
      detail: `${hit.description} in ${hit.field}: ${hit.excerpt}`,
      offending_value: hit.pattern_id,
    });
  }

  return fromViolations(
    'S3',
    violations,
    'No numeric confidence, probability or percentage found in fields or prose.',
  );
}

/**
 * S4 — the product's central discipline.
 *
 * The schema already requires each narrative field to be non-empty, so what is
 * left to check is that they are genuinely different: a model that pastes the
 * same sentence into `observation` and `inference` has not separated fact from
 * interpretation, it has only filled the boxes.
 */
export function checkS4(context: CheckContext): CheckResult {
  const violations: Violation[] = [];
  for (const recommendation of subjectRecommendations(context)) {
    const seen = new Map<string, string>();
    for (const [name, text] of narrativeFields(recommendation)) {
      const normalised = text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (normalised === '') continue;
      const previous = seen.get(normalised);
      if (previous !== undefined) {
        violations.push({
          recommendation_id: recommendation.id,
          detail: `Fields '${previous}' and '${name}' carry identical text, so observation, inference and action are not actually separated.`,
          offending_value: text,
        });
      } else {
        seen.set(normalised, name);
      }
    }
  }
  return fromViolations(
    'S4',
    violations,
    subjectRecommendations(context).length === 0
      ? 'No recommendations to inspect; nothing conflates observation with action.'
      : 'Every recommendation separates observation, inference, action, trade-off, uncertainty and next check.',
  );
}
