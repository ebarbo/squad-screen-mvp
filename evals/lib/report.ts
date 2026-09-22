import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CHECK_IDS, CHECK_TITLES, type CheckId } from './checks/types';
import { toCsv } from './human-review';
import { formatMetric } from './telemetry';
import { type EvalRunReport, type CaseRunRecord } from './run-record';

export interface WrittenArtifacts {
  directory: string;
  run_json: string;
  summary_md: string;
  human_review_csv: string;
}

export function writeReport(report: EvalRunReport, resultsRoot: string): WrittenArtifacts {
  const directory = path.join(resultsRoot, report.run_id);
  mkdirSync(directory, { recursive: true });

  const runJson = path.join(directory, 'run.json');
  const summaryMd = path.join(directory, 'summary.md');
  const reviewCsv = path.join(directory, 'human-review.csv');

  writeFileSync(runJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(summaryMd, renderSummary(report), 'utf8');
  writeFileSync(reviewCsv, toCsv(report.runs.flatMap((run) => run.review_rows)), 'utf8');

  return {
    directory,
    run_json: runJson,
    summary_md: summaryMd,
    human_review_csv: reviewCsv,
  };
}

const OUTCOME_GLYPH: Record<string, string> = {
  pass: 'pass',
  fail: 'FAIL',
  not_applicable: 'n/a',
  not_measured: 'not measured',
};

export function renderSummary(report: EvalRunReport): string {
  const lines: string[] = [];

  lines.push(`# Eval run ${report.run_id}`);
  lines.push('');
  for (const disclosure of report.disclosures) lines.push(`> ${disclosure}`);
  lines.push('');

  lines.push('## Run metadata');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Transport | \`${report.transport_mode}\` |`);
  lines.push(`| Started | ${report.started_at} |`);
  lines.push(`| Finished | ${report.finished_at} |`);
  lines.push(`| Harness version | ${report.harness_version} |`);
  lines.push(`| Node | ${report.node_version} |`);
  lines.push(`| Prompt version | ${report.prompt_version} |`);
  lines.push(`| Cases | ${report.case_ids.length} (${report.case_ids.join(', ')}) |`);
  lines.push(`| Repeats per case | ${report.repeats} |`);
  lines.push(`| Total runs | ${report.runs.length} |`);
  lines.push(
    `| Shared input fingerprint | ${report.shared_input_fingerprint ?? '**inputs differed — comparison invalid**'} |`,
  );
  for (const model of report.models) {
    lines.push(`| Model \`${model.label}\` | \`${model.model_id}\` (${model.source}) |`);
  }
  lines.push('');

  if (report.fingerprint_mismatches.length > 0) {
    lines.push('## Input fingerprint mismatch');
    lines.push('');
    lines.push(
      'The models did not receive identical input, so any difference between them is not attributable to the model. This comparison is invalid.',
    );
    lines.push('');
    lines.push('| Component | Fingerprints |');
    lines.push('| --- | --- |');
    for (const mismatch of report.fingerprint_mismatches) {
      const detail = Object.entries(mismatch.fingerprints)
        .map(([label, hash]) => `${label}: \`${hash.slice(0, 12)}\``)
        .join('; ');
      lines.push(`| \`${mismatch.component}\` | ${detail} |`);
    }
    lines.push('');
  }

  lines.push('## Measured metrics');
  lines.push('');
  lines.push(
    '`not measured` means the figure was never produced. It is not an estimate and not a zero.',
  );
  lines.push('');
  lines.push(
    '| Model | Runs | Completed | Errored | Median latency | Input tokens | Output tokens | Retries | Calls | Estimated inference cost |',
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const aggregate of report.aggregates) {
    lines.push(
      `| \`${aggregate.model_label}\` | ${aggregate.runs} | ${aggregate.completed} | ${aggregate.errored} | ${formatMetric(aggregate.median_duration_ms, ' ms')} | ${formatMetric(aggregate.total_input_tokens)} | ${formatMetric(aggregate.total_output_tokens)} | ${formatMetric(aggregate.total_retries)} | ${formatMetric(aggregate.total_calls)} | ${formatCost(aggregate.total_estimated_cost_usd)} |`,
    );
  }
  lines.push('');
  const reasons = collectMetricReasons(report);
  if (reasons.length > 0) {
    lines.push('Why metrics are unavailable:');
    lines.push('');
    for (const reason of reasons) lines.push(`- ${reason}`);
    lines.push('');
  }

  lines.push('## Deterministic checks');
  lines.push('');
  lines.push(
    'Rows are checks (see `evals/rubric.md`), columns are model × case. A cell shows the worst outcome across repeats.',
  );
  lines.push('');
  const columns = report.models.flatMap((model) =>
    report.case_ids.map((caseId) => ({ model: model.label, caseId })),
  );
  lines.push(`| Check | ${columns.map((c) => `${c.model} / ${c.caseId}`).join(' | ')} |`);
  lines.push(`| --- | ${columns.map(() => '---').join(' | ')} |`);
  for (const id of CHECK_IDS) {
    const cells = columns.map((column) => {
      const runs = report.runs.filter(
        (run) => run.model_label === column.model && run.case_id === column.caseId,
      );
      return OUTCOME_GLYPH[worstOutcome(runs, id)] ?? 'not measured';
    });
    lines.push(`| \`${id}\` ${CHECK_TITLES[id]} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  lines.push('## Compliance summary');
  lines.push('');
  lines.push('| Model | Cases fully compliant | Checks passed | Checks failed | n/a | Not measured |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const aggregate of report.aggregates) {
    lines.push(
      `| \`${aggregate.model_label}\` | ${aggregate.cases_fully_compliant} / ${aggregate.cases_total} | ${aggregate.checks_passed} | ${aggregate.checks_failed} | ${aggregate.checks_not_applicable} | ${aggregate.checks_not_measured} |`,
    );
  }
  lines.push('');

  const deltas = report.runs.flatMap((run) =>
    run.expectation_deltas.map((delta) => ({ run, delta })),
  );
  lines.push('## Findings');
  lines.push('');
  if (deltas.length === 0) {
    lines.push('No check departed from its declared expectation.');
  } else {
    lines.push('| Case | Model | Repeat | Check | Expected | Actual | Detail |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const { run, delta } of deltas) {
      const check = run.checks.find((c) => c.id === delta.check_id);
      lines.push(
        `| ${run.case_id} | \`${run.model_label}\` | ${run.repeat} | \`${delta.check_id}\` | ${delta.expected} | ${delta.actual} | ${escapeCell(check?.reason ?? '')} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Source entailment (human review)');
  lines.push('');
  const review = report.human_review;
  lines.push(`Status: **${review.status}**`);
  lines.push('');
  if (review.reason !== null) lines.push(`${review.reason}`);
  lines.push('');
  lines.push(`Rows requiring review: ${review.total_rows}. Rows judged: ${review.reviewed_rows}.`);
  if (review.counts !== null) {
    lines.push('');
    lines.push('| Verdict | Count |');
    lines.push('| --- | --- |');
    for (const [verdict, count] of Object.entries(review.counts)) {
      lines.push(`| ${verdict} | ${count} |`);
    }
    lines.push('');
    lines.push(`Reviewers: ${review.reviewers.join(', ') || 'none recorded'}`);
  }
  lines.push('');
  lines.push(
    'No tactical-quality score is produced anywhere in this report. Whether a recommendation is *good football* is a judgement this harness does not make.',
  );
  lines.push('');

  const errored = report.runs.filter((run) => run.status !== 'completed');
  lines.push('## Errors and unmeasured runs');
  lines.push('');
  if (errored.length === 0) {
    lines.push('Every run completed.');
  } else {
    lines.push('| Case | Model | Repeat | Status | Code | Message |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const run of errored) {
      lines.push(
        `| ${run.case_id} | \`${run.model_label}\` | ${run.repeat} | ${run.status} | \`${run.error?.code ?? '—'}\` | ${escapeCell(run.error?.message ?? '')} |`,
      );
    }
  }
  lines.push('');
  lines.push(`Full machine-readable record: \`run.json\` alongside this file.`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function worstOutcome(runs: readonly CaseRunRecord[], id: CheckId): string {
  if (runs.length === 0) return 'not_measured';
  const outcomes = runs.map(
    (run) => run.checks.find((check) => check.id === id)?.outcome ?? 'not_measured',
  );
  for (const candidate of ['fail', 'not_measured', 'pass', 'not_applicable'] as const) {
    if (outcomes.includes(candidate)) return candidate;
  }
  return 'not_measured';
}

function formatCost(metric: Parameters<typeof formatMetric>[0]): string {
  if (metric.value === null) return 'not measured';
  return `$${metric.value.toFixed(6)} (estimate, inference only)`;
}

function collectMetricReasons(report: EvalRunReport): string[] {
  const reasons = new Set<string>();
  for (const aggregate of report.aggregates) {
    for (const metric of [
      aggregate.median_duration_ms,
      aggregate.total_input_tokens,
      aggregate.total_output_tokens,
      aggregate.total_retries,
      aggregate.total_calls,
      aggregate.total_estimated_cost_usd,
    ]) {
      if (metric.reason !== null) reasons.add(`\`${aggregate.model_label}\`: ${metric.reason}`);
    }
  }
  for (const run of report.runs) {
    for (const reason of Object.values(run.telemetry.base.unavailable_reasons)) {
      reasons.add(reason);
    }
  }
  return [...reasons].sort();
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
