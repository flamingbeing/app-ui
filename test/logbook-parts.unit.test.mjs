// Drafts, drag-reorder, share out, Back closes the top dialog, screen history and hide mode (the pure parts and the
// history logic on a fake browser history). node --test test/logbook-parts.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { draftSlot, listDrafts } from '../ui/drafts.js';
import { moveIn } from '../ui/drag-list.js';
import { shareText, copyText } from '../ui/share.js';
import { createTransients } from '../ui/transients.js';
import { createNavigation } from '../ui/navigation.js';
import { backGuard, installedApp } from '../ui/back-guard.js';
import { cleanHideList, hideKey, MAX_HIDDEN, nameOf } from '../ui/hide-mode.js';
import { LABELS } from '../ui/labels.js';

/** a Storage stand-in: keys are enumerable like the real one */
function fakeStore() {
  const m = new Map();
  return new Proxy({}, {
    get: (_, k) => (k === 'getItem' ? key => (m.has(key) ? m.get(key) : null) : k === 'setItem' ? (key, v) => { m.set(key, String(v)); }
      : k === 'removeItem' ? key => { m.delete(key); } : undefined),
    ownKeys: () => [...m.keys()],
    getOwnPropertyDescriptor: (_, k) => (m.has(k) ? { enumerable: true, configurable: true, value: m.get(k) } : undefined),
  });
}

test('a draft is kept and found again by the next document', () => {
  const storage = fakeStore();
  const a = draftSlot('app', 'me', { storage, session: fakeStore() });
  assert.equal(a.initial, null);
  a.save({ text: 'half a thought' });
  assert.deepEqual(listDrafts('app', 'me', storage).map(d => d.value), [{ text: 'half a thought' }]);
  const b = draftSlot('app', 'me', { storage, session: fakeStore() });   // a new tab: no pointer, reads the owner's slot
  assert.equal(b.initial, null);   // its own slot is separate from a's
  a.clear();
  assert.deepEqual(listDrafts('app', 'me', storage), []);
});

test('a reload (same session) restores the draft into a new slot; move takes the released one over', () => {
  const storage = fakeStore(), session = fakeStore();
  const first = draftSlot('app', 'me', { storage, session });
  first.save('typed');
  const held = draftSlot('app', 'me', { storage, session, move: true });   // opened while the first is still held (a duplicated tab)
  assert.equal(held.initial, 'typed');
  assert.equal(listDrafts('app', 'me', storage).length, 2, 'a slot another document holds stays');
  held.release();   // the page was hidden or closed
  const reloaded = draftSlot('app', 'me', { storage, session, move: true });
  assert.equal(reloaded.initial, 'typed');
  assert.equal(listDrafts('app', 'me', storage).length, 2, 'the released slot was taken over, not left as a copy');
});

test('blocked storage: reads find nothing and save throws', () => {
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const slot = draftSlot('app', 'me', { storage: blocked, session: blocked });
  assert.equal(slot.initial, null);
  assert.throws(() => slot.save('x'));
  assert.doesNotThrow(() => slot.release());
});

test('moveIn returns a new array with the item moved', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveIn(list, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveIn(list, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(list, ['a', 'b', 'c', 'd']);
});

test('share out: the share sheet, else the clipboard; a closed sheet is not an error', async () => {
  const notes = [], toasts = { show: m => notes.push(m) };
  const nav = globalThis.navigator;
  const set = v => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true });
  try {
    set({ share: async () => {} });
    assert.equal(await shareText('hi', { toasts }), 'shared');
    set({ share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } });
    assert.equal(await shareText('hi', { toasts }), 'cancelled');
    assert.deepEqual(notes, []);
    let copied = '';
    set({ clipboard: { writeText: async t => { copied = t; } } });
    assert.equal(await shareText('hi', { toasts }), 'copied');
    assert.equal(copied, 'hi');
    assert.deepEqual(notes, [LABELS.copiedPaste]);
    set({ clipboard: { writeText: async () => { throw new Error('no'); } } });
    assert.equal(await copyText('hi', { toasts, labels: { copyFailed: 'Nope' } }), false);
    assert.equal(notes.at(-1), 'Nope');
  } finally { set(nav); }
});

/** a browser history stand-in: back() lands on the next tick and fires popstate */
function fakeBrowser(path = '/app') {
  const entries = [{ state: null, url: path }];
  let i = 0;
  const listeners = {};
  const location = { get pathname() { return entries[i].url.split(/[?#]/)[0]; }, get search() { const m = entries[i].url.match(/\?[^#]*/); return m ? m[0] : ''; },
    get hash() { const m = entries[i].url.match(/#.*/); return m ? m[0] : ''; }, get href() { return 'http://x' + entries[i].url; } };
  const fire = (type, e = {}) => (listeners[type] || []).forEach(fn => fn(e));
  const history = {
    get state() { return entries[i].state; },
    pushState(state, _t, url) { entries.splice(i + 1); entries.push({ state, url: url ?? entries[i].url }); i++; },
    replaceState(state, _t, url) { entries[i] = { state, url: url ?? entries[i].url }; },
    back() { if (i > 0) setTimeout(() => { i--; fire('popstate'); }, 0); },
    forward() { if (i < entries.length - 1) setTimeout(() => { i++; fire('popstate'); }, 0); },
  };
  const events = { addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); },
    removeEventListener: (t, fn) => { listeners[t] = (listeners[t] || []).filter(f => f !== fn); } };
  return { history, location, events, entries, at: () => i, fire };
}

test('Back closes the top dialog first, then the one under it', async () => {
  const b = fakeBrowser();
  const t = createTransients(b);
  const closed = [];
  const one = t.open(() => closed.push('one'));
  const two = t.open(() => closed.push('two'));
  assert.equal(b.at(), 2);
  b.history.back();
  await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(closed, ['two']);
  assert.equal(two.active, false);
  assert.equal(one.active, true);
  await one.close();   // closing from the page goes Back for its entry
  assert.deepEqual(closed, ['two', 'one']);
  assert.equal(b.at(), 0);
});

test('dismissAll closes every dialog, newest first; reset forgets them without dismissing', async () => {
  const b = fakeBrowser();
  const t = createTransients(b);
  const closed = [];
  t.open(() => closed.push('a'));
  t.open(() => closed.push('b'));
  await t.dismissAll();
  assert.deepEqual(closed, ['b', 'a']);
  const c = t.open(() => closed.push('c'));
  t.reset();
  assert.equal(c.active, false);
  assert.deepEqual(closed, ['b', 'a']);
});

test('screen history: go pushes, Back returns, a deep link gets its parents', async () => {
  const b = fakeBrowser('/app');
  const shown = [];
  const nav = createNavigation({ history: b.history, location: b.location, parents: { detail: 'list', list: 'home' },
    allowed: t => ['home', 'list', 'detail'].includes(t), onNavigate: (tab, scroll) => shown.push([tab, scroll]), getScroll: () => 120 });
  nav.initialize('detail');
  assert.equal(b.entries.length, 3, 'home, list, detail');
  assert.equal(b.location.hash, '#detail');
  assert.equal(nav.backTarget('home'), 'list');
  assert.equal(nav.go('detail'), false, 'already there');
  assert.equal(nav.go('nowhere'), false, 'not a screen');
  nav.go('home');
  assert.equal(b.location.hash, '#home');
  assert.deepEqual(shown, [['home', 0]]);
  assert.equal(nav.backTarget(), 'detail');
});

test('back guard: off in a browser tab; in the installed app a tap at home adds a spare entry Back uses once', async () => {
  const tab = fakeBrowser();
  backGuard({ history: tab.history, events: tab.events, standalone: false });
  tab.fire('pointerup');
  assert.equal(tab.entries.length, 1, 'a browser tab gets nothing');

  const b = fakeBrowser();
  let home = true, homes = 0;
  const g = backGuard({ history: b.history, events: b.events, standalone: true, atHome: () => home, onHome: () => homes++ });
  b.history.replaceState({ app: 1 }, '');
  assert.equal(b.entries.length, 1, 'nothing before a tap');
  home = false;
  b.fire('pointerup');
  assert.equal(g.armed(), false, 'not while something is open');
  home = true;
  b.fire('pointerup');
  assert.equal(b.entries.length, 2);
  assert.deepEqual(b.history.state, { app: 1, uiBackGuard: 'top' }, 'keeps the page\'s own state');
  b.fire('keydown');
  assert.equal(b.entries.length, 2, 'one spare entry only');
  b.history.pushState({ ...b.history.state, tab: 'items' }, '');   // the app's own step
  b.history.back();
  await new Promise(r => setTimeout(r, 5));
  assert.equal(homes, 0, 'the app\'s own step goes back first');
  b.history.back();
  await new Promise(r => setTimeout(r, 5));
  assert.equal(homes, 1, 'Back on the home screen stays');
  assert.equal(g.armed(), false);
  b.fire('pointerup');
  assert.equal(g.armed(), true, 'the next tap puts it back');
  g.stop();
});

test('installedApp: the home-screen window, not a browser tab', () => {
  assert.equal(installedApp(q => q === '(display-mode: standalone)', /** @type {any} */ ({})), true);
  assert.equal(installedApp(() => false, /** @type {any} */ ({ standalone: true })), true);
  assert.equal(installedApp(() => false, /** @type {any} */ ({})), false);
});

test('the hide list keeps only known kinds and short words, without repeats, up to the limit', () => {
  const clean = cleanHideList([
    { tab: 'home', kind: 'btn', name: '  Export   all ' }, { tab: 'home', kind: 'btn', name: 'Export all' },
    { tab: 'Bad Tab', kind: 'btn', name: 'x' }, { tab: 'home', kind: 'widget', name: 'x' }, { tab: 'home', kind: 'card', name: '' }, null, 'x',
  ]);
  assert.deepEqual(clean, [{ tab: 'home', kind: 'btn', name: 'Export all' }]);
  assert.equal(hideKey(clean[0]), 'home|btn|Export all');
  const many = Array.from({ length: MAX_HIDDEN + 20 }, (_, n) => ({ tab: 'home', kind: 'btn', name: `b${n}` }));
  assert.equal(cleanHideList(many).length, MAX_HIDDEN);
  assert.deepEqual(cleanHideList('nope'), []);
});

test('an icon button named only by its title has a name (whitespace around the icon is not one)', () => {
  const attrs = { title: 'Pick a day' };
  const btn = { matches: (/** @type {string} */ q) => q.includes('button'), getAttribute: (/** @type {string} */ a) => attrs[a] ?? null, textContent: '\n    \n  ' };
  assert.equal(nameOf(/** @type {any} */ (btn)), 'Pick a day');
});
