// @core/ui bounce (ui/bounce.js) in Node: nothing runs on import, and the speed a let-go stretch springs back at is
// the finger's times the rubber band's slope there. The finger itself is in e2e (bounce.spec.mjs and the jank gate).
// node --test test/bounce.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { rubberSlope } from '../ui/bounce.js';
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
