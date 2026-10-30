// Instant start (ui/load-state.js cachedPaint, holdEmpty, swapWhenReady), the caret above the keyboard (keyboard.js
// caretShift) and what counts as a part over the first tab (tab-back.js over), on small made-up elements.
// node --test test/instant-start.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedPaint, holdEmpty, swapWhenReady } from '../ui/load-state.js';
import { caretShift } from '../ui/keyboard.js';
import { over } from '../ui/tab-back.js';

const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

// just enough of an element: attributes, classes, children, markup (a row's markup is its id and attributes)
class El {
  constructor(id = '') { this.id = id; this.attrs = new Map(); this.kids = []; this.parentNode = null; this.handlers = new Map(); this.inert = false;
    this.classes = new Set(); const self = this;
    this.classList = { add: c => self.classes.add(c), remove: c => self.classes.delete(c), contains: c => self.classes.has(c) }; }
  get children() { return this.kids; }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
  removeAttribute(k) { this.attrs.delete(k); }
  hasAttribute(k) { return this.attrs.has(k); }
  addEventListener(t, f) { this.handlers.set(t, f); }
  removeEventListener(t) { this.handlers.delete(t); }
  append(...n) { for (const c of n) { c.parentNode?.kids.splice(c.parentNode.kids.indexOf(c), 1); c.parentNode = this; this.kids.push(c); } }
  remove() { this.parentNode?.kids.splice(this.parentNode.kids.indexOf(this), 1); this.parentNode = null; }
  replaceChildren(...n) { for (const c of this.kids) c.parentNode = null; this.kids = []; this.append(...n); }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  closest() { return this.attrs.has('data-id') ? this : null; }
  querySelectorAll() { return []; }
  cloneNode(deep) { const c = new El(this.id); c.attrs = new Map(this.attrs); c.classes = new Set(this.classes); if (deep) c.append(...this.kids.map(k => k.cloneNode(true))); return c; }
  get innerHTML() { return this.kids.map(k => `<li ${[...k.attrs].map(([a, v]) => `${a}="${v}"`).join(' ')}${k.classes.size ? ` class="${[...k.classes].join(' ')}"` : ''}></li>`).join(''); }
  set innerHTML(html) { this.replaceChildren(...[...html.matchAll(/data-id="([^"]+)"/g)].map(m => { const r = new El(); r.setAttribute('data-id', m[1]); return r; })); }
}
globalThis.Element = El;
const docHandlers = new Map();
globalThis.document = { visibilityState: 'visible', addEventListener: (t, f) => docHandlers.set(t, f), removeEventListener: t => docHandlers.delete(t) };
const row = id => { const r = new El(); r.setAttribute('data-id', id); return r; };

test('cachedPaint: no copy kept, nothing painted; the list kept a moment after keep(), its first rows only, without the current mark', async () => {
  const host = new El('items'), kept = [];
  const c = cachedPaint(host, { read: () => null, write: h => kept.push(h), rows: 2, wait: 5 });
  assert.equal(c.painted, false);
  assert.equal(host.children.length, 0);
  const a = row('a'); a.setAttribute('aria-current', 'true'); a.classList.add('changed');
  host.append(a, row('b'), row('c'));
  c.keep(); c.keep();
  assert.equal(kept.length, 0, 'not at once');
  await tick(30);
  assert.deepEqual(kept, ['<li data-id="a"></li><li data-id="b"></li>'], 'once, two rows, no aria-current or .changed');
  assert.equal(a.getAttribute('aria-current'), 'true', 'the list itself keeps its mark');
  c.stop();
});

test('cachedPaint: the kept copy paints at once; a row tapped meanwhile comes back at takeOver, which empties the host', () => {
  const host = new El('items');
  const c = cachedPaint(host, { read: () => '<li data-id="n1"></li><li data-id="n2"></li>', write: () => {} });
  assert.equal(c.painted, true);
  assert.equal(host.children.length, 2);
  assert.ok(host.hasAttribute('data-ui-cached'));
  assert.equal(host.getAttribute('aria-busy'), 'true');
  host.handlers.get('click')({ target: host.children[1] });
  assert.equal(c.takeOver(), 'n2');
  assert.equal(host.children.length, 0);
  assert.equal(host.hasAttribute('data-ui-cached'), false);
  assert.equal(c.takeOver(), '', 'only once');
  c.stop();
});

test('cachedPaint: the copy never overwrites itself before the real list came; leaving writes at once; drop forgets it', async () => {
  const host = new El('items'), kept = [];
  const c = cachedPaint(host, { read: () => '<li data-id="old"></li>', write: h => kept.push(h), wait: 1 });
  c.keep(); await tick(20);
  assert.deepEqual(kept, [], 'still the copy');
  c.takeOver(); host.append(row('new'));
  c.keep();
  document.visibilityState = 'hidden'; docHandlers.get('visibilitychange')(); document.visibilityState = 'visible';
  assert.deepEqual(kept, ['<li data-id="new"></li>']);
  c.drop();
  assert.equal(kept.at(-1), null);
  await tick(20);
  assert.equal(kept.length, 2, 'the timer was spent by the leave');
  c.stop();
});

test('cachedPaint: storage that throws is no copy', () => {
  const c = cachedPaint(new El(), { read: () => { throw new Error('off'); }, write: () => { throw new Error('off'); } });
  assert.equal(c.painted, false);
  c.drop();
  c.stop();
});

test('holdEmpty: holds until release, onEnd once; never holds without hold; ends by itself after ms', async () => {
  let ends = 0;
  const h = holdEmpty({ onEnd: () => ends++ });
  assert.equal(h.holding, true);
  h.release(); h.release();
  assert.equal(h.holding, false);
  assert.equal(ends, 1);
  assert.equal(holdEmpty({ hold: false }).holding, false);
  const t = holdEmpty({ ms: 5, onEnd: () => ends++ });
  await tick(20);
  assert.equal(t.holding, false);
  assert.equal(ends, 2);
});

test('swapWhenReady: an empty host takes the view at once; else the old view stays up (inert) until ready', async () => {
  const host = new El(), first = new El('first');
  assert.equal(await swapWhenReady(host, first, Promise.resolve()), true);
  assert.deepEqual(host.children, [first]);
  let done; const ready = new Promise(r => { done = r; });
  const second = new El('second');
  const shown = swapWhenReady(host, second, ready);
  assert.deepEqual(host.children, [first, second]);
  assert.equal(first.inert, true);
  assert.ok(second.classList.contains('ui-swap-in'));
  done();
  assert.equal(await shown, true);
  assert.deepEqual(host.children, [second]);
  assert.equal(second.classList.contains('ui-swap-in'), false);
});

test('swapWhenReady: a later swap wins; a failed load swaps in too', async () => {
  const host = new El(), old = new El('old');
  host.append(old);
  let a; const slow = new Promise(r => { a = r; });
  const one = new El('one'), two = new El('two');
  const p1 = swapWhenReady(host, one, slow);
  const p2 = swapWhenReady(host, two, Promise.reject(new Error('no')));
  assert.equal(one.parentNode, null, 'the earlier one waiting is dropped');
  assert.equal(await p2, true);
  a();
  assert.equal(await p1, false);
  assert.deepEqual(host.children, [two]);
});

test('caretShift: nothing when the caret shows; down past the bottom, up past the top, a margin clear', () => {
  const view = { top: 100, bottom: 500 };
  assert.equal(caretShift({ top: 200, bottom: 220 }, view), 0);
  assert.equal(caretShift({ top: 600, bottom: 620 }, view), 132);
  assert.equal(caretShift({ top: 50, bottom: 70 }, view), -62);
  assert.equal(caretShift({ top: 480, bottom: 500 }, view, 0), 0);
});

test('caretShift: a field taller than the room moves only when out of sight', () => {
  const view = { top: 0, bottom: 300 };
  assert.equal(caretShift({ top: 100, bottom: 900 }, view), 0);
  assert.equal(caretShift({ top: 400, bottom: 1200 }, view), 388);
});

test('over: a pushed screen, a transient with ids or an app\'s own mark is over the tab; depth 0 or an emptied list is not', () => {
  for (const m of [1, 2, true, { base: '/', ids: ['view-1'] }, { any: 1 }]) assert.equal(over(m), true, JSON.stringify(m));
  for (const m of [undefined, null, 0, false, { base: '/', ids: [] }]) assert.equal(over(m), false, JSON.stringify(m));
});

test('whyRefused (sign-in sheet): names the account whose data stays and points to forget; nothing for other answers', async () => {
  const { whyRefused } = await import('../ui/sign-in-sheet.js');
  assert.match(whyRefused({ reason: 'unsent', from: { email: 'ann@example.com' } }), /ann@example\.com.*forget this device/);
  assert.match(whyRefused({ reason: 'wipe', from: { email: 'ann@example.com' } }), /ann@example\.com.*forget this device/);
  assert.match(whyRefused({ reason: 'unsent', from: null }), /the last account/);
  assert.equal(whyRefused({ reason: '' }), '');
});
