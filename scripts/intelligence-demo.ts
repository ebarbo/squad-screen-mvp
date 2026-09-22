#!/usr/bin/env tsx
/**
 * Headless walk of the product loop: generate a base run, then re-evaluate it
 * with one availability override and print what changed.
 *
 * Implemented by EWE-67 once the generation and scenario services exist. Until
 * then this exits non-zero rather than printing a success it did not achieve.
 */

console.error(
  [
    'npm run demo:intelligence is not implemented yet.',
    '',
    'It is delivered by EWE-67 (compose generation and scenario APIs with run state),',
    'which depends on EWE-63 → EWE-64 → EWE-65 → EWE-66.',
    '',
    'Nothing ran. This command exits non-zero on purpose so an unimplemented step',
    'cannot be mistaken for a passing check.',
  ].join('\n'),
);

process.exit(1);
