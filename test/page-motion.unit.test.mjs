// Page push / pop, fade-through and the settings sub-page slide (rc.84 items 5-7): the timings and the opt-in, read from
// the source. The real run is in e2e/page-motion.spec.mjs.
// node --test test/page-motion.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUSH_MS, POP_MS, PARALLAX, FADE_IN_MS, FADE_OUT_MS, FADE_STAGGER_MS } from '../ui/gesture.js';

const read = f => readFileSync(new URL(`../ui/${f}`, import.meta.url), 'utf8');
const screens = read('screens.js'), settings = read('settings-screen.js'), css = read('gestures/settings.css');

test('timings: push 250, pop 300, the page under shifts 22%', () => {
  assert.equal(PUSH_MS, 250);
  assert.equal(POP_MS, 300);
  assert.equal(PARALLAX, 0.22);
});

test('fade-through: 100 ms in, 200 ms back, blocks 33-50 ms apart', () => {
  assert.equal(FADE_IN_MS, 100);
  assert.equal(FADE_OUT_MS, 200);
  assert.ok(FADE_STAGGER_MS >= 33 && FADE_STAGGER_MS <= 50);
});

test('screens.js: only opacity and transform move; fade is opt-in; still() cuts it', () => {
  assert.match(screens, /o\.motion === 'fade'/);
  assert.match(screens, /still\(\) \|\| typeof el\.animate/);
  assert.doesNotMatch(screens, /animate\([^)]*(left|top|width|height)\s*:/);
  assert.match(screens, /\{ transform: shift \}/);   // the page under
});

test('settings sub-page: full-width slide, no opacity ramp, menu parallax', () => {
  const fn = settings.slideIn ?? settings.match(/function slideIn[\s\S]*?\n    \}\n/)[0];
  assert.match(fn, /translateX\(100%\)/);
  assert.doesNotMatch(fn, /opacity/);
  assert.match(fn, /PARALLAX/);
  assert.match(fn, /still\(\)/);
  assert.match(css, /is-slide-out \{ position: absolute/);
});
