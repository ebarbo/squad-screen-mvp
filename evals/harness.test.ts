/**
 * Proof that the harness cannot report a number it did not measure, and cannot
 * quietly compare two models on different input.
 *
 * These are the project's honesty gates expressed as tests. If one of them ever
 * goes green by reporting a plausible figure instead of `not measured`, the
 * harness has become the thing the acceptance criteria exist to prevent.
 *
 * Run: npx vitest run --config evals/vitest.config.ts
 */
import { describe, expect, it } from 'vitest';
import { CASE_ORDER, loadCases } from './lib/case-schema';
import { CHECK_IDS } from './lib/checks';
import { diffFingerprints, canonicalJson, fingerprintInput, sha256 } from './lib/fingerprint';
import { parseCsv, summariseReview, toCsv, type ReviewRow } from './lib/human-review';
import { casesDir } from './lib/paths';
import { loadSettings } from './lib/settings';
import { CliError, parseArgs } from './lib/cli';
import { fromContractTelemetry } from './lib/transport';
import {
  estimateInferenceCost,
  formatMetric,
  medianMetric,
  sumMetric,
  unmeasuredTelemetry,
  type EvalTelemetry,
} from './lib/telemetry';
import { type Telemetry } from '@/domain/contracts';

const liveTelemetry: Telemetry = {
  model_id: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  prompt_version: 'v1',
  transport: 'live',
  duration_ms: 1234,
  input_tokens: 900,
  output_tokens: 111,
  usage_note: null,
  call_count: 2,
  retry_count: 1,
  pricing_basis: 'unset',
  estimated_inference_cost_usd: null,
};

describe('nothing that was not measured is reported as a number', () => {
  it('reports every metric as null, with a reason, for authored output', () => {
    const telemetry = unmeasuredTelemetry('authored', 'none', 'v1', 'never sent to a provider');
    for (const field of [
      'duration_ms',
      'input_tokens',
      'output_tokens',
      'retries',
      'calls',
      'estimated_inference_cost_usd',
    ] as const) {
      expect(telemetry[field]).toBeNull();
      expect(telemetry.unavailable_reasons[field]).toBeTruthy();
    }
  });

  it('refuses to treat the stub transport\u2019s zero-millisecond duration as a measurement', () => {
    const stub: Telemetry = { ...liveTelemetry, transport: 'stub', duration_ms: 0 };
    const translated = fromContractTelemetry(stub, null, 'stub');
    expect(translated.origin).toBe('stub');
    expect(translated.duration_ms).toBeNull();
    expect(translated.input_tokens).toBeNull();
    expect(translated.unavailable_reasons.duration_ms).toContain('No provider call was made');
  });

  it('keeps live metrics when the adapter really called a provider', () => {
    const translated = fromContractTelemetry(liveTelemetry, null, 'live');
    expect(translated.duration_ms).toBe(1234);
    expect(translated.input_tokens).toBe(900);
    expect(translated.output_tokens).toBe(111);
    expect(translated.retries).toBe(1);
    expect(translated.calls).toBe(2);
  });

  it('leaves cost null when no pricing basis is configured, and says why', () => {
    const translated = fromContractTelemetry(liveTelemetry, null, 'live');
    expect(translated.estimated_inference_cost_usd).toBeNull();
    expect(translated.unavailable_reasons.estimated_inference_cost_usd).toContain('pricing basis');
  });

  it('computes cost only from reported usage and configured prices', () => {
    const estimate = estimateInferenceCost(1_000_000, 500_000, {
      input_usd_per_mtok: 0.2,
      output_usd_per_mtok: 0.6,
      source: 'test',
    });
    expect(estimate.usd).toBeCloseTo(0.5, 10);
    expect(estimate.reason).toBeNull();
  });

  it('never estimates cost from a token count alone', () => {
    const estimate = estimateInferenceCost(1000, 500, null);
    expect(estimate.usd).toBeNull();
    expect(estimate.reason).toContain('No pricing basis configured');
  });

  it('never estimates cost from a price alone', () => {
    const estimate = estimateInferenceCost(null, null, {
      input_usd_per_mtok: 0.2,
      output_usd_per_mtok: 0.6,
      source: 'test',
    });
    expect(estimate.usd).toBeNull();
    expect(estimate.reason).toContain('did not report token usage');
  });

  it('refuses to publish a partial sum as a total', () => {
    const runs: EvalTelemetry[] = [
      { ...unmeasuredTelemetry('authored', 'm', 'v', 'no call'), input_tokens: 100 },
      unmeasuredTelemetry('authored', 'm', 'v', 'no call'),
    ];
    const total = sumMetric(runs, 'input_tokens');
    expect(total.value).toBeNull();
    expect(total.measured_runs).toBe(1);
    expect(total.total_runs).toBe(2);
    expect(total.reason).toContain('partial sum would misstate the total');
  });

  it('prints "not measured" rather than a zero', () => {
    const runs = [unmeasuredTelemetry('authored', 'm', 'v', 'no call')];
    expect(formatMetric(sumMetric(runs, 'duration_ms'), ' ms')).toBe('not measured');
    expect(formatMetric(medianMetric(runs, 'duration_ms'), ' ms')).toBe('not measured');
  });
});

describe('a comparison is only valid on identical input', () => {
  const build = (settings: unknown) =>
    fingerprintInput({
      case_id: 'complete-evidence',
      match_context: { a: 1, b: [2, 3] },
      scenario: null,
      prompt_text: 'instructions',
      prompt_version: 'v1',
      output_schema: 'ModelSynthesisSchema',
      settings,
    });

  it('produces the same fingerprint regardless of key order', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(sha256({ b: 1, a: 2 })).toBe(sha256({ a: 2, b: 1 }));
  });

  it('reports no mismatch when two models saw the same input', () => {
    expect(diffFingerprints({ primary: build({ t: 0 }), comparison: build({ t: 0 }) })).toEqual([]);
  });

  it('names the component that diverged when they did not', () => {
    const mismatches = diffFingerprints({
      primary: build({ temperature: 0 }),
      comparison: build({ temperature: 1 }),
    });
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.component).toBe('settings');
  });
});

describe('source entailment is never scored by the machine', () => {
  const row = (overrides: Partial<ReviewRow> = {}): ReviewRow => ({
    case_id: 'complete-evidence',
    model_label: 'primary',
    repeat: 1,
    phase: 'generate',
    recommendation_id: 'rec_one',
    claim: 'A claim, with a comma and a "quote".',
    cited_evidence_ids: 'ev_a ev_b',
    cited_excerpts: 'ev_a: text || ev_b: more text',
    entailment_verdict: '',
    reviewer: '',
    reviewed_at: '',
    note: '',
    ...overrides,
  });

  it('stays pending when no worksheet is supplied', () => {
    const summary = summariseReview([row()], null);
    expect(summary.status).toBe('pending_human_review');
    expect(summary.counts).toBeNull();
  });

  it('stays pending, with no counts, when the worksheet is only half filled', () => {
    const expected = [row(), row({ recommendation_id: 'rec_two' })];
    const supplied = [
      row({ entailment_verdict: 'supported', reviewer: 'ewerton' }),
      row({ recommendation_id: 'rec_two' }),
    ];
    const summary = summariseReview(expected, supplied);
    expect(summary.status).toBe('pending_human_review');
    expect(summary.counts).toBeNull();
    expect(summary.reason).toContain('misstate the denominator');
  });

  it('reports counts only once every row carries a verdict', () => {
    const expected = [row(), row({ recommendation_id: 'rec_two' })];
    const supplied = [
      row({ entailment_verdict: 'supported', reviewer: 'ewerton' }),
      row({ recommendation_id: 'rec_two', entailment_verdict: 'unsupported', reviewer: 'ewerton' }),
    ];
    const summary = summariseReview(expected, supplied);
    expect(summary.status).toBe('reviewed');
    expect(summary.counts).toEqual({
      supported: 1,
      partially_supported: 0,
      unsupported: 1,
      unclear: 0,
    });
    expect(summary.reviewers).toEqual(['ewerton']);
  });

  it('survives a CSV round trip with quotes and commas intact', () => {
    const original = [row({ entailment_verdict: 'unclear', reviewer: 'a, b', note: 'says "maybe"' })];
    const parsed = parseCsv(toCsv(original));
    expect(parsed).toEqual(original);
  });

  it('rejects a verdict outside the allowed vocabulary', () => {
    const csv = toCsv([row()]).replace(/,,,,$/m, ',excellent,,,');
    expect(() => parseCsv(csv)).toThrow(/not a valid entailment verdict/);
  });
});

describe('the five cases are fixed and fully declared', () => {
  const cases = loadCases(casesDir());

  it('loads exactly the five fixed cases, in order', () => {
    expect(cases.map((entry) => entry.case_id)).toEqual([...CASE_ORDER]);
  });

  it('declares an expectation for every check, so an omission cannot read as a pass', () => {
    for (const entry of cases) {
      for (const id of CHECK_IDS) {
        expect(entry.expected_checks[id], `${entry.case_id} is missing ${id}`).toBeDefined();
      }
    }
  });

  it('gives a reason for every not-applicable expectation', () => {
    for (const entry of cases) {
      for (const [id, expectation] of Object.entries(entry.expected_checks)) {
        if (expectation !== 'not_applicable') continue;
        expect(entry.not_applicable_reasons[id], `${entry.case_id}.${id}`).toBeTruthy();
      }
    }
  });

  it('carries the properties the curated packet declares', () => {
    for (const entry of cases) {
      expect(entry.fixture_expected_checks.length, entry.case_id).toBeGreaterThan(0);
    }
  });

  it('requires a human-review question on every case', () => {
    for (const entry of cases) {
      expect(entry.human_review.required).toBe(true);
      expect(entry.human_review.question.length).toBeGreaterThan(20);
    }
  });
});

describe('settings are shared and explicit', () => {
  it('loads decoding settings and a small-sample disclosure', () => {
    const settings = loadSettings();
    expect(settings.decoding.temperature).toBe(0);
    expect(settings.repeats_per_case).toBeGreaterThanOrEqual(2);
    expect(settings.small_sample_disclosure).toContain('not general model quality');
    expect(settings.cache_policy).toContain('disabled');
  });
});

describe('the CLI fails loudly rather than guessing', () => {
  it('refuses live mode with no model IDs configured', () => {
    expect(() => parseArgs(['--mode', 'live'], {})).toThrow(CliError);
  });

  it('uses the configured model IDs when they are present', () => {
    const options = parseArgs(['--mode', 'live'], {
      SQUAD_SCREEN_MODEL_ID: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
      SQUAD_SCREEN_COMPARISON_MODEL_ID: 'openai/gpt-oss-120b',
    });
    expect(options.models.map((model) => model.label)).toEqual(['primary', 'comparison']);
    expect(options.models[1]?.model_id).toBe('openai/gpt-oss-120b');
  });

  it('rejects an unknown case ID instead of silently running fewer cases', () => {
    expect(() => parseArgs(['--cases', 'not-a-case'], {})).toThrow(/Unknown case ID/);
  });

  it('rejects a duplicate model label', () => {
    expect(() => parseArgs(['--models', 'a=one,a=two'], {})).toThrow(/Duplicate model label/);
  });
});
