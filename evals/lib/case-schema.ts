import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { CHECK_IDS, type CheckId, type CheckOutcome } from './checks/types';

/**
 * A case declares which checks must hold, not which recommendation is correct.
 * Encoding a winning answer would make the harness score agreement with its
 * author rather than compliance with the contract (EWE-62 acceptance criterion).
 */

const outcomeSchema = z.enum(['pass', 'fail', 'not_applicable', 'not_measured']);

const overrideTargetSchema = z.object({
  /**
   * Resolved at run time rather than hard-coded, so the case survives a fixture
   * renumbering. `supplied_minutes_constraint` finds the player carrying a
   * staff-supplied max_minutes (Player A); `unreferenced_available_player`
   * finds an available player no base recommendation touches.
   */
  resolve_by: z.enum(['supplied_minutes_constraint', 'unreferenced_available_player']),
  availability: z.enum(['available', 'unavailable', 'monitor']),
});

const scenarioSchema = z.object({
  scenario_id: z.string().min(1),
  label: z.string().min(1),
  override_target: overrideTargetSchema,
});

export const evalCaseSchema = z
  .object({
    case_id: z.string().min(1),
    title: z.string().min(1),
    intent: z.string().min(1),
    /** EWE-62's variant IDs, so the mapping from case to curated packet is one to one. */
    fixture_variant: z.enum([
      'complete_evidence',
      'conflicting_availability',
      'missing_tactical_support',
      'unavailable_player_a',
      'irrelevant_context_change',
    ]),
    phase: z.enum(['generate', 'generate_then_reevaluate']),
    scenario: scenarioSchema.nullable(),
    /**
     * Another case whose run this one's actionable content must match. Used by
     * the irrelevant-context-change case, where the property under test is that
     * a change to unrelated context does not move the advice.
     */
    stability_baseline: z.string().min(1).nullable().default(null),
    /**
     * The properties EWE-62's variant declares, quoted so a reader can see which
     * deterministic check carries each one.
     */
    fixture_expected_checks: z.array(z.string().min(1)).default([]),
    expected_checks: z.record(z.enum(CHECK_IDS), outcomeSchema),
    not_applicable_reasons: z.record(z.string(), z.string()).default({}),
    human_review: z.object({
      required: z.boolean(),
      question: z.string().min(1),
    }),
    notes: z.string().default(''),
  })
  .superRefine((value, ctx) => {
    for (const id of CHECK_IDS) {
      if (value.expected_checks[id] === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `expected_checks is missing '${id}'. Every check must be declared explicitly so a silent omission cannot read as a pass.`,
        });
      }
    }
    for (const [id, outcome] of Object.entries(value.expected_checks)) {
      if (outcome === 'not_applicable' && value.not_applicable_reasons[id] === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Check '${id}' is declared not_applicable without a reason in not_applicable_reasons.`,
        });
      }
    }
    for (const id of Object.keys(value.not_applicable_reasons)) {
      if (value.expected_checks[id as CheckId] !== 'not_applicable') {
        ctx.addIssue({
          code: 'custom',
          message: `not_applicable_reasons has an entry for '${id}', which is not declared not_applicable.`,
        });
      }
    }
    const needsScenario = value.phase === 'generate_then_reevaluate';
    if (needsScenario && value.scenario === null) {
      ctx.addIssue({
        code: 'custom',
        message: `Case '${value.case_id}' reevaluates but declares no scenario.`,
      });
    }
    if (!needsScenario && value.scenario !== null) {
      ctx.addIssue({
        code: 'custom',
        message: `Case '${value.case_id}' declares a scenario but never reevaluates.`,
      });
    }
    // R3 is the one revision check that also applies to a stability baseline,
    // where two independent generate runs are compared instead of a rerun.
    const rerunOnlyChecks: CheckId[] = ['R1', 'R2', 'R4'];
    if (!needsScenario) {
      for (const id of rerunOnlyChecks) {
        if (value.expected_checks[id] !== 'not_applicable') {
          ctx.addIssue({
            code: 'custom',
            message: `Check '${id}' cannot be '${value.expected_checks[id]}' on a generate-only case.`,
          });
        }
      }
      if (value.stability_baseline === null && value.expected_checks.R3 !== 'not_applicable') {
        ctx.addIssue({
          code: 'custom',
          message:
            "Check 'R3' needs either a scenario rerun or a stability_baseline to compare against.",
        });
      }
    }
    if (value.stability_baseline === value.case_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'A case cannot be its own stability baseline.',
      });
    }
  });

export type EvalCase = z.infer<typeof evalCaseSchema>;

/** Fixed order, so reports and fingerprints do not depend on directory listing order. */
export const CASE_ORDER = [
  'complete-evidence',
  'conflicting-availability',
  'missing-tactical-support',
  'unavailable-player-a',
  'irrelevant-context-change',
] as const;

export function expectationFor(evalCase: EvalCase, id: CheckId): CheckOutcome {
  return evalCase.expected_checks[id] ?? 'not_measured';
}

export function loadCases(directory: string): EvalCase[] {
  const files = readdirSync(directory)
    .filter((name) => name.endsWith('.case.json'))
    .sort();
  const cases = files.map((name) => {
    const raw: unknown = JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
    const parsed = evalCaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Eval case '${name}' is invalid:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`,
      );
    }
    return parsed.data;
  });

  const ids = cases.map((c) => c.case_id);
  const missing = CASE_ORDER.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `The comparison requires all five fixed cases. Missing: ${missing.join(', ')}.`,
    );
  }
  const unexpected = ids.filter((id) => !CASE_ORDER.includes(id as (typeof CASE_ORDER)[number]));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected case '${unexpected.join(', ')}'. The five cases are fixed; adding one changes the comparison and must be recorded in the rubric first.`,
    );
  }
  return [...cases].sort((a, b) => CASE_ORDER.indexOf(a.case_id as (typeof CASE_ORDER)[number]) - CASE_ORDER.indexOf(b.case_id as (typeof CASE_ORDER)[number]));
}
