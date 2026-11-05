// Warm start (ui/resume.js and the pre-paint mark in theme/early.js): what is kept, when a start resumes, that both
// sides read the kept place by the same rule, and saving on pagehide / hidden with a fake storage, clock and page.
// node --test test/resume.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { keepPlace, placeToOpen, resumeTabs, RESUME_KEY, RESUME_MINUTES } from '../ui/resume.js';

const T = 1_800_000_000_000;
const at = { path: '/app/', now: T + 60_000 };

test('keepPlace: the tab, a whole scroll, when and until when; nothing for a page without a plain id', () => {
  assert.deepEqual(keepPlace({ path: '/app/', tab: 'inbox', y: 412.6, now: T }),
    { v: 1, path: '/app/', tab: 'inbox', y: 413, at: T, until: T + RESUME_MINUTES * 60_000 });
  assert.equal(keepPlace({ path: '/app/', tab: 'inbox', y: -5, now: T, minutes: 5 })?.y, 0);
  assert.equal(keepPlace({ path: '/app/', tab: 'inbox', y: NaN, now: T, minutes: 5 })?.until, T + 300_000);
  for (const tab of ['', '1st', 'a b', 'x"]', 'a'.repeat(65)]) assert.equal(keepPlace({ path: '/', tab, y: 0, now: T }), null);
});

test('placeToOpen: this page, inside its window, no deep link', () => {
  const raw = JSON.stringify(keepPlace({ path: '/app/', tab: 'inbox', y: 300, now: T }));
  assert.deepEqual(placeToOpen(raw, at), { tab: 'inbox', y: 300 });
  assert.equal(placeToOpen(raw, { ...at, hash: '#note-3' }), null);
  assert.equal(placeToOpen(raw, { ...at, search: '?id=3' }), null);
  assert.equal(placeToOpen(raw, { ...at, path: '/other/' }), null);
  assert.equal(placeToOpen(raw, { ...at, now: T + 60 * 60_000 }), null);   // the window has passed
  assert.equal(placeToOpen(raw, { ...at, now: T - 1 }), null);             // kept "later" than now: a changed clock
  for (const bad of [null, '', '{', 'null', '[]', '{"v":2}', JSON.stringify({ v: 1, path: '/app/', tab: '<b>', at: T, until: T + 1e9 })])
    assert.equal(placeToOpen(bad, at), null);
  assert.deepEqual(placeToOpen(JSON.stringify({ v: 1, path: '/app/', tab: 'a', y: 'x', at: T, until: T + 1e9 }), at), { tab: 'a', y: 0 });
});

/** runs theme/early.js as the browser would before the first paint, and returns the marks it put on <html> */
function earlyMarks(raw, { pathname = '/app/', hash = '', search = '', now = at.now, throws = false } = {}) {
  const attrs = {};
  const root = { dataset: {}, classList: { remove() {} }, setAttribute: (k, v) => { attrs[k] = v; } };
  const ctx = {
    location: { pathname, hash, search },
    localStorage: { getItem: k => { if (throws) throw new Error('blocked'); return k === RESUME_KEY ? raw : null; } },
    document: { documentElement: root },
    Date: { now: () => now },
    JSON,
  };
  vm.runInNewContext(fs.readFileSync(new URL('../theme/early.js', import.meta.url), 'utf8'), ctx);
  return attrs;
}

test('theme/early.js marks the same place placeToOpen opens, before anything paints', () => {
  const ok = JSON.stringify(keepPlace({ path: '/app/', tab: 'inbox', y: 300, now: T }));
  const cases = [
    [ok, {}], [ok, { hash: '#x' }], [ok, { search: '?q=1' }], [ok, { pathname: '/b/' }], [ok, { now: T + 2 * 3600_000 }],
    [JSON.stringify({ v: 1, path: '/app/', tab: 'a-b_c', y: -3, at: T, until: T + 1e9 }), {}], ['{oops', {}], [null, {}],
  ];
  for (const [raw, o] of cases) {
    const want = placeToOpen(raw, { path: o.pathname ?? '/app/', hash: o.hash, search: o.search, now: o.now ?? at.now });
    const got = earlyMarks(raw, o);
    assert.deepEqual(got, want ? { 'data-resuming': want.tab, 'data-resume-y': String(want.y) } : {}, JSON.stringify([raw, o]));
  }
  assert.deepEqual(earlyMarks(ok, { throws: true }), {});
});

/** a page stand-in: events, a document with a visibility state, a storage */
function fakePage({ storage = new Map(), throws = false } = {}) {
  const listeners = new Map();
  const target = () => ({
    addEventListener: (t, fn) => { listeners.set(t, [...(listeners.get(t) ?? []), fn]); },
    removeEventListener: (t, fn) => { listeners.set(t, (listeners.get(t) ?? []).filter(f => f !== fn)); },
  });
  const events = target();
  const doc = { ...target(), visibilityState: 'visible' };
  const fire = t => { for (const fn of listeners.get(t) ?? []) fn({ type: t }); };
  const store = {
    getItem: k => { if (throws) throw new Error('blocked'); return storage.get(k) ?? null; },
    setItem: (k, v) => { if (throws) throw new Error('full'); storage.set(k, v); },
  };
  return { events, doc, fire, store, storage, listeners };
}

test('resumeTabs keeps the place when the page is hidden or left, and stops cleanly', () => {
  const page = fakePage();
  let tab = { id: 'inbox' }, y = 120, now = T;
  const r = resumeTabs({ current: () => /** @type {any} */ (tab), y: () => y },
    { storage: page.store, now: () => now, location: { pathname: '/app/', hash: '', search: '' }, events: page.events, doc: /** @type {any} */ (page.doc), minutes: 10 });
  page.doc.visibilityState = 'visible';
  page.fire('visibilitychange');
  assert.equal(page.storage.has(RESUME_KEY), false);   // still showing: nothing kept
  page.doc.visibilityState = 'hidden';
  page.fire('visibilitychange');
  assert.deepEqual(JSON.parse(page.storage.get(RESUME_KEY)), { v: 1, path: '/app/', tab: 'inbox', y: 120, at: T, until: T + 600_000 });
  tab = { id: 'done' }; y = 0; now = T + 5;
  page.fire('pagehide');
  assert.equal(JSON.parse(page.storage.get(RESUME_KEY)).tab, 'done');
  tab = { id: '' };   // a page without a plain id: the last place stays
  page.fire('pagehide');
  assert.equal(JSON.parse(page.storage.get(RESUME_KEY)).tab, 'done');
  r.stop();
  assert.equal([...page.listeners.values()].flat().length, 0);
  const kept = JSON.parse(page.storage.get(RESUME_KEY));
  assert.equal(Object.keys(kept).sort().join(), 'at,path,tab,until,v,y');   // the place only: no data
});

test('resumeTabs without the pre-paint mark opens the kept tab itself; blocked storage is a normal start', () => {
  const page = fakePage();
  page.storage.set(RESUME_KEY, JSON.stringify(keepPlace({ path: '/app/', tab: 'done', y: 0, now: T })));
  const opened = [];
  const r = resumeTabs({ current: () => /** @type {any} */ ({ id: 'done' }), y: () => 0, open: (t, y) => { opened.push([t, y]); return true; } },
    { storage: page.store, now: () => at.now, location: { pathname: '/app/', hash: '', search: '' }, events: page.events, doc: /** @type {any} */ (page.doc) });
  assert.deepEqual(opened, [['done', 0]]);
  r.stop();
  const blocked = fakePage({ throws: true });
  const none = [];
  const r2 = resumeTabs({ current: () => /** @type {any} */ ({ id: 'inbox' }), y: () => 50, open: t => { none.push(t); return true; } },
    { storage: blocked.store, now: () => at.now, location: { pathname: '/app/', hash: '', search: '' }, events: blocked.events, doc: /** @type {any} */ (blocked.doc) });
  assert.doesNotThrow(() => r2.save());
  blocked.fire('pagehide');
  assert.deepEqual(none, []);
  r2.stop();
});

test('keepPlace / placeToOpen keep each other tab page\'s scroll too, and drop anything odd', () => {
  const kept = keepPlace({ path: '/app/', tab: 'inbox', y: 10, now: T, ys: { later: 412.6, top: 0, 'bad id': 5, big: NaN } });
  assert.deepEqual(kept?.ys, { later: 413 });
  assert.equal(keepPlace({ path: '/app/', tab: 'inbox', y: 10, now: T, ys: {} })?.ys, undefined);
  assert.deepEqual(placeToOpen(JSON.stringify(kept), at), { tab: 'inbox', y: 10, ys: { later: 413 } });
  assert.deepEqual(placeToOpen(JSON.stringify({ ...kept, ys: 'x' }), at), { tab: 'inbox', y: 10 });
});
