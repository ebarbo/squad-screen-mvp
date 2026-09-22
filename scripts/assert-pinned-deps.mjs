#!/usr/bin/env node
/**
 * The lockfile is not committed (see .gitignore), so this stands in for it:
 * every direct dependency must be pinned to an exact version in package.json,
 * and the version actually installed must equal that pin.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

async function main() {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };

  const unpinned = [];
  const mismatched = [];
  const missing = [];

  for (const [name, spec] of Object.entries(declared)) {
    if (!EXACT.test(spec)) {
      unpinned.push(`${name}@${spec}`);
      continue;
    }

    let installed;
    try {
      installed = JSON.parse(
        await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8'),
      ).version;
    } catch {
      missing.push(name);
      continue;
    }

    if (installed !== spec) mismatched.push(`${name}: manifest ${spec}, installed ${installed}`);
  }

  const problems = [
    ['Dependencies are not pinned to an exact version', unpinned],
    ['Dependencies are declared but not installed', missing],
    ['Installed versions differ from the manifest', mismatched],
  ].filter(([, items]) => items.length > 0);

  if (problems.length > 0) {
    for (const [heading, items] of problems) {
      console.error(`${heading}:`);
      for (const item of items) console.error(`  ${item}`);
    }
    process.exit(1);
  }

  console.log(`All ${Object.keys(declared).length} direct dependencies are pinned and match the installed tree.`);
}

main();
