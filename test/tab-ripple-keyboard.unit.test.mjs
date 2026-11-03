// Tab switch fade, ripple timing and hold, keyboard tab bar (rc.84 items 8-10): timings and opt-ins, read from the source.
// The real run is in e2e/tab-ripple-keyboard.spec.mjs.
// node --test test/tab-ripple-keyboard.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tabFadeDelays, TAB_FADE_OUT_MS, TAB_FADE_GAP_MS, TAB_FADE_STAGGER_MS, TAB_FADE_BLOCKS } from '../ui/tab-pages.js';
import { RIPPLE_IN, RIPPLE_HOLD_MS } from '../ui/motion.js';

const read = f => readFileSync(new URL(`../ui/${f}`, import.meta.url), 'utf8');
const tabs = read('tab-pages.js'), tabbar = read('gestures/tabbar.css'), android = read('gestures/android.css'), motion = read('motion.js');

test('tab fade: out 80 ms, 100 ms gap, blocks 15-30 ms apart, top-down', () => {
  assert.equal(TAB_FADE_OUT_MS, 80);
  assert.equal(TAB_FADE_GAP_MS, 100);
  assert.ok(TAB_FADE_STAGGER_MS >= 15 && TAB_FADE_STAGGER_MS <= 30);
  const d = tabFadeDelays(4);
  assert.deepEqual(d, [100, 120, 140, 160]);
  assert.deepEqual(tabFadeDelays(0), []);
  assert.equal(tabFadeDelays(50)[49], TAB_FADE_GAP_MS + TAB_FADE_BLOCKS * TAB_FADE_STAGGER_MS);
});

test('tab fade: opt-in, opacity only, still() cuts it, default stays the slide', () => {
  assert.match(tabs, /slide === 'fade'/);
  assert.match(tabs, /data-slide="fade"/);
  assert.match(tabs, /return bar\.dataset\.slide === 'fade' \|\| html\.dataset\.slide === 'fade' \|\| slide === 'fade' \? 'fade' : 'slide'/);
  assert.match(tabs, /!still\(\)/);
  const fn = tabs.match(/function fadeIn[\s\S]*?\n  \}\n/)[0] + tabs.match(/function fadeOut[\s\S]*?\n  \}\n/)[0];
  assert.doesNotMatch(fn, /transform|translate/);
  assert.match(tabbar, /\[data-slide="fade"\] \.ui-tab \{ transition: background-color/);
  assert.match(tabbar, /data-motion="still"\] \.ui-tab \{ transition: none/);
});

test('ripple: 130 ms in (was 225), hold is opt-in and not under Still', () => {
  assert.equal(RIPPLE_IN, 130);
  assert.equal(RIPPLE_HOLD_MS, 1200);
  assert.match(android, /var\(--ui-ripple-ms, 130ms\)/);
  assert.doesNotMatch(android, /225ms/);
  assert.match(android, /\[data-ripple="hold"\]/);
  assert.match(motion, /dataset\.ripple === 'hold' && document\.documentElement\.dataset\.motion !== 'still'/);
  assert.match(motion, /dataset\.family !== 'android'/);
});

test('keyboard bar: default hides at once; stay / fade are opt-in; 100 ms opacity; Still cuts it', () => {
  assert.match(tabbar, /\.ui-keyboard-open:not\(\[data-keyboard-bar\]\) \.ui-tabbar \{ display: none; \}/);
  assert.match(tabbar, /data-keyboard-bar="fade"\]\.ui-keyboard-open :is\(\.ui-tabbar, \.ui-fab\) \{ opacity: 0/);
  assert.match(tabbar, /opacity 100ms ease-out/);
  assert.match(tabbar, /data-motion="still"\]\[data-keyboard-bar="fade"\]/);
  assert.match(tabbar, /prefers-reduced-motion: reduce\) \{ :root\[data-keyboard-bar="fade"\]/);
});
