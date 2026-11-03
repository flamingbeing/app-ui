// Sheet open and close motion (rc.84): the open keyframes and backdrop fade in the CSS, the Still / Reduce Motion cut,
// and the opt-in drop close in detent-sheet.js. The real run is in e2e/sheet-motion.spec.mjs.
// node --test test/sheet-motion.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { releasePlan } from '../ui/detent-sheet.js';

const read = f => readFileSync(new URL(`../ui/${f}`, import.meta.url), 'utf8');
const sheetCss = read('gestures/sheet.css'), motionCss = read('gestures/motion.css'), js = read('detent-sheet.js');

test('sheet open: 280 ms decelerate with no spring, a 40px rise that fades in', () => {
  const rule = sheetCss.match(/dialog\.ui-sheet\[open\] \{[^}]*\}/)[0];
  assert.match(rule, /animation: ui-sheet-in var\(--d-sheet-in, 280ms\) cubic-bezier\(\.2, 0, 0, 1\)/);
  assert.doesNotMatch(rule, /spring/);
  const frames = motionCss.match(/@keyframes ui-sheet-in \{[^\n]*\}/)[0];
  assert.match(frames, /opacity: 0/);
  assert.match(frames, /translateY\(var\(--ui-sheet-rise, 40px\)\)/);
});

test('sheet open: the backdrop fades in over the same time', () => {
  assert.match(sheetCss, /dialog\.ui-sheet\[open\]::backdrop \{ animation: ui-fade var\(--d-sheet-in, 280ms\) cubic-bezier\(\.2, 0, 0, 1\)/);
});

test('Still and Reduce Motion switch the backdrop fade off too', () => {
  assert.match(motionCss, /data-motion="still"\] dialog\.ui-sheet\[open\]::backdrop \{ animation: none/);
  assert.match(motionCss, /prefers-reduced-motion: reduce\) \{\s*dialog\.ui-sheet\[open\]::backdrop \{ animation: none/);
});

test('sheet close: data-close-motion="drop" is for non-touch closes only; a finger keeps the spring', () => {
  assert.match(js, /!touch && sheet\.getAttribute\('data-close-motion'\) === 'drop'/);
  assert.match(js, /const HOLD = 100, MOVE = 270/);
  assert.match(js, /data-close-drop/);
  // the still check comes before it, so Still closes at once
  assert.ok(js.indexOf("(still() && !touch)") < js.indexOf("=== 'drop'"));
});

test('releasePlan: a capped jump along the finger, a hold, then an ease-in off the bottom in 650 ms', () => {
  const p = releasePlan(100, 0.5, 508);
  assert.equal(p.duration, 650);
  const [a, b, c, d] = p.keyframes;
  assert.equal(a.transform, 'translateY(100px)');
  assert.equal(b.transform, 'translateY(124px)');   // 0.5 px/ms x 60 ms = 30, capped at 24
  assert.equal(c.transform, b.transform);            // the hold
  assert.ok(Math.abs(b.offset - 60 / 650) < 1e-9 && Math.abs(c.offset - 190 / 650) < 1e-9);
  assert.equal(c.easing, 'cubic-bezier(.4,0,1,1)');
  assert.equal(d.transform, 'translateY(508px)');
  assert.equal(d.offset, 1);
  // a slow let-go jumps less; an upward one never jumps up more than the cap; transform only
  assert.equal(releasePlan(100, 0.1, 508).keyframes[1].transform, 'translateY(106px)');
  assert.equal(releasePlan(100, -2, 508).keyframes[1].transform, 'translateY(76px)');
  for (const k of p.keyframes) assert.deepEqual(Object.keys(k).filter(x => !['offset', 'easing', 'transform'].includes(x)), []);
});

test('data-release-motion="settle" is opt-in, a phone finger let-go only; the default stays the spring', () => {
  assert.match(js, /touch && !wide\.matches && sheet\.getAttribute\('data-release-motion'\) === 'settle'/);
  assert.ok(js.indexOf("(still() && !touch)") < js.indexOf("'data-release-motion'"));
});
