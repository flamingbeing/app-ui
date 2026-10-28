// The type declarations package.json's "types" conditions point at (types/): tsc writes them from the JSDoc in ui/,
// theme/ and settings/ (tsconfig.types.json), and the hand-written ones (ui/types.d.ts, settings/types.d.ts) are copied
// beside them. Run after changing a public signature: node tools/types.mjs (npm run types).
// --check: builds them in a temporary folder and fails when types/ differs (npm run typecheck runs it).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HAND = ['ui/types.d.ts', 'settings/types.d.ts'];
const check = process.argv.includes('--check');
const out = check ? fs.mkdtempSync(path.join(os.tmpdir(), 'app-ui-types-')) : path.join(ROOT, 'types');

const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
if (!check) fs.rmSync(out, { recursive: true, force: true });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.types.json', '--outDir', out], { cwd: ROOT, stdio: 'inherit' });
for (const f of HAND) fs.copyFileSync(path.join(ROOT, f), path.join(out, f));

/** @param {string} dir @returns {Record<string, string>} */
const read = dir => {
  /** @type {Record<string, string>} */ const all = {};
  const walk = (/** @type {string} */ rel) => {
    const abs = path.join(dir, rel);
    if (fs.statSync(abs).isDirectory()) fs.readdirSync(abs).sort().forEach(f => walk(path.posix.join(rel, f)));
    else all[rel] = fs.readFileSync(abs, 'utf8');
  };
  if (fs.existsSync(dir)) walk('.');
  return all;
};

if (check) {
  const want = read(out), have = read(path.join(ROOT, 'types'));
  fs.rmSync(out, { recursive: true, force: true });
  const differ = [...new Set([...Object.keys(want), ...Object.keys(have)])].filter(f => want[f] !== have[f]);
  if (differ.length) {
    console.error(`types/ is out of date (${differ.slice(0, 5).join(', ')}${differ.length > 5 ? ', …' : ''}): run npm run types`);
    process.exit(1);
  }
  console.log(`types: ok (${Object.keys(want).length} files)`);
} else console.log('types: written to types/');
