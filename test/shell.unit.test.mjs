// @core/ui's shell: the size classes and the search match (the pure parts). node --test app/test/shell.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { sizeClass, matchesSearch, wantsWideSide, TABLET_MIN, LAPTOP_MIN } from '../ui/shell/shell.js';
import { sideStore, SIDE_KEY } from '../ui/shell/wide-side.js';

test('size classes change at 600 and 840 px', () => {
  assert.equal(sizeClass(390), 'phone');
  assert.equal(sizeClass(TABLET_MIN - 1), 'phone');
  assert.equal(sizeClass(TABLET_MIN), 'tablet');
  assert.equal(sizeClass(LAPTOP_MIN - 1), 'tablet');
  assert.equal(sizeClass(LAPTOP_MIN), 'laptop');
  assert.equal(sizeClass(1920), 'laptop');
});

test('search matches every word, in any case and order', () => {
  assert.equal(matchesSearch('Lavender Balcony · full sun', 'balcony'), true);
  assert.equal(matchesSearch('Lavender Balcony · full sun', 'SUN lav'), true);
  assert.equal(matchesSearch('Lavender Balcony · full sun', 'balcony shade'), false);
  assert.equal(matchesSearch('anything', '   '), true);
});

test('the wide side bar is wanted only when the page opts in and the window is laptop wide', () => {
  const page = (/** @type {boolean} */ on) => ({ hasAttribute: (/** @type {string} */ n) => on && n === 'data-wide-side' });
  assert.equal(wantsWideSide(page(false), 1280), false);   // no attribute: never imported
  assert.equal(wantsWideSide(page(true), 390), false);
  assert.equal(wantsWideSide(page(true), LAPTOP_MIN - 1), false);
  assert.equal(wantsWideSide(page(true), LAPTOP_MIN), true);
});

test('the side bar store: localStorage by default, the app\'s own when given, failures read as shown', () => {
  const m = new Map();
  const storage = { getItem: (/** @type {string} */ k) => m.get(k) ?? null, setItem: (/** @type {string} */ k, /** @type {string} */ v) => { m.set(k, v); },
    removeItem: (/** @type {string} */ k) => { m.delete(k); } };
  const s = sideStore(null, storage);
  assert.equal(s.get(), false);
  s.set(true);
  assert.equal(m.get(SIDE_KEY), '1');
  assert.equal(sideStore(null, storage).get(), true);   // round trip, as after a reload
  s.set(false);
  assert.equal(m.has(SIDE_KEY), false);
  assert.equal(s.get(), false);
  const own = { v: true, get() { return this.v; }, set(/** @type {boolean} */ v) { this.v = v; } };
  assert.equal(sideStore(own), own);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(sideStore(null, broken).get(), false);
  assert.doesNotThrow(() => sideStore(null, broken).set(true));
});
