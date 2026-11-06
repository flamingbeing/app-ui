// The photo viewer's pure parts (ui/photo-viewer.js): pan limits, a pinch keeping the point under the fingers, the
// double-tap zoom and which photo a swipe lands on. The fingers themselves: e2e/photo-viewer.spec.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panLimits, pinchTo, tapZoom, swipeTo, VIEWER_MAX_ZOOM, VIEWER_TAP_ZOOM } from '../ui/photo-viewer.js';
import { PRIORITY } from '../ui/gesture.js';

test('pan limits: none while the photo fits, half the overhang once zoomed past the box', () => {
  assert.deepEqual(panLimits(390, 260, 1, 390, 844), [0, 0]);
  assert.deepEqual(panLimits(390, 260, 2, 390, 844), [195, 0]);
  assert.deepEqual(panLimits(390, 260, 4, 390, 844), [585, 98]);
});

test('pinch: the point under the fingers stays under them; the zoom stops at its ends', () => {
  const m0 = { x: 50, y: -20, d: 100 };
  const r = pinchTo(m0, { x: 50, y: -20, d: 200 }, 1, 0, 0);
  assert.equal(r.s, 2);
  // the photo point under the fingers: (50 - x) / s, the same as before (50 - 0) / 1
  assert.equal((50 - r.x) / r.s, 50);
  assert.equal((-20 - r.y) / r.s, -20);
  // fingers moving together pan the photo with them
  const moved = pinchTo(m0, { x: 80, y: 10, d: 100 }, 1, 0, 0);
  assert.deepEqual(moved, { s: 1, x: 30, y: 30 });
  assert.equal(pinchTo(m0, { x: 50, y: -20, d: 5000 }, 1, 0, 0).s, VIEWER_MAX_ZOOM);
  assert.equal(pinchTo(m0, { x: 50, y: -20, d: 10 }, 1, 0, 0).s, 0.8);
});

test('double-tap: zooms in keeping the tapped point in place, or back out', () => {
  const t = tapZoom(100, -40, 1);
  assert.equal(t.s, VIEWER_TAP_ZOOM);
  assert.equal(100 * t.s + t.x, 100);
  assert.equal(-40 * t.s + t.y, -40);
  assert.deepEqual(tapZoom(100, -40, 3), { s: 1, x: 0, y: 0 });
});

test('swipe: past 18 % or thrown goes to the next or the one before; the ends hold', () => {
  assert.equal(swipeTo(1, 3, -100, 0, 390), 2);
  assert.equal(swipeTo(1, 3, 100, 0, 390), 0);
  assert.equal(swipeTo(1, 3, -40, 0, 390), 1);
  assert.equal(swipeTo(1, 3, -30, -0.8, 390), 2);
  assert.equal(swipeTo(1, 3, 30, -0.8, 390), 1);   // went right, thrown left: stays
  assert.equal(swipeTo(2, 3, -200, -1, 390), 2);
  assert.equal(swipeTo(0, 3, 200, 1, 390), 0);
});

test('the viewer owns its touch over every other part', () => {
  assert.ok(Object.entries(PRIORITY).every(([name, rank]) => name === 'viewer' || rank < PRIORITY.viewer));
});
