// The row swipe actions' pure parts: where a let-go row settles and where it shows under the finger.
// node --test test/swipe.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeSettle, swipeShown, FULL_AT, ACTION_W } from '../ui/swipe-actions.js';

const W = 390, TRAY = 2 * ACTION_W;

test('swipeSettle: past half the actions stays open, short of it closes, a flick counts its speed', () => {
  assert.equal(swipeSettle(-TRAY / 2 - 1, 0, W, TRAY, false), 'open');
  assert.equal(swipeSettle(-TRAY / 2 + 10, 0, W, TRAY, false), 'closed');
  assert.equal(swipeSettle(-30, -0.8, W, TRAY, false), 'open', 'a fast flick out opens from a short way');
  assert.equal(swipeSettle(-TRAY, 0.8, W, TRAY, false), 'closed', 'a flick back closes from fully open');
  assert.equal(swipeSettle(-50, 0, W, 0, false), 'closed', 'no actions that way');
  assert.equal(swipeSettle(0, 0, W, TRAY, true), 'closed');
});

test('swipeSettle: a full action runs past FULL_AT of the row, either way', () => {
  assert.equal(swipeSettle(-W * FULL_AT, 0, W, TRAY, true), 'full');
  assert.equal(swipeSettle(W * FULL_AT + 5, 0, W, TRAY, true), 'full');
  assert.equal(swipeSettle(-W * FULL_AT, 0, W, TRAY, false), 'open', 'no full action: open');
});

test('swipeShown: 1:1 up to the stop, a rubber band past it, a small give with no actions', () => {
  assert.equal(swipeShown(-100, W, TRAY, false), -100);
  const past = swipeShown(-TRAY - 100, W, TRAY, false);
  assert.ok(past < -TRAY && past > -TRAY - 100, 'stretches, less than the finger');
  assert.equal(swipeShown(-300, W, TRAY, true), -300, 'with a full action on, freely to the row\'s width');
  const none = swipeShown(60, W, 0, false);
  assert.ok(none > 0 && none < 15, 'a hint of give');
});
