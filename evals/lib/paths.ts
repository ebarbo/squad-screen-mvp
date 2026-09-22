import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The harness runs under two loaders: `tsx` (CommonJS, via `npm run eval`) and
 * vitest (ESM, via the eval test config). `__dirname` exists in one and
 * `import.meta.url` in the other, so neither is used. Walking up for
 * package.json works identically in both and also when invoked from a
 * subdirectory.
 */
export function repoRoot(from: string = process.cwd()): string {
  let current = path.resolve(from);
  for (;;) {
    if (existsSync(path.join(current, 'package.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not locate the repository root above ${from}: no package.json found. Run the harness from inside the repository.`,
      );
    }
    current = parent;
  }
}

export const evalsDir = (root = repoRoot()): string => path.join(root, 'evals');
export const casesDir = (root = repoRoot()): string => path.join(evalsDir(root), 'cases');
export const recordedDir = (root = repoRoot()): string => path.join(evalsDir(root), 'recorded');
export const resultsDir = (root = repoRoot()): string => path.join(evalsDir(root), 'results');
export const dataDir = (root = repoRoot()): string => path.join(root, 'data');
