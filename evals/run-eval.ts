#!/usr/bin/env tsx
/**
 * Five-scenario model comparison harness.
 *
 * Owned by EWE-71 (slice B, branch `feat/ewe-71-73-eval-harness`). Until that
 * lands this exits non-zero rather than reporting a run that did not happen.
 */

console.error(
  [
    'npm run eval is not implemented yet.',
    '',
    'It is delivered by EWE-71 (five-scenario model comparison harness), which',
    'depends on EWE-61 and EWE-62.',
    '',
    'Nothing ran, and no results were produced. Do not record any number as measured',
    'until this command has actually executed against a configured provider.',
  ].join('\n'),
);

process.exit(1);
