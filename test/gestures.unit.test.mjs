// @core/ui gestures' pure parts: where a hold menu goes, where a sheet settles, when the tab bar shrinks, what a drag
// down the ticks selects, when an edge swipe goes back, and when the swipe is on at all.
// node --test app/test/gestures.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOLD_MS, SLOP, velocity, still, haptic, releaseVelocity, unrubber, pathAt, claim, release, captured, PRIORITY } from '../ui/gesture.js';
import { placeMenu, placeAtPointer } from '../ui/hold-menu.js';
import { settle, topDetent } from '../ui/detent-sheet.js';
import { tabBarStep } from '../ui/tab-bar.js';
import { dragRange, needs, TICKS } from '../ui/select-mode.js';
import { swipeGoesBack, edgeBackOn, EDGE } from '../ui/screens.js';
import { swipeIntent, pageStep, swipeEdge, rubber, springPath } from '../ui/tab-pages.js';

test('the port rules: hold 500 ms within 10 px; ticks and screen edge are finger-sized', () => {
  assert.equal(HOLD_MS, 500);
  assert.equal(SLOP, 10);
  assert.ok(TICKS >= 44);
  assert.ok(EDGE >= 16 && EDGE <= 32);
});

test('velocity: px per ms from first to last sample; one sample is still', () => {
  assert.equal(velocity([[0, 0], [100, 50]]), 0.5);
  assert.equal(velocity([[0, 10]]), 0);
  assert.equal(velocity([[5, 0], [5, 20]]), 20, 'same timestamp: no divide by zero');
});

test('no DOM (node): still() is false and haptic() does nothing', () => {
  assert.equal(still(), false);
  assert.doesNotThrow(() => haptic());
});

const view = { w: 390, h: 844 };
const menu = { w: 220, h: 200 };
const rect = (top, height = 60, left = 16, width = 358) => ({ top, bottom: top + height, left, width, height, right: left + width });

test('hold menu: below the row when it fits', () => {
  const p = placeMenu(rect(100), menu, view);
  assert.equal(p.top, 170);
  assert.equal(p.previewTop, 100);
  assert.equal(p.below, true);
  assert.equal(p.left, 16);
});

test('hold menu: above the row near the bottom', () => {
  const p = placeMenu(rect(700), menu, view);
  assert.equal(p.top, 700 - 10 - 200);
  assert.equal(p.previewTop, 700);
  assert.equal(p.below, false);
});

test('hold menu: no room either side moves the preview up so both fit', () => {
  const tall = { w: 220, h: 700 };
  const p = placeMenu(rect(100), tall, view);
  assert.ok(p.previewTop >= 16);
  assert.ok(p.top + tall.h <= view.h - 16 + 0.01);
  assert.equal(p.below, true);
});

test('hold menu: centred on a right-click, kept 16 px inside the screen', () => {
  assert.equal(placeMenu(rect(100), menu, view, { x: 200, y: 120 }).left, 90);
  assert.equal(placeMenu(rect(100), menu, view, { x: 380, y: 120 }).left, 390 - 16 - 220);
  assert.equal(placeMenu(rect(100), menu, view, { x: 10, y: 120 }).left, 16);
});

test('sheet: the top detent is large when there is one', () => {
  assert.equal(topDetent(['medium', 'large']), 'large');
  assert.equal(topDetent(['medium']), 'medium');
});

test('sheet: a let-go settles on the nearest height; well below the lowest it closes', () => {
  const ds = ['medium', 'large'], px = { medium: 422, large: 832 };
  assert.equal(settle(ds, px, 452, 0, 'medium'), 'medium');
  assert.equal(settle(ds, px, 522, 0, 'medium'), 'medium', 'up 100 px: still nearer medium');
  assert.equal(settle(ds, px, 660, 0, 'medium'), 'large', 'past halfway: large');
  assert.equal(settle(ds, px, 600, 0, 'large'), 'medium', 'down past halfway from large');
  assert.equal(settle(ds, px, 700, 0, 'large'), 'large');
  assert.equal(settle(ds, px, 300, 0, 'medium'), 'medium', 'a little below medium: back up');
  assert.equal(settle(ds, px, 260, 0, 'medium'), 'close');
  assert.equal(settle(['medium'], { medium: 422 }, 222, 0, 'medium'), 'close');
  assert.equal(settle(['medium'], { medium: 200 }, 120, 0, 'medium'), 'medium', 'a short sheet: the close line is half its height');
  assert.equal(settle(['medium'], { medium: 200 }, 90, 0, 'medium'), 'close');
});

test('sheet: a flick goes on to the next height its way, or as far as it would carry the sheet', () => {
  const ds = ['medium', 'large'], px = { medium: 422, large: 832 };
  assert.equal(settle(ds, px, 442, -0.5, 'medium'), 'large');
  assert.equal(settle(ds, px, 792, 0.6, 'large'), 'medium');
  assert.equal(settle(ds, px, 412, 0.1, 'medium'), 'medium');
  assert.equal(settle(ds, px, 400, 0.8, 'medium'), 'close', 'flung down from the lowest: closes');
  assert.equal(settle(ds, px, 700, 3, 'large'), 'medium', 'flung hard down from full height: medium, not closed');
});

test('tab bar: shrinks after 40 px down, grows after 24 px up or near the top', () => {
  let s = { acc: 0, small: false };
  s = tabBarStep(s, 200, 30); assert.equal(s.small, false);
  s = tabBarStep(s, 230, 20); assert.equal(s.small, true);
  s = tabBarStep(s, 220, -10); assert.equal(s.small, true, 'a small wobble up keeps it small');
  s = tabBarStep(s, 190, -30); assert.equal(s.small, false);
  assert.equal(tabBarStep({ acc: 100, small: true }, 20, 5).small, false, 'near the top it is always full');
});

test('select drag: the range takes the new tick, rows outside go back to how they were', () => {
  const snap = [false, true, false, false, true];
  assert.deepEqual(dragRange(snap, 1, 3, true), [false, true, true, true, true]);
  assert.deepEqual(dragRange(snap, 3, 0, false), [false, false, false, false, true]);
  assert.deepEqual(dragRange(snap, 2, 2, true), [false, true, true, false, true]);
});

test('action bar: data-needs ranges', () => {
  assert.deepEqual(needs('1'), [1, 99]);
  assert.deepEqual(needs('2-4'), [2, 4]);
  assert.deepEqual(needs('2-2'), [2, 2]);
});

test('edge swipe: past a third of the width, or a flick past 40 px', () => {
  assert.equal(swipeGoesBack(140, 0, 390), true);
  assert.equal(swipeGoesBack(100, 0.2, 390), false);
  assert.equal(swipeGoesBack(50, 0.8, 390), true);
  assert.equal(swipeGoesBack(30, 2, 390), false);
});

test('edge swipe is on only in the iPhone home-screen app (or when forced for tests)', () => {
  const iphone = /** @type {any} */ ({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
  const ipad = /** @type {any} */ ({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 });
  const android = /** @type {any} */ ({ userAgent: 'Mozilla/5.0 (Linux; Android 15)', platform: 'Linux', maxTouchPoints: 5 });
  const standalone = () => true, browser = () => false;
  assert.equal(edgeBackOn(iphone, standalone, null), true);
  assert.equal(edgeBackOn(ipad, standalone, null), true);
  assert.equal(edgeBackOn(iphone, browser, null), false, 'Safari has its own swipe');
  assert.equal(edgeBackOn(android, standalone, null), false, 'Android has a system Back');
  assert.equal(edgeBackOn(android, browser, 'always'), true);
  assert.equal(edgeBackOn(iphone, standalone, 'off'), false);
});

test('right-click menu: its corner at the pointer; flipped left or up near an edge, kept 8 px inside', () => {
  const desk = { w: 1280, h: 800 };
  assert.deepEqual(placeAtPointer(menu, desk, { x: 500, y: 300 }), { left: 500, top: 300, below: true });
  assert.deepEqual(placeAtPointer(menu, desk, { x: 1200, y: 700 }), { left: 1200 - 220, top: 700 - 200, below: false });
  assert.deepEqual(placeAtPointer(menu, { w: 230, h: 210 }, { x: 100, y: 100 }), { left: 8, top: 8, below: false });
});

test('tab swipe: a first move under 8 px tells nothing; sideways only when under about 40° from the horizontal', () => {
  assert.equal(swipeIntent(6, 3), null);
  assert.equal(swipeIntent(8, 2), 'x', 'decided at 8 px, so the page moves from the first frames');
  assert.equal(swipeIntent(-30, 5), 'x');
  assert.equal(swipeIntent(30, 30), 'y', 'a diagonal is a scroll');
  assert.equal(swipeIntent(2, 40), 'y');
});

test('tab swipe: a looser angle still reads as sideways (under 40°), a steeper one as a scroll', () => {
  assert.equal(swipeIntent(30, 22), 'x');
  assert.equal(swipeIntent(30, 26), 'y');
});

test('tab swipe: no start within 24 px of an edge (Android’s Back), a little more on a wider phone, never past 32 px', () => {
  assert.equal(Math.round(swipeEdge(390)), 28);
  assert.equal(swipeEdge(160), 24);
  assert.ok(swipeEdge(430) < 32 && swipeEdge(1000) === 32);
});

test('release speed: over the last 100 ms (from the sample just before), so a finger that stops reads still', () => {
  assert.equal(releaseVelocity([[0, 0], [16, 20], [32, 40]], 32), 40 / 32);
  assert.equal(releaseVelocity([[0, 0], [16, 20], [300, 20]], 300), 0, 'stopped for a while: no throw');
  assert.equal(releaseVelocity([[0, 0], [300, 30]], 450), 0, 'nothing in the last 100 ms');
  assert.equal(releaseVelocity([[0, 0], [5, 10]], 5), 10 / 16, 'one quick sample is not a rocket');
});

test('rubber band undone: the finger travel for a stretch', () => {
  for (const d of [-300, -40, 0, 25, 200]) assert.ok(Math.abs(unrubber(rubber(d, 390), 390) - d) < 1e-6);
});

test('glide position: the path’s frame at the animation’s time', () => {
  const path = [0, 10, 20, 30];
  assert.equal(pathAt(/** @type {Animation} */ (/** @type {unknown} */ ({ currentTime: 0 })), path), 0);
  assert.equal(pathAt(/** @type {Animation} */ (/** @type {unknown} */ ({ currentTime: 1000 / 30 })), path), 20);
  assert.equal(pathAt(/** @type {Animation} */ (/** @type {unknown} */ ({ currentTime: 5000 })), path), 30);
  assert.equal(pathAt(/** @type {Animation} */ (/** @type {unknown} */ ({ currentTime: null })), path), 0);
});

test('tab swipe: past half the width with its throw (a slow drag or a flick) goes to the next or previous page, if there is one', () => {
  assert.equal(pageStep(-210, 0, 400, true, true), 1, 'past half');
  assert.equal(pageStep(210, 0, 400, true, true), -1);
  assert.equal(pageStep(-150, 0, 400, true, true), 0, 'short of half, slow: back (as iOS)');
  assert.equal(pageStep(-60, -0.8, 400, true, true), 1, 'a flick');
  assert.equal(pageStep(-20, -1.2, 400, true, true), 1, 'a quick short flick');
  assert.equal(pageStep(-60, 0, 400, true, true), 0, 'too short, too slow');
  assert.equal(pageStep(-300, 0, 400, true, false), 0, 'no next page');
  assert.equal(pageStep(300, 0, 400, false, true), 0, 'no previous page');
  assert.equal(pageStep(-250, 0.5, 400, true, true), 0, 'the finger turned back at the end: back');
  assert.equal(pageStep(6, -2.5, 400, true, true), 1, 'caught just short of its place and flicked on: the next page');
  assert.equal(pageStep(-30, -0.5, 400, true, true), 1, 'a short flick at 500 px/s still goes');
  assert.equal(pageStep(-30, -0.3, 400, true, true), 0, 'slower is a drag let go: back');
});

test('rubber band: gives less and less where there is no page, never past the width', () => {
  assert.equal(rubber(0, 400), 0);
  assert.ok(rubber(100, 400) < 100 && rubber(100, 400) > 40);
  assert.ok(rubber(-100, 400) === -rubber(100, 400));
  assert.ok(rubber(800, 400) - rubber(400, 400) < rubber(400, 400) - rubber(0, 400));
  assert.ok(rubber(1e6, 400) < 400);
});

test('spring glide: starts where let go, lands exactly, never passes the target, keeps the finger’s speed', () => {
  const going = springPath(-120, -400, -1.5);
  assert.equal(going[0], -120);
  assert.equal(going.at(-1), -400);
  assert.ok(going.every(x => x >= -400 && x <= -120), 'no overshoot, even from a hard flick');
  assert.ok(going.length > 8 && going.length < 50, `about a quarter to half a second (${going.length} frames)`);
  const slow = springPath(-120, -400, 0), fast = springPath(-120, -400, -1);
  assert.ok(fast[1] - fast[0] < slow[1] - slow[0], 'a flick moves further on its first frame');
  const back = springPath(80, 0, 0);
  assert.ok(back.every((x, i) => i === 0 || x <= back[i - 1]), 'back to rest without bouncing');
  const away = springPath(-50, 0, -0.5);
  assert.ok(away[1] < -50, 'a finger still moving away carries the page on a little before it turns');
  assert.deepEqual(springPath(0, 0, 0), [0, 0]);
});

test('keyboardState: open only while typing and over KEYBOARD_MIN shorter; lift is the cover below the visible part', async () => {
  const { keyboardState, KEYBOARD_MIN } = await import('../ui/keyboard.js');
  assert.deepEqual(keyboardState({ base: 844, inner: 844, height: 500, top: 0, editing: false }), { open: false, lift: 0 });
  assert.deepEqual(keyboardState({ base: 844, inner: 844, height: 500, top: 0, editing: true }), { open: true, lift: 344 });
  assert.deepEqual(keyboardState({ base: 844, inner: 500, height: 500, top: 0, editing: true }), { open: true, lift: 0 });
  assert.deepEqual(keyboardState({ base: 844, inner: 844, height: 844 - KEYBOARD_MIN, top: 0, editing: true }), { open: false, lift: 0 });
  assert.deepEqual(keyboardState({ base: 844, inner: 844, height: 500, top: 20, editing: true }), { open: true, lift: 324 });
});

test('the arbiter: the first claim owns the touch, a lower one stands down, a higher one takes it over', () => {
  assert.equal(captured(), null);
  assert.equal(claim('tabs'), true);
  assert.equal(claim('tabs'), true, 'its own again');
  assert.equal(claim('bounce'), false, 'lower');
  assert.equal(claim('tabs'), true);
  assert.equal(claim('sheet'), true, 'higher takes it');
  assert.equal(captured(), 'sheet');
  assert.equal(claim('drawer'), false);
  release('tabs');
  assert.equal(captured(), 'sheet', 'only the owner gives it back');
  release('sheet');
  assert.equal(captured(), null);
  assert.ok(PRIORITY.sheet > PRIORITY.drawer && PRIORITY.drawer > PRIORITY.back && PRIORITY.back > PRIORITY.tabs
    && PRIORITY.tabs > PRIORITY.cards && PRIORITY.cards > PRIORITY.drag && PRIORITY.drag > PRIORITY.select
    && PRIORITY.select > PRIORITY.hold && PRIORITY.hold > PRIORITY.bounce);
});
