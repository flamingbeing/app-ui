// A settings section's `visible` (ui/section-gate.js): a function or an option key, live, default visible.
// node --test test/section-gate.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gate } from '../ui/section-gate.js';

/** a fake settings api: set() notifies the watchers of that key and of null */
function fake(values = {}) {
  const watchers = [];
  return {
    watchers,
    get: k => values[k],
    watch(key, fn) { const w = { key, fn }; watchers.push(w); return () => { watchers.splice(watchers.indexOf(w), 1); }; },
    set(k, v) { values[k] = v; for (const w of [...watchers]) if (w.key === null || w.key === k) w.fn(v, k); },
  };
}

test('no visible: always shown, nothing watched', () => {
  const s = fake();
  const g = gate(s, undefined, () => assert.fail('never changes'));
  assert.equal(g.now(), true);
  assert.equal(s.watchers.length, 0);
  g.stop();
});

test('a key: read with settings.get and watched by that key; only a flip calls change', () => {
  const s = fake({ pro: false });
  const seen = [];
  const g = gate(s, 'pro', v => seen.push(v));
  assert.equal(g.now(), false);
  assert.deepEqual(s.watchers.map(w => w.key), ['pro']);
  s.set('other', 1);
  s.set('pro', true);
  s.set('pro', true);
  s.set('pro', false);
  assert.deepEqual(seen, [true, false]);
  assert.equal(g.now(), false);
});

test('a function: re-run on any settings change', () => {
  const s = fake({ a: 1, b: 1 });
  const seen = [];
  const g = gate(s, () => s.get('a') > 1 && s.get('b') > 1, v => seen.push(v));
  assert.deepEqual(s.watchers.map(w => w.key), [null]);
  s.set('a', 2);
  assert.deepEqual(seen, []);
  s.set('b', 2);
  assert.deepEqual(seen, [true]);
  assert.equal(g.now(), true);
});

test('a function that throws counts as hidden; stop unwatches', () => {
  const s = fake({ x: 0 });
  const g = gate(s, () => { if (s.get('x')) throw new Error('boom'); return true; }, () => {});
  assert.equal(g.now(), true);
  s.set('x', 1);
  assert.equal(g.now(), false);
  g.stop();
  assert.equal(s.watchers.length, 0);
});
