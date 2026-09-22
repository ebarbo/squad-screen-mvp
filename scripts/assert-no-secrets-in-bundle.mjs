#!/usr/bin/env node
/**
 * Guard for the "no provider key in client assets" acceptance criterion (EWE-63).
 *
 * Scans the built client chunks for the names of server-only variables. A name
 * appearing in a client chunk means the value was inlined at build time, which
 * is exactly the leak we must not ship.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CLIENT_DIR = join(process.cwd(), '.next', 'static');

const FORBIDDEN = [
  'NEBIUS_API_KEY',
  'NEBIUS_BASE_URL',
  'SQUAD_SCREEN_MODEL_ID',
  'SQUAD_SCREEN_COMPARISON_MODEL_ID',
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

async function main() {
  if (!existsSync(CLIENT_DIR)) {
    console.error(`No client build found at ${CLIENT_DIR}. Run "npm run build" first.`);
    process.exit(1);
  }

  const offences = [];
  for await (const path of walk(CLIENT_DIR)) {
    if (!/\.(js|mjs|json|css)$/.test(path)) continue;
    const contents = await readFile(path, 'utf8');
    for (const name of FORBIDDEN) {
      if (contents.includes(name)) offences.push(`${name} -> ${path}`);
    }
  }

  if (offences.length > 0) {
    console.error('Server-only configuration leaked into client assets:');
    for (const offence of offences) console.error(`  ${offence}`);
    process.exit(1);
  }

  console.log(`Client bundle clean: none of ${FORBIDDEN.join(', ')} appear in .next/static.`);
}

main();
