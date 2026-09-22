#!/usr/bin/env tsx
/**
 * Headless walk of the product loop, and the pre-demo liveness check.
 *
 * `check:env` only resolves configuration — it makes no network call, so it can
 * tell you a key is present but not that the provider answers. This command is
 * the one that actually proves it: it generates a base run, re-evaluates it with
 * one availability assumption, and prints what changed.
 *
 * Run it before presenting. It exits non-zero on any failure, so a broken
 * provider is discovered here rather than on stage.
 *
 *   npm run demo:intelligence
 *   npm run demo:intelligence -- --stub    # offline, clearly labeled
 */
import { DEMO_FIXTURE } from '../data/demo/fixture';
import { PLAYER_A_ID } from '../data/demo/squad';
import type { Recommendation, RunResult, ScenarioResult } from '../src/domain/contracts';
import { describeConfigProblems, loadProviderConfig } from '../src/server/config/env';
import { ModelClient } from '../src/server/models/client';
import { ProviderError } from '../src/server/models/errors';
import { generate, reevaluateRun } from '../src/server/runs/service';

const useStub = process.argv.includes('--stub');

function rule(title: string): void {
  console.log(`\n${'\u2500'.repeat(78)}\n${title}\n${'\u2500'.repeat(78)}`);
}

function printRecommendation(recommendation: Recommendation, index: number): void {
  console.log(`\n  ${index + 1}. [${recommendation.priority}] ${recommendation.title}  (${recommendation.id})`);
  console.log(`     observation : ${recommendation.observation}`);
  console.log(`     inference   : ${recommendation.inference}`);
  console.log(`     action      : ${recommendation.action}`);
  console.log(`     trade-off   : ${recommendation.trade_off}`);
  console.log(`     uncertainty : ${recommendation.uncertainty}`);
  console.log(`     next check  : ${recommendation.next_check}`);
  console.log(`     evidence    : ${recommendation.evidence_ids.join(', ')}`);
  for (const action of recommendation.player_actions) {
    console.log(
      `     proposes    : ${action.player_id} as ${action.role}` +
        (action.planned_minutes === null ? '' : ` for ${action.planned_minutes} minutes`),
    );
  }
}

function printTelemetry(label: string, result: RunResult | ScenarioResult): void {
  const t = result.telemetry;
  console.log(`\n  ${label} telemetry`);
  console.log(`     transport   : ${t.transport}${t.transport === 'stub' ? '  (NOT live inference)' : ''}`);
  console.log(`     model       : ${t.model_id}`);
  console.log(`     prompt      : ${t.prompt_version}`);
  console.log(`     duration    : ${t.duration_ms} ms`);
  console.log(`     calls       : ${t.call_count} (${t.retry_count} retried)`);
  console.log(
    `     tokens      : in ${t.input_tokens ?? 'null'}, out ${t.output_tokens ?? 'null'}` +
      (t.usage_note === null ? '' : `  — ${t.usage_note}`),
  );
  console.log(`     est. cost   : ${t.estimated_inference_cost_usd ?? 'null'}`);
  console.log(`     cost basis  : ${t.pricing_basis}`);
}

function printWarnings(result: RunResult | ScenarioResult): void {
  if (result.warnings.length === 0) return;
  console.log('\n  warnings');
  for (const warning of result.warnings) console.log(`     [${warning.code}] ${warning.message}`);
}

async function main(): Promise<void> {
  const configResult = loadProviderConfig(useStub ? { ...process.env, SQUAD_SCREEN_MODEL_MODE: 'stub' } : process.env);

  if (!configResult.ok) {
    console.error(describeConfigProblems(configResult.problems));
    console.error('\nRun with --stub to exercise the loop offline without a provider.');
    process.exit(1);
  }

  const client = ModelClient.create(configResult.config);

  rule(`Squad Screen — ${DEMO_FIXTURE.home_team.name} v ${DEMO_FIXTURE.away_team.name}`);
  console.log(`  transport        : ${client.mode}`);
  console.log(`  model            : ${configResult.config.modelId}`);
  console.log(`  fixture          : ${DEMO_FIXTURE.id}`);
  console.log(`  information up to: ${DEMO_FIXTURE.information_cutoff}`);

  if (client.mode === 'stub') {
    console.log('\n  Stub transport selected. Output below is a deterministic offline fixture.');
    console.log('  It is NOT live inference and must not be presented as such.');
  }

  // --- Step 1: the factual briefing ----------------------------------------
  rule('1. Generate the factual briefing');
  const base = await generate({ fixtureId: DEMO_FIXTURE.id, client });

  console.log(`  run              : ${base.run_id}`);
  console.log(`  evidence snapshot: ${base.evidence_snapshot_id}`);
  console.log(`  evidence items   : ${base.evidence.length}`);
  console.log(`  recommendations  : ${base.recommendations.length}`);
  if (base.abstention_note !== null) console.log(`  note             : ${base.abstention_note}`);
  base.recommendations.forEach(printRecommendation);
  printWarnings(base);
  printTelemetry('base', base);

  // --- Step 2: one source, inspected ---------------------------------------
  const cited = base.recommendations[0]?.evidence_ids[0];
  if (cited !== undefined) {
    const item = base.evidence.find((candidate) => candidate.id === cited);
    if (item !== undefined) {
      rule('2. Inspect the evidence behind the first action');
      console.log(`  ${item.id}  status=${item.status}  mode=${item.data_mode}`);
      console.log(`  source    : ${item.source.name} (${item.source.url ?? item.source.record_id})`);
      console.log(`  origin    : ${item.source.origin_id}`);
      console.log(`  observed  : ${item.observed_at}`);
      console.log(`  published : ${item.published_at ?? 'no publication date stated'}`);
      console.log(`  excerpt   : ${item.source.excerpt}`);
      console.log(`  check     : ${item.check_notes}`);
    }
  }

  // --- Step 3: the what-if -------------------------------------------------
  rule(`3. Assume ${PLAYER_A_ID} becomes unavailable`);
  const scenario = await reevaluateRun({
    runId: base.run_id,
    overrides: [{ player_id: PLAYER_A_ID, availability: 'unavailable' }],
    client,
  });

  console.log(`  scenario run     : ${scenario.run_id} (parent ${scenario.parent_run_id})`);
  console.log(`  evidence snapshot: ${scenario.evidence_snapshot_id}`);
  scenario.recommendations.forEach(printRecommendation);

  console.log('\n  changes');
  for (const change of scenario.changes) {
    const from = change.prior_recommendation_id ?? '—';
    const to = change.recommendation_id ?? '—';
    console.log(`     ${change.change_type.padEnd(9)} ${from} -> ${to}`);
    console.log(`       ${change.reason}`);
  }

  if (scenario.withdrawn_recommendations.length > 0) {
    console.log('\n  withdrawn advice is retained so its evidence stays inspectable:');
    for (const withdrawn of scenario.withdrawn_recommendations) {
      console.log(`     ${withdrawn.id} — ${withdrawn.title} [${withdrawn.evidence_ids.join(', ')}]`);
    }
  }

  printWarnings(scenario);
  printTelemetry('scenario', scenario);

  // --- Step 4: the invariant the whole demo rests on ------------------------
  rule('4. Verify the base run was not disturbed');
  const snapshotHeld = scenario.evidence_snapshot_id === base.evidence_snapshot_id;
  console.log(`  snapshot unchanged        : ${snapshotHeld ? 'yes' : 'NO'}`);
  console.log(`  base recommendations kept : ${base.recommendations.length}`);
  console.log(`  base advice still reads   : ${base.recommendations[0]?.action ?? '(none)'}`);

  if (!snapshotHeld) {
    console.error('\n  FAILED: the scenario changed the evidence snapshot. The base run was mutated.');
    process.exit(1);
  }

  rule('Result');
  console.log(
    `  Loop completed via the ${client.mode} transport.` +
      (client.mode === 'live' ? ' The provider answered; this is a real call.' : ' No provider call was made.'),
  );
}

main().catch((error: unknown) => {
  if (error instanceof ProviderError) {
    console.error(`\n[${error.code}] ${error.message}`);
    if (error.remediation !== null) console.error(`\n${error.remediation}`);
    console.error(`\nretryable: ${error.retryable}`);
    process.exit(1);
  }
  console.error('\nUnexpected failure:', error);
  process.exit(1);
});
