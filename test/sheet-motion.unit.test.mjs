// Sheet open and close motion (rc.84): the open keyframes and backdrop fade in the CSS, the Still / Reduce Motion cut,
// and the opt-in drop close in detent-sheet.js. The real run is in e2e/sheet-motion.spec.mjs.
// node --test test/sheet-motion.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = f => readFileSync(new URL(`../ui/${f}`, import.meta.url), 'utf8');
const sheetCss = read('gestures/sheet.css'), motionCss = read('gestures/motion.css'), js = read('detent-sheet.js');

test('sheet open: 280 ms decelerate with no spring, a 40px rise that fades in', () => {
  const rule = sheetCss.match(/dialog\.ui-sheet\[open\] \{[^}]*\}/)[0];
  assert.match(rule, /animation: ui-sheet-in var\(--d-sheet-in, 280ms\) cubic-bezier\(\.2, 0, 0, 1\)/);
  assert.doesNotMatch(rule, /spring/);
  const frames = motionCss.match(/@keyframes ui-sheet-in \{[^\n]*\}/)[0];
  assert.match(frames, /opacity: 0/);
  assert.match(frames, /translateY\(40px\)/);
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
