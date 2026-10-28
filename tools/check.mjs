// Repo checks for mistakes tests don't catch. Run before merging: node tools/check.mjs
// 1. wrangler.jsonc keeps preview links and the workers.dev address off, and routes only core.anawj.com/ui/*, /kit and /kit/*.
// 2. The package.json version is in versions.lock.json and matches the published files (tools/build-ui.mjs --check):
//    a released version never changes, so a change to ui/, theme/, settings/, kit/ or icons/ needs a new version.
// 3. The published code imports only its own files (relative paths): no engine, no other site, no bare names. A page
//    hands each part the module api it shows.
// 4. The gallery pages carry no inline script or style (the Worker's page policy allows none).
// 5. No emoji or pictograph characters in the published files: icons are SVG (icons/lucide.js), never a text glyph.
// 6. The Worker's tests pass (node --test 'worker/test/*.test.mjs').
// Exits 1 on any failure.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PUBLISHED } from './build-ui.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = msg => errors.push(msg);

const w = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
if (!/"preview_urls"\s*:\s*false/.test(w)) fail('wrangler.jsonc: "preview_urls" should be false (no preview links)');
if (!/"workers_dev"\s*:\s*false/.test(w)) fail('wrangler.jsonc: "workers_dev" should be false (real addresses only)');
const patterns = [...w.matchAll(/"pattern"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
if (patterns.join() !== 'core.anawj.com/ui/*,core.anawj.com/kit,core.anawj.com/kit/*') fail(`wrangler.jsonc: the only routes should be core.anawj.com/ui/*, /kit and /kit/* (the rest of core.anawj.com is app-sync's), not ${patterns.join(', ') || 'none'}`);
if (/custom_domain/.test(w)) fail('wrangler.jsonc: no custom domain (core.anawj.com is app-sync\'s custom domain)');

try { execFileSync(process.execPath, ['tools/build-ui.mjs', '--check'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { fail(String(e.stderr || e.message).trim()); }

const walk = rel => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.statSync(abs).isDirectory() ? fs.readdirSync(abs).flatMap(f => walk(path.posix.join(rel, f))) : [rel];
};
const files = PUBLISHED.flatMap(walk);
for (const f of files.filter(f => f.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  for (const m of code.matchAll(/(?:^|[;\s}(])(?:import|export)\s*(?:[\w*{}\s,$]*?\sfrom\s*)?\(?\s*['"]([^'"]+)['"]/g)) {
    if (!m[1].startsWith('./') && !m[1].startsWith('../')) fail(`${f} imports '${m[1]}': only the repo's own files, by relative path`);
  }
}
for (const f of files.filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail(`${f}: an inline <script> (the page policy allows none; use a file)`);
  if (/<style[\s>]|\sstyle="/i.test(html)) fail(`${f}: inline style (the page policy allows none; use the page's CSS file)`);
}

// icons are drawn, not typed: no emoji, dingbat, box or arrow-symbol, braille or enclosed-letter characters (plain
// punctuation such as ‹ › … × − “ ” is text, not an icon, and stays)
const PICTOGRAPH = /[\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{27BF}\u{2800}-\u{28FF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1FAFF}\u{2261}\u{FE0F}]/u;
for (const f of files.filter(f => /\.(js|css|html)$/.test(f))) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, '')).replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, '')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const hit = text.split('\n').findIndex(l => PICTOGRAPH.test(l));
  if (hit >= 0) fail(`${f}:${hit + 1}: an emoji or pictograph character (${text.split('\n')[hit].match(PICTOGRAPH)?.[0]}): draw an icon from icons/lucide.js instead`);
}

try { execFileSync(process.execPath, ['--test', 'worker/test/*.test.mjs'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { fail('worker tests failed:\n' + String(e.stdout || e.message).split('\n').filter(l => /not ok|Error|expected|actual/.test(l)).slice(0, 10).join('\n')); }

if (errors.length) {
  console.error(`check: ${errors.length} problem(s)\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`check: ok (${files.length} published files; worker tests pass)`);
