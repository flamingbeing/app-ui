// Lazy modules: each loads once, withMod keeps the order when loaded, a failure is forgotten, warmUp loads the rest
// one at a time and stops at a failure. node --test test/lazy-modules.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { lazyModules } from '../ui/lazy-modules.js';

test('a module loads once, however often it is needed', async () => {
  let calls = 0;
  const lazy = lazyModules({ a: async () => { calls++; return { x: 1 }; } });
  assert.equal(lazy.loaded('a'), undefined);
  const [m1, m2] = await Promise.all([lazy.need('a'), lazy.need('a')]);
  assert.equal(m1, m2);
  assert.equal(calls, 1);
  assert.equal(lazy.loaded('a'), m1);
});

test('withMod runs at once when the module is loaded, else after it loads', async () => {
  const lazy = lazyModules({ a: async () => ({ x: 1 }) });
  const order = [];
  const p = lazy.withMod('a', m => order.push(`late ${m.x}`));
  order.push('before');
  await p;
  lazy.withMod('a', () => order.push('now'));
  order.push('after');
  assert.deepEqual(order, ['before', 'late 1', 'now', 'after']);
});

test('a failed load is forgotten, so the next need asks again', async () => {
  let fail = true;
  const lazy = lazyModules({ a: async () => { if (fail) throw new Error('offline'); return { ok: true }; } });
  await assert.rejects(lazy.need('a'), /offline/);
  fail = false;
  assert.deepEqual(await lazy.need('a'), { ok: true });
});

test('warmUp loads the rest one at a time and stops at a failure', async () => {
  const seen = [];
  const warn = console.warn;
  console.warn = () => {};
  try {
    const lazy = lazyModules({
      a: async () => { seen.push('a'); return {}; },
      b: async () => { seen.push('b'); throw new Error('offline'); },
      c: async () => { seen.push('c'); return {}; },
    });
    lazy.warmUp(undefined, { delay: 0 });
    lazy.warmUp(undefined, { delay: 0 });   // only the first call runs
    await new Promise(r => setTimeout(r, 1000));
    assert.deepEqual(seen, ['a', 'b']);
  } finally { console.warn = warn; }
});
