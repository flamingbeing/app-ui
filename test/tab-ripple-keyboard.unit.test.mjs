// Tab switch fade, ripple timing and hold, keyboard tab bar (rc.84 items 8-10): timings and opt-ins, read from the source.
// The real run is in e2e/tab-ripple-keyboard.spec.mjs.
// node --test test/tab-ripple-keyboard.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tabFadeDelays, TAB_RISE_GAP_MS, TAB_RISE_IN_MS, TAB_RISE_END_MS, TAB_RISE_MAX_STAGGER_MS, TAB_FADE_OUT_MS, TAB_FADE_GAP_MS, TAB_FADE_STAGGER_MS, TAB_FADE_BLOCKS } from '../ui/tab-pages.js';
import { RIPPLE_IN, RIPPLE_HOLD_MS } from '../ui/motion.js';

const read = f => readFileSync(new URL(`../ui/${f}`, import.meta.url), 'utf8');
const tabs = read('tab-pages.js'), tabbar = read('gestures/tabbar.css'), android = read('gestures/android.css'), motion = read('motion.js');

test('tab fade: out 67 ms, 100 ms gap, blocks 15-30 ms apart, top-down', () => {
  assert.equal(TAB_FADE_OUT_MS, 67);
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
  assert.match(tabs, /bar\.dataset\.slide === 'rise' \|\| html\.dataset\.slide === 'rise' \|\| slide === 'rise'/);
  assert.match(tabs, /!still\(\)/);
  const fn = tabs.match(/function fadeOut[\s\S]*?\n  \}\n/)[0] + ': [{ opacity: 0 }, { opacity: 1 }]';
  assert.match(tabs.match(/function fadeIn[\s\S]*?\n  \}\n/)[0], /: \[\{ opacity: 0 \}, \{ opacity: 1 \}\];/);   // fade mode: opacity only (rise adds the 12px)
  assert.doesNotMatch(fn, /transform|translate/);
  assert.match(tabbar, /\[data-slide="fade"\], \[data-slide="rise"\]\) \.ui-tab \{ transition: background-color/);
  assert.match(tabbar, /data-motion="still"\] \.ui-tab \{ transition: none/);
});

test('ripple: 130 ms in (was 225), hold is opt-in and not under Still', () => {
  assert.equal(RIPPLE_IN, 130);
  assert.equal(RIPPLE_HOLD_MS, 1200);
  assert.match(android, /var\(--ui-ripple-ms, 130ms\)/);
  assert.doesNotMatch(android, /225ms/);
  assert.match(android, /\[data-ripple="hold"\]/);
  assert.match(motion, /dataset\.ripple === 'hold' && document\.documentElement\.dataset\.motion !== 'still'/);
  assert.match(motion, /d\.family !== 'android' && d\.ripple !== 'on' && d\.ripple !== 'hold'/);   // any family with html[data-ripple]
  assert.match(android, /:is\(\[data-family="android"\], :root\[data-ripple="on"\], :root\[data-ripple="hold"\]\) \[data-ripple="hold"\]/);
});

test('keyboard bar: default hides at once; stay / fade are opt-in; 100 ms opacity; Still cuts it', () => {
  assert.match(tabbar, /\.ui-keyboard-open:not\(\[data-keyboard-bar\]\) \.ui-tabbar \{ display: none; \}/);
  assert.match(tabbar, /data-keyboard-bar="fade"\]\.ui-keyboard-open :is\(\.ui-tabbar, \.ui-fab\) \{ opacity: 0/);
  assert.match(tabbar, /opacity 100ms ease-out/);
  assert.match(tabbar, /data-motion="still"\]\[data-keyboard-bar="fade"\]/);
  assert.match(tabbar, /prefers-reduced-motion: reduce\) \{ :root\[data-keyboard-bar="fade"\]/);
});

test('tab rise (opt-in): delays spread so the last visible block lands at ~317 ms; fade delays unchanged', () => {
  const d = tabFadeDelays(13, true);
  assert.equal(d[0], TAB_RISE_GAP_MS);
  assert.ok(Math.abs(d[12] + TAB_RISE_IN_MS - TAB_RISE_END_MS) <= 2, `last block ends ${d[12] + TAB_RISE_IN_MS}`);
  assert.ok(d.every((x, i) => !i || x >= d[i - 1]));
  // few blocks: no more than the cap apart; blocks past the visible count start with the last
  const few = tabFadeDelays(3, true);
  assert.equal(few[1] - few[0], TAB_RISE_MAX_STAGGER_MS);
  assert.equal(tabFadeDelays(40, true)[39], d[12]);
  assert.deepEqual(tabFadeDelays(1, true), [TAB_RISE_GAP_MS]);
  assert.deepEqual(tabFadeDelays(4), [100, 120, 140, 160]);
  assert.ok(TAB_RISE_GAP_MS <= 20);
});

test('tab rise: fades the leaving page, then blocks fade and rise 12px by transform and opacity only; Still cuts it', () => {
  assert.match(tabs, /translateY\(\$\{TAB_RISE_PX\}px\)/);
  assert.match(tabs, /\['fade', 'rise'\]\.includes\(slideKind\(\)\) && !still\(\)/);
  assert.match(tabbar, /\[data-slide="rise"\]\) \.ui-tab \{ transition: background-color/);
});

test('sheet bar (opt-in): data-sheet-bar="fade" fades the tab bar under a sheet or tap-menu panel, opacity only, cut by Still', () => {
  assert.match(tabbar, /:root\[data-sheet-bar="fade"\] \.ui-tabbar \{ transition: opacity var\(--d-sheet-in, 280ms\)/);
  assert.match(tabbar, /dialog\.ui-sheet\[open\], \.ui-menu-layer:not\(\.is-leaving\) \.ui-menu-panel\) \.ui-tabbar \{ opacity: 0; pointer-events: none; \}/);
  assert.match(tabbar, /data-motion="still"\]\[data-sheet-bar="fade"\] \.ui-tabbar \{ transition: none/);
  assert.match(tabbar, /prefers-reduced-motion: reduce\) \{ :root\[data-sheet-bar="fade"\]/);
});
