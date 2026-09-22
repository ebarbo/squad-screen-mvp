import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '~': fileURLToPath(new URL('./', import.meta.url)),
};

// JSX is transformed by esbuild's automatic runtime rather than @vitejs/plugin-react:
// the plugin pulls in its own vite copy, which conflicts with vitest's.
const jsx = { jsx: 'automatic' } as const;

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        esbuild: jsx,
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          setupFiles: ['tests/setup.ts'],
        },
      },
      {
        resolve: { alias },
        esbuild: jsx,
        test: {
          name: 'dom',
          globals: true,
          environment: 'jsdom',
          include: ['tests/**/*.test.tsx'],
          setupFiles: ['tests/setup-dom.ts'],
        },
      },
      {
        // The evaluation harness keeps its tests beside its code rather than in
        // tests/. Mirrors evals/vitest.config.ts deliberately, including the
        // absence of a setup file: those tests were written to run in a bare
        // environment, and imposing the stub-mode setup here would change the
        // transport they resolve.
        resolve: { alias },
        esbuild: jsx,
        test: {
          name: 'evals',
          globals: true,
          environment: 'node',
          include: ['evals/**/*.test.ts'],
        },
      },
    ],
  },
});
