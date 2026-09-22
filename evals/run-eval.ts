#!/usr/bin/env tsx
/**
 * Five-scenario model comparison harness (EWE-71).
 *
 * Runs five fixed cases against one or more models on byte-identical input and
 * reports deterministic contract checks, the metrics the provider actually
 * reported, and a human-review worksheet for the one judgement no machine here
 * is allowed to make.
 *
 * Two rules are structural rather than editorial:
 *   1. A metric that was not measured is reported as `not measured`, never as a
 *      number. Recorded and authored output carries null metrics with a reason.
 *   2. Source entailment is reviewed by a person. The harness emits the
 *      worksheet and refuses to score it.
 *
 * See `evals/README.md` for the real-run command and `evals/rubric.md` for what
 * each check asserts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { type RunResult } from '@/domain/contracts';
import { CliError, USAGE, defaultRunId, parseArgs } from './lib/cli';
import { loadCases } from './lib/case-schema';
import { CHECK_IDS } from './lib/checks';
import { diffFingerprints, sha256, type InputFingerprint } from './lib/fingerprint';
import { parseCsv, summariseReview, type ReviewRow } from './lib/human-review';
import { casesDir, repoRoot, resultsDir } from './lib/paths';
import { writeReport } from './lib/report';
import { runOneCase } from './lib/runner';
import { loadSettings } from './lib/settings';
import { medianMetric, sumMetric, type EvalTelemetry } from './lib/telemetry';
import { createTransport } from './lib/transport';
import {
  isFullyCompliant,
  tallyOutcomes,
  type CaseRunRecord,
  type EvalRunReport,
  type ModelAggregate,
} from './lib/run-record';

const HARNESS_VERSION = '1.0.0';

async function main(argv: string[]): Promise<number> {
  let options;
  try {
    options = parseArgs(argv, process.env);
  } catch (error) {
    if (error instanceof CliError) {
      console.error(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    throw error;
  }
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const root = repoRoot();
  const settings = loadSettings(root);
  const repeats = Number.isNaN(options.repeats) ? settings.repeats_per_case : options.repeats;
  const allCases = loadCases(casesDir(root));
  const cases = allCases.filter((entry) => options.caseIds.includes(entry.case_id));
  const transport = createTransport(options.mode, process.env);

  const startedAt = new Date();
  const runId = options.runId ?? defaultRunId(options.mode, startedAt);

  console.log(`Squad Screen evaluation harness ${HARNESS_VERSION}`);
  console.log(transport.describe());
  console.log(
    `${cases.length} case(s) x ${options.models.length} model(s) x ${repeats} repeat(s) = ${cases.length * options.models.length * repeats} run(s)\n`,
  );

  const runs: CaseRunRecord[] = [];
  const packetSources = new Set<string>();
  const fingerprintByModel: Record<string, InputFingerprint> = {};
  // Completed base runs, so a case declaring a stability baseline compares
  // against the same model and repeat rather than across them.
  const baseRuns = new Map<string, RunResult>();

  for (const model of options.models) {
    for (const evalCase of cases) {
      for (let repeat = 1; repeat <= repeats; repeat += 1) {
        const baselineKey =
          evalCase.stability_baseline === null
            ? null
            : `${model.label}::${evalCase.stability_baseline}::${repeat}`;
        if (baselineKey !== null && !baseRuns.has(baselineKey)) {
          console.warn(
            `  .. ${evalCase.case_id} declares stability baseline '${evalCase.stability_baseline}', which has not run for ${model.label} repeat ${repeat}. R3 will report not_measured rather than assume stability.`,
          );
        }
        const { record, packet, baseRun } = await runOneCase({
          evalCase,
          model,
          repeat,
          settings,
          transport,
          stabilityBaseline: baselineKey === null ? null : (baseRuns.get(baselineKey) ?? null),
        });
        if (baseRun !== null) {
          baseRuns.set(`${model.label}::${evalCase.case_id}::${repeat}`, baseRun);
        }
        runs.push(record);
        packetSources.add(packet.label);
        // One fingerprint per model per case; comparability is asserted below.
        fingerprintByModel[`${model.label}::${evalCase.case_id}`] = record.input_fingerprint;
        console.log(
          `  ${statusGlyph(record)} ${evalCase.case_id} / ${model.label} / repeat ${repeat} — ${summariseChecks(record)}`,
        );
      }
    }
  }

  const mismatches = collectFingerprintMismatches(options.models.map((m) => m.label), cases.map((c) => c.case_id), fingerprintByModel);
  const sharedFingerprint =
    mismatches.length === 0 && options.models.length > 0
      ? sharedFingerprintOf(cases.map((c) => c.case_id), options.models[0]?.label ?? '', fingerprintByModel)
      : null;

  const expectedReviewRows = runs.flatMap((run) => run.review_rows);
  const suppliedReview = loadSuppliedReview(options.humanReviewPath);

  const report: EvalRunReport = {
    run_id: runId,
    harness_version: HARNESS_VERSION,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    transport_mode: options.mode,
    node_version: process.version,
    settings,
    prompt_version: runs[0]?.telemetry.base.prompt_version ?? 'unknown',
    models: options.models,
    case_ids: cases.map((entry) => entry.case_id),
    repeats,
    shared_input_fingerprint: sharedFingerprint,
    fingerprint_mismatches: mismatches,
    runs,
    aggregates: options.models.map((model) => aggregate(model.label, model.model_id, runs, cases.length)),
    human_review: summariseReview(expectedReviewRows, suppliedReview),
    disclosures: buildDisclosures(options.mode, settings.small_sample_disclosure, packetSources, runs),
  };

  const artifacts = writeReport(report, options.outDir ?? resultsDir(root));

  console.log('');
  for (const disclosure of report.disclosures) console.log(`! ${disclosure}`);
  console.log('');
  console.log(`Wrote ${artifacts.summary_md}`);
  console.log(`Wrote ${artifacts.run_json}`);
  console.log(`Wrote ${artifacts.human_review_csv}`);

  const unexpected = runs.reduce((sum, run) => sum + run.expectation_deltas.length, 0);
  if (unexpected > 0) {
    console.error(
      `\n${unexpected} check(s) departed from the expectation declared in their case file. See the Findings table in ${artifacts.summary_md}.`,
    );
    return 1;
  }
  console.log('\nEvery check matched the expectation declared in its case file.');
  return 0;
}

function statusGlyph(record: CaseRunRecord): string {
  if (record.status !== 'completed') return '!';
  return record.expectation_deltas.length === 0 ? 'ok' : 'XX';
}

function summariseChecks(record: CaseRunRecord): string {
  if (record.status !== 'completed') {
    return `${record.status}: ${record.error?.code ?? 'unknown'}`;
  }
  const tally = tallyOutcomes(record.checks);
  const parts = [`${tally.pass} pass`, `${tally.fail} fail`, `${tally.not_applicable} n/a`];
  if (tally.not_measured > 0) parts.push(`${tally.not_measured} not measured`);
  return `${parts.join(', ')} [${record.output_origin}]`;
}

function collectFingerprintMismatches(
  modelLabels: readonly string[],
  caseIds: readonly string[],
  byKey: Record<string, InputFingerprint>,
) {
  if (modelLabels.length < 2) return [];
  return caseIds.flatMap((caseId) => {
    const perModel: Record<string, InputFingerprint> = {};
    for (const label of modelLabels) {
      const fingerprint = byKey[`${label}::${caseId}`];
      if (fingerprint !== undefined) perModel[label] = fingerprint;
    }
    return diffFingerprints(perModel).map((mismatch) => ({
      ...mismatch,
      component: `${caseId}.${mismatch.component}`,
    }));
  });
}

/**
 * One value covering the whole comparison. The per-case component hashes stay
 * in run.json, so a mismatch can be traced without the summary carrying five
 * unreadable hashes.
 */
function sharedFingerprintOf(
  caseIds: readonly string[],
  firstLabel: string,
  byKey: Record<string, InputFingerprint>,
): string | null {
  const parts = caseIds.map((caseId) => byKey[`${firstLabel}::${caseId}`]?.combined ?? null);
  return parts.some((part) => part === null) ? null : sha256(parts);
}

function aggregate(
  label: string,
  modelId: string,
  runs: readonly CaseRunRecord[],
  caseCount: number,
): ModelAggregate {
  const mine = runs.filter((run) => run.model_label === label);
  const telemetry: EvalTelemetry[] = mine.flatMap((run) =>
    run.telemetry.rerun === null
      ? [run.telemetry.base]
      : [run.telemetry.base, run.telemetry.rerun],
  );
  const checks = mine.flatMap((run) => run.checks);
  const tally = tallyOutcomes(checks);
  const caseIds = [...new Set(mine.map((run) => run.case_id))];

  return {
    model_label: label,
    model_id: modelId,
    runs: mine.length,
    completed: mine.filter((run) => run.status === 'completed').length,
    errored: mine.filter((run) => run.status !== 'completed').length,
    checks_passed: tally.pass,
    checks_failed: tally.fail,
    checks_not_applicable: tally.not_applicable,
    checks_not_measured: tally.not_measured,
    cases_fully_compliant: caseIds.filter((caseId) =>
      isFullyCompliant(mine.filter((run) => run.case_id === caseId)),
    ).length,
    cases_total: caseCount,
    median_duration_ms: medianMetric(telemetry, 'duration_ms'),
    total_input_tokens: sumMetric(telemetry, 'input_tokens'),
    total_output_tokens: sumMetric(telemetry, 'output_tokens'),
    total_retries: sumMetric(telemetry, 'retries'),
    total_calls: sumMetric(telemetry, 'calls'),
    total_estimated_cost_usd: sumMetric(telemetry, 'estimated_inference_cost_usd'),
  };
}

function buildDisclosures(
  mode: string,
  smallSample: string,
  packetSources: ReadonlySet<string>,
  runs: readonly CaseRunRecord[],
): string[] {
  const disclosures: string[] = [smallSample];
  const origins = [...new Set(runs.map((run) => run.output_origin))].sort();
  if (mode !== 'live' || origins.some((origin) => origin !== 'live')) {
    disclosures.push(
      `Output origin: ${origins.join(', ')}. Nothing in this report was measured against a live provider, so every latency, token and cost figure reads "not measured". This is a harness verification run, not a benchmark.`,
    );
  }
  const sources = [...packetSources].sort();
  if (sources.length === 1) {
    disclosures.push(`Evidence packet: ${sources[0]}.`);
  } else if (sources.length > 1) {
    // Only the variant name differs between these, so the shared prefix is
    // printed once rather than repeated per case.
    const shared = sources[0]?.split(', variant')[0] ?? '';
    const variants = sources
      .map((source) => source.match(/variant '([^']+)'/)?.[1] ?? source)
      .join(', ');
    disclosures.push(`Evidence packet: ${shared}. Variants used: ${variants}.`);
  }
  disclosures.push(
    'No tactical-quality score appears anywhere in this report. The checks measure contract compliance and grounding; whether the advice is good football requires an analyst.',
  );
  return disclosures;
}

function loadSuppliedReview(pathOrNull: string | null): ReviewRow[] | null {
  if (pathOrNull === null) return null;
  if (!existsSync(pathOrNull)) {
    throw new Error(`Human-review worksheet not found: ${pathOrNull}`);
  }
  return parseCsv(readFileSync(pathOrNull, 'utf8'));
}

// Guard against a silent drift between the rubric's check list and the code's.
if (CHECK_IDS.length !== 18) {
  throw new Error(
    `Expected 18 deterministic checks as documented in evals/rubric.md, found ${CHECK_IDS.length}.`,
  );
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(
      `\nThe evaluation harness could not run. Nothing was measured and no results were written.\n\n${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 2;
  });
