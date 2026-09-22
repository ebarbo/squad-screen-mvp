import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The root vitest config scopes its projects to `tests/**`, which belongs to the
 * integration verifier. This config covers the evaluation harness's own tests
 * without touching a file another slice owns.
 *
 *   npx vitest run --config evals/vitest.config.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '~': fileURLToPath(new URL('../', import.meta.url)),
    },
  },
  test: {
    name: 'evals',
    globals: true,
    environment: 'node',
    root: fileURLToPath(new URL('../', import.meta.url)),
    include: ['evals/**/*.test.ts'],
  },
});
