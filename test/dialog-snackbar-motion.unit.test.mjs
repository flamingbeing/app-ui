// Dialog / menu enter-exit and snackbar timing (rc.84 items 3-4): the CSS timings, the Still / Reduce Motion cut, the
// toaster's opt-in exit fade and swap, and undo's 5000 ms. The real run is in e2e/dialog-snackbar-motion.spec.mjs.
// node --test test/dialog-snackbar-motion.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { undoToast } from '../ui/undo-toast.js';

const read = f => readFileSync(new URL(`../ui/${f}`, import.meta.url), 'utf8');
const menuCss = read('gestures/menu.css'), motionCss = read('gestures/motion.css');
const toastJs = read('toast.js'), modalJs = read('modal.js');

test('menu and dialog enter: 120 ms ease-out from scale .9, no spring', () => {
  assert.match(menuCss, /\.ui-menu \{[^}]*animation: ui-pop var\(--d-pop-in, 120ms\) cubic-bezier\(0, 0, \.2, 1\)/);
  assert.match(motionCss, /dialog\.modal\[open\] \{ animation: ui-pop var\(--d-pop-in, 120ms\) cubic-bezier\(0, 0, \.2, 1\)/);
  assert.match(motionCss, /@keyframes ui-pop \{ from \{ opacity: 0; transform: scale\(\.9\)/);
  assert.doesNotMatch(motionCss.match(/dialog\.modal\[open\] \{[^}]*\}/)[0], /spring/);
});

test('a menu that is a bottom sheet keeps the sheet rise', () => {
  assert.match(menuCss, /\.ui-menu\.is-sheet \{[^}]*animation: ui-rise var\(--d-quick\) var\(--spring-snappy\)/);
});

test('menu and dialog exit: 80 ms ease-in', () => {
  assert.match(menuCss, /is-leaving \.ui-menu \{ animation: ui-shrink var\(--d-pop-out, 80ms\) ease-in forwards/);
  assert.match(menuCss, /is-leaving \.ui-menu-veil \{ animation: ui-fade-out var\(--d-pop-out, 80ms\)/);
  assert.match(motionCss, /dialog\.modal\.is-leaving \{[^}]*ui-shrink var\(--d-pop-out, 80ms\) ease-in/);
});

test('modal.js leaves with the class, and goes at once when still()', () => {
  assert.match(modalJs, /import \{ still \} from '\.\/gesture\.js'/);
  assert.match(modalJs, /if \(still\(\)\) return gone\(\)/);
  assert.match(modalJs, /classList\.add\('is-leaving'\)/);
});

test('snackbar fades in 150 ms ease-out, no slide; the exit fade is 300 ms ease-in and opt-in', () => {
  const rule = motionCss.match(/\.toast \{ animation:[^}]*\}/)[0];
  assert.match(rule, /ui-fade var\(--d-toast-in, 150ms\) cubic-bezier\(0, 0, \.2, 1\)/);
  assert.match(motionCss, /\.toast\.is-leaving \{[^}]*ui-fade-out var\(--d-toast-out, 300ms\) ease-in/);
  assert.match(toastJs, /exit = 0/);
  assert.match(toastJs, /if \(!exit \|\| still\(\)/);
});

test('snackbar text swap cross-fades in 40 + 40 ms and honours still()', () => {
  assert.match(toastJs, /o\.swap && current/);
  assert.equal((toastJs.match(/duration: 40/g) || []).length, 2);
  assert.match(toastJs, /if \(still\(\) \|\| typeof text\.animate/);
});

test('Still and Reduce Motion cut dialog and snackbar motion', () => {
  assert.match(motionCss, /data-motion="still"\] :is\([^)]*dialog\.modal, \.toast\)/);
  assert.match(motionCss, /prefers-reduced-motion: reduce\) \{[\s\S]*dialog\.modal, \.toast \{ animation: none !important/);
});

test('undoToast stays 5000 ms by default, and ms still overrides', () => {
  /** @type {any[]} */ const seen = [];
  const toasts = { show: (m, o) => { seen.push(o); return () => {}; } };
  undoToast(toasts).show('Deleted a', () => {});
  undoToast(toasts, { ms: 8000 }).show('Deleted b', () => {});
  assert.equal(seen[0].ms, 5000);
  assert.equal(seen[1].ms, 8000);
});
