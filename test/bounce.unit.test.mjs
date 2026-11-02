// @core/ui bounce (ui/bounce.js) in Node: nothing runs on import, and the speed a let-go stretch springs back at is
// the finger's times the rubber band's slope there. The finger itself is in e2e (bounce.spec.mjs and the jank gate).
// node --test test/bounce.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { rubberSlope, stuck } from '../ui/bounce.js';
import { rubber } from '../ui/gesture.js';

test('bounce: importing it touches no page (Node has none)', async () => {
  const m = await import('../ui/bounce.js');
  assert.equal(typeof m.bounce, 'function');
  assert.equal(typeof globalThis.document, 'undefined');
});

test('bounce: the rubber band\'s slope is its rate of change, about half at the start and less the further it goes', () => {
  for (const [d, w] of [[0, 800], [40, 800], [200, 800], [-150, 700]]) {
    const h = 0.01, num = (rubber(d + h, w) - rubber(d - h, w)) / (2 * h);
    assert.ok(Math.abs(rubberSlope(d, w) - num) < 1e-4, `slope at ${d}`);
  }
  assert.equal(rubberSlope(0, 800), 0.55);
  assert.ok(rubberSlope(300, 800) < rubberSlope(100, 800));
});

test('bounce: a sticky part moves with the content unless it is stuck to an edge', () => {
  const port = { top: 0, bottom: 800 }, top0 = { top: '0px', bottom: 'auto' }, foot0 = { top: 'auto', bottom: '0px' };
  // a strip under a title at the top: in its place, so it goes with the content
  assert.equal(stuck(top0, { top: 120, bottom: 200 }, port, 0, 1000), false);
  // scrolled down, held at the top: stuck, it stays at the foot's bounce
  assert.equal(stuck(top0, { top: 0, bottom: 80 }, port, 1000, 1000), true);
  assert.equal(stuck({ top: '44px', bottom: 'auto' }, { top: 44, bottom: 124 }, port, 300, 1000), true);
  // a bar stuck to the foot while the list is longer: stays; at the end, in its place: moves
  assert.equal(stuck(foot0, { top: 744, bottom: 800 }, port, 0, 1000), true);
  assert.equal(stuck(foot0, { top: 744, bottom: 800 }, port, 1000, 1000), false);
  // not sticky to either edge: never stuck
  assert.equal(stuck({ top: 'auto', bottom: 'auto' }, { top: 0, bottom: 80 }, port, 500, 1000), false);
});
