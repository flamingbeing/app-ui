// Back with tabs and Press Back again to close (ui/tab-back.js) against a made-up history. node --test test/tab-back.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { tabBack } from '../ui/tab-back.js';

// a session history: entries, the current index, popstate after a step back (as browsers: later, not at once)
function fakeHistory() {
  /** @type {{ state: any, url: string }[]} */
  const list = [{ state: null, url: '/' }];
  let i = 0;
  let gone = false;   // Back from the first entry: the app is left
  const handlers = new Set();
  const history = {
    get state() { return list[i].state; },
    get length() { return list.length; },
    pushState(state, _t, url) { list.splice(i + 1); list.push({ state: structuredClone(state), url: url ?? list[i].url }); i++; },
    replaceState(state, _t, url) { list[i] = { state: structuredClone(state), url: url ?? list[i].url }; },
    back() {
      if (i === 0) { gone = true; return; }
      i--;
      queueMicrotask(() => { for (const h of handlers) h({ type: 'popstate' }); });
    },
  };
  const events = { addEventListener: (_t, h) => handlers.add(h), removeEventListener: (_t, h) => handlers.delete(h) };
  return { history, events, gone: () => gone, at: () => i, list };
}
const tick = () => new Promise(r => setTimeout(r, 0));
async function back(h) { h.history.back(); await tick(); }
function make(o = {}) {
  const h = fakeHistory();
  const said = [];
  let firsts = 0;
  const b = tabBack({ history: h.history, events: h.events, onFirst: () => firsts++, onClose: () => said.push('again'), closeMs: 50, ...o });
  return { h, b, said, firsts: () => firsts };
}

test('the guard: one entry at the start; the first Back stays and says so once, a second in the window leaves', async () => {
  const { h, b, said } = make();
  assert.equal(h.history.length, 2);
  await back(h);
  assert.deepEqual(said, ['again']);
  assert.equal(h.gone(), false);
  assert.equal(b.closing(), true);
  await back(h);
  assert.equal(h.gone(), true);
  assert.deepEqual(said, ['again'], 'no second toast');
});

test('after the window the guard is back: Back stays again, with one toast each time', async () => {
  const { h, b, said } = make();
  await back(h);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(b.closing(), false);
  assert.equal(h.history.length, 2, 'one guard, not two');
  await back(h);
  assert.deepEqual(said, ['again', 'again']);
  assert.equal(h.gone(), false);
});

test('tabs: one entry above the guard; Back on another tab goes to the first with no toast, then the guard asks', async () => {
  const { h, b, said, firsts } = make();
  b.went(false, '/rooms'); b.went(false, '/jobs');
  assert.equal(h.history.length, 3);
  await back(h);
  assert.equal(firsts(), 1);
  assert.deepEqual(said, []);
  await back(h);
  assert.deepEqual(said, ['again']);
  assert.equal(h.gone(), false);
});

test('a tap on the first tab steps back onto the guard: no onFirst, no toast', async () => {
  const { h, b, said, firsts } = make();
  b.went(false, '/rooms');
  b.went(true);
  await tick();
  assert.equal(firsts(), 0);
  assert.deepEqual(said, []);
  assert.equal(h.history.state?.uiTabGuard, 1);
});

test('another tab within the window: its entry is the guard too; Back comes to the first tab and the guard is back', async () => {
  const { h, b, said, firsts } = make();
  await back(h);
  b.went(false, '/rooms');
  assert.equal(b.closing(), false);
  assert.equal(h.history.length, 2);
  await back(h);
  assert.equal(firsts(), 1);
  assert.equal(h.history.state?.uiTabGuard, 1, 'guard pushed again');
  await back(h);
  assert.deepEqual(said, ['again', 'again']);
  assert.equal(h.gone(), false);
});

test('a sheet open when the window ends: the guard waits until Back closes the sheet', async () => {
  const { h, said } = make();
  await back(h);
  h.history.pushState({ uiSheet: 'new' }, '');
  await new Promise(r => setTimeout(r, 80));
  assert.equal(h.history.state?.uiTabGuard, undefined, 'never over the sheet');
  await back(h);   // closes the sheet
  assert.equal(h.history.state?.uiTabGuard, 1);
  assert.deepEqual(said, ['again']);
});

test('a sheet over the guard closes first; no toast', async () => {
  const { h, said } = make();
  h.history.pushState({ ...h.history.state, uiSheet: 'new' }, '');
  await back(h);
  assert.deepEqual(said, []);
  assert.equal(h.history.state?.uiTabGuard, 1);
});

test('after a reload on the guard (the state kept), no second guard', () => {
  const h = fakeHistory();
  h.history.pushState({ uiTabGuard: 1 }, '');
  tabBack({ history: h.history, events: h.events, onFirst() {}, onClose() {} });
  assert.equal(h.history.length, 2);
});

test('started on another tab: Back goes to the first tab (no toast), then asks', async () => {
  const { h, said, firsts } = make({ first: false });
  await back(h);
  assert.equal(firsts(), 1);
  assert.deepEqual(said, []);
  assert.equal(h.history.state?.uiTabGuard, 1);
  await back(h);
  assert.deepEqual(said, ['again']);
});

test('without onClose: no guard, Back on the first tab leaves (the old way)', async () => {
  const h = fakeHistory();
  tabBack({ history: h.history, events: h.events, onFirst() {} });
  assert.equal(h.history.length, 1);
  await back(h);
  assert.equal(h.gone(), true);
});

test('stop clears the window', async () => {
  const { h, b } = make();
  await back(h);
  b.stop();
  await new Promise(r => setTimeout(r, 80));
  assert.equal(h.at(), 0, 'no guard pushed after stop');
});
