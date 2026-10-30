// Arrange tabs (ui/tab-arrange.js): the order and the tabs off the bar (pure). node --test test/tab-arrange.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTabs, arrangeTabs, setTabOn, replaceTab, moveTab } from '../ui/tab-arrange.js';

const ALL = ['home', 'folders', 'haiku', 'bin', 'settings'];
const RULES = { max: 4, fixed: ['settings'] };

test('nothing saved: the default order, all on the bar up to the limit', () => {
  assert.deepEqual(arrangeTabs(ALL, null, RULES), { order: ALL, shown: ['home', 'folders', 'haiku', 'settings'], hidden: ['bin'] });
});

test('a saved order wins; a tab it leaves out keeps its place after the one before it; fixed stays last', () => {
  const r = arrangeTabs(ALL, { order: ['folders', 'home'], hidden: [] }, { max: 5, fixed: ['settings'] });
  assert.deepEqual(r.order, ['folders', 'home', 'haiku', 'bin', 'settings']);
  assert.deepEqual(arrangeTabs(['a', 'new', 'b'], { order: ['b', 'a'], hidden: [] }, { max: 5 }).order, ['b', 'a', 'new']);
});

test('off by default until put in the saved order; a tab the app no longer has is dropped', () => {
  const rules = { max: 5, fixed: ['settings'], offByDefault: ['bin'] };
  assert.deepEqual(arrangeTabs(ALL, null, rules).hidden, ['bin']);
  assert.deepEqual(arrangeTabs(ALL, { order: ALL, hidden: [] }, rules).hidden, []);
  assert.deepEqual(arrangeTabs(['home', 'settings'], { order: ['gone', 'settings', 'home'], hidden: ['gone'] }, rules).order, ['settings', 'home']);
});

test('fixed never goes off; too few shown falls back to the first ones', () => {
  assert.deepEqual(arrangeTabs(ALL, { order: [], hidden: ['settings'] }, RULES).shown.includes('settings'), true);
  assert.deepEqual(arrangeTabs(['a', 'b', 'c'], { order: [], hidden: ['a', 'b', 'c'] }).shown, ['a', 'b', 'c']);
});

test('showing a tab on a full bar asks which it replaces; replaceTab puts it in that place', () => {
  const s = { order: ALL, hidden: ['bin'] };
  assert.deepEqual(setTabOn(ALL, s, 'bin', true, RULES), { full: ['home', 'folders', 'haiku'] });
  const r = replaceTab(ALL, s, 'bin', 'folders', RULES);
  assert.deepEqual(arrangeTabs(ALL, r, RULES).shown, ['home', 'bin', 'haiku', 'settings']);
  assert.deepEqual(r.hidden, ['folders']);
});

test('hiding keeps at least min tabs; a fixed tab is left as it is', () => {
  const two = { order: ['home', 'settings'], hidden: [] };
  assert.deepEqual(setTabOn(['home', 'settings'], two, 'home', false, RULES), { tooFew: true });
  const r = setTabOn(ALL, null, 'haiku', false, RULES);
  assert.ok('state' in r && r.state.hidden.includes('haiku'));
  const f = setTabOn(ALL, null, 'settings', false, RULES);
  assert.ok('state' in f && !f.state.hidden.includes('settings'));
  const on = setTabOn(ALL, { order: ALL, hidden: ['haiku', 'bin'] }, 'bin', true, RULES);
  assert.ok('state' in on && !on.state.hidden.includes('bin'));
});

test('moving a tab; a saved value of the wrong shape cleans to the defaults', () => {
  assert.deepEqual(moveTab(ALL, null, 0, 2, RULES).order, ['folders', 'haiku', 'home', 'bin', 'settings']);
  assert.deepEqual(cleanTabs('x'), { order: [], hidden: [] });
  assert.deepEqual(cleanTabs({ order: ['a', 'a', 3, 'b c'], hidden: 'no' }), { order: ['a'], hidden: [] });
});
