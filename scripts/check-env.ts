#!/usr/bin/env tsx
/**
 * Operator preflight: report whether provider configuration is usable.
 * Exits non-zero when live mode is selected but unusable, so the demo rehearsal
 * finds the problem before the stage does.
 */
import { describeConfigProblems, loadProviderConfig, redactSecret } from '../src/server/config/env';

function main(): void {
  const result = loadProviderConfig();

  if (!result.ok) {
    console.error(describeConfigProblems(result.problems));
    process.exitCode = 1;
    return;
  }

  const { config } = result;
  console.log('Provider configuration');
  console.log(`  mode                  ${config.mode}`);
  console.log(`  NEBIUS_API_KEY        ${redactSecret(config.apiKey)}`);
  console.log(`  NEBIUS_BASE_URL       ${config.baseUrl}`);
  console.log(`  model                 ${config.modelId}`);
  console.log(`  comparison model      ${config.comparisonModelId ?? 'unset (EWE-73 comparison unavailable)'}`);
  console.log(`  rate limits           read from provider response headers at call time`);
  console.log(`  timeout               ${config.timeoutMs} ms`);
  console.log(`  max repair retries    ${config.maxRetries}`);
  console.log(
    `  cost basis            ${
      config.priceInputPerMTok === null || config.priceOutputPerMTok === null
        ? 'unset — estimated inference cost will be reported as null'
        : `in $${config.priceInputPerMTok}/Mtok, out $${config.priceOutputPerMTok}/Mtok`
    }`,
  );

  if (config.mode === 'stub') {
    console.log('');
    console.log('Mode is "stub": responses come from a deterministic offline transport and are');
    console.log('labeled as such. This is not live inference and must not be presented as such.');
  }
}

main();
