// Tab pages: each tab ([data-tab-page="#id"] on a button or link in nav.ui-tabbar, and on the side bar's links) shows
// one .ui-screen of the page's .ui-screens as the bottom screen (screens.js base); the tab with aria-current="page"
// starts. A tab without data-tab-page (one that opens a sheet) is left alone and is no swipe stop. Each page keeps
// its own scroll; tapping the current tab with a screen pushed over it goes back to the page. The host sends "ui-tab"
// (detail.page, detail.tab) after each change.
// On a phone (< 600 px) a sideways swipe on the content moves to the next or previous page, the pages following the
// finger (a pager) and, let go, glide on as iOS's paging does: a spring that starts at the finger's speed and settles
// without overshoot (springPath), to the next page if the finger's throw would carry it past half the width
// (pageStep), else back. Where there is no page the page stretches like iOS's rubber band (rubber). The pages beside
// are laid out at touchstart, so the first move has nothing to build. The bar's title cross-fades to the coming page's
// (its .ui-large-title) as the page passes halfway; anything in the bar marked data-swipe-fade fades out with the
// swipe and back in on the new page. Never on a pushed screen, in a field, editor,
// sideways scroller, dialog, sheet or open menu, in select mode, with text selected, or within swipeEdge() px of either edge (the larger of EDGE and an eighth of the width)
// (the system's Back gestures and screens.js's edge swipe). A mostly vertical move scrolls instead. Less motion: the
// swipe switches without the slide. Off: data-swipe="off" on the tab bar (or <html>), or { swipe: false }.
// A tapped tab (or side link) slides its page in from the side it sits on in the tab bar (SLIDE_MS, the logbook's
// page motion), at every width. Less motion: it just switches. Off: data-slide="off" on the tab bar (or <html>), or
// { slide: false }.
import { still, noGesture, listeners, velocity } from './gesture.js';
import { EDGE, swipeGoesBack } from './screens.js';
import { TABLET_MIN } from './shell/shell.js';

/** A first move's direction (pure): 'x' a sideways swipe, 'y' a scroll, null not far enough to tell. A swipe is under
 * about 37° from the horizontal. @param {number} mx @param {number} my */
export function swipeIntent(mx, my) {
  if (Math.max(Math.abs(mx), Math.abs(my)) < 10) return null;
  return Math.abs(mx) > Math.abs(my) * 1.3 ? 'x' : 'y';
}

/** How far ahead a let-go swipe's speed is projected, in ms (iOS's paging: the throw counts, not just the drag). */
export const THROW_MS = 200;

/** Where a let-go swipe goes (pure): 1 the next page, -1 the previous one, 0 back to this one. Like iOS's paging,
 * the page goes when where it is plus its throw (v x THROW_MS) is past half the width: a slow drag past half, or a
 * flick; a finger that turns back at the end takes it back.
 * @param {number} dx  finger travel, negative = to the left @param {number} v  px/ms, signed like dx
 * @param {number} width @param {boolean} hasPrev @param {boolean} hasNext */
export function pageStep(dx, v, width, hasPrev, hasNext) {
  const end = dx + v * THROW_MS;
  if (dx < 0 && hasNext && end < -width / 2) return 1;
  if (dx > 0 && hasPrev && end > width / 2) return -1;
  return 0;
}

/** iOS's rubber band (pure): how far a page shows when pulled d px where there is no page, for a width w. It gives
 * less and less, never more than w. @param {number} d @param {number} w */
export const rubber = (d, w) => Math.sign(d) * (1 - 1 / (Math.abs(d) * 0.55 / w + 1)) * w;

/** How quickly the let-go glide settles: the spring's response in s (iOS's paging feel). */
export const SPRING_S = 0.3;

/** A critically damped spring's path (pure), one position per 60 Hz frame from `from` to `to`, starting at v px/ms
 * (the finger's speed, so the page doesn't jerk when let go). The speed is capped so it lands without passing `to`
 * (no page waits beyond it). The last position is exactly `to`.
 * @param {number} from @param {number} to @param {number} v @param {number} [response] */
export function springPath(from, to, v, response = SPRING_S) {
  const w = 2 * Math.PI / response, a = from - to;
  // toward `to` faster than w|a| would pass it; cap there (the fastest start that still lands without overshoot)
  const v0 = Math.sign(v) === -Math.sign(a) ? -Math.sign(a) * Math.min(Math.abs(v * 1000), w * Math.abs(a)) : v * 1000;
  const b = v0 + w * a;
  const out = [from];
  for (let i = 1; i <= 90; i++) {
    const t = i / 60, x = (a + b * t) * Math.exp(-w * t);
    if (Math.abs(x) < 1) break;   // the last pixel is not seen; crawling to it is
    out.push(to + x);
  }
  out.push(to);
  return out;
}

/** How far from either edge a tab swipe may not start (pure): the system's Back gesture zone, wider on wide phones.
 * @param {number} width */
export const swipeEdge = width => Math.max(EDGE, width / 8);

/** How long a tapped tab's page takes to slide in, in ms. */
export const SLIDE_MS = 280;

/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number, baseY?: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean, onPrevMissing?: () => void }} o  screens: the page's screen stack; host: its
 *   .ui-screens; root: where the tabs and side links are (default the page); onPrevMissing: a right swipe on the
 *   first page (nothing before it)
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void }}
 */
export function tabPages(bar, { screens, host, root = document, swipe = true, slide = true, onPrevMissing }) {
  const l = listeners();
  const html = document.documentElement;
  /** one of the host's screens, by selector @param {string | null | undefined} sel @returns {HTMLElement | null} */
  const find = sel => {
    if (!sel) return null;
    try { const p = /** @type {HTMLElement | null} */ (document.querySelector(sel)); return p && p.parentElement === host ? p : null; }
    catch { return null; }
  };
  /** @param {Element | null} t */
  const pageOf = t => find(t?.getAttribute('data-tab-page'));
  // the swipe stops, in the tab bar's order (hidden tabs left out)
  const stops = () => [...new Set(/** @type {HTMLElement[]} */ ([...bar.querySelectorAll('[data-tab-page]')])
    .filter(t => !t.hidden).map(pageOf).filter(p => p !== null))];
  /** @type {HTMLElement} */
  let current = pageOf(bar.querySelector('[data-tab-page][aria-current="page"]')) ?? stops()[0] ?? /** @type {HTMLElement} */ (host.querySelector(':scope > .ui-screen'));
  /** @type {Map<HTMLElement, number>} */
  const ys = new Map();

  function mark() {
    for (const t of root.querySelectorAll('[data-tab-page]')) {
      if (pageOf(t) === current) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    }
  }
  /** @param {string | HTMLElement} target @param {Element | null} [tab] */
  function go(target, tab = null) {
    const page = typeof target === 'string' ? find(target) : target;
    if (!page || page.parentElement !== host) return;
    if (page === current) { if (screens.depth() > 0) void screens.base(page); return; }
    ys.set(current, screens.depth() > 0 && screens.baseY ? screens.baseY() : scrollY);   // a pushed screen's scroll isn't the tab's
    const order = stops();
    const dir = Math.sign(order.indexOf(page) - order.indexOf(current));
    current = page;
    mark();
    const y = ys.get(page) ?? 0;
    void screens.base(page).then(() => {
      scrollTo(0, y);
      if (tab && dir && slide && bar.dataset.slide !== 'off' && html.dataset.slide !== 'off' && !still()) slideIn(page, dir);
      host.dispatchEvent(new CustomEvent('ui-tab', { bubbles: true, detail: { page, tab } }));
    });
  }
  /** @type {Animation | null} */
  let sliding = null;
  /** the tapped page comes in from its side (clipped, so the start offset can't widen the page) @param {HTMLElement} page @param {number} dir */
  function slideIn(page, dir) {
    sliding?.cancel();
    host.classList.add('is-sliding');
    const a = sliding = page.animate([{ transform: `translateX(${dir * Math.round(innerWidth * .3)}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: SLIDE_MS, easing: 'cubic-bezier(.2, .7, .2, 1)' });
    const done = () => { if (sliding === a) { sliding = null; host.classList.remove('is-sliding'); } };
    a.finished.then(done, done);
  }
  mark();
  void screens.base(current);

  l.on(root, 'click', (/** @type {MouseEvent} */ e) => {
    const t = /** @type {Element} */ (e.target).closest?.('[data-tab-page]');
    if (!t || !pageOf(t)) return;
    e.preventDefault();
    go(/** @type {HTMLElement} */ (pageOf(t)), t);
  });

  // the swipe
  const on = () => swipe && innerWidth < TABLET_MIN && bar.dataset.swipe !== 'off' && html.dataset.swipe !== 'off';
  /** @type {number | null} */
  let x0 = null;
  let y0 = 0, dx = 0, raw = 0, w = 0, busy = false;
  /** @type {'x' | 'y' | null} */
  let dir = null;
  /** @type {[number, number][]} */
  let hist = [];
  /** @type {HTMLElement | null} */
  let prev = null;
  /** @type {HTMLElement | null} */
  let next = null;
  // the bar's title cross-fades to the coming page's at halfway; its data-swipe-fade parts fade out (filter, so the
  // bar's own opacity rules stand)
  const fades = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.ui-bar [data-swipe-fade]')]);
  const small = /** @type {HTMLElement | null} */ (root.querySelector('.ui-bar .ui-bar-title'));
  let own = '';
  /** the page coming in with the page at x, or null @param {number} x */
  const coming = x => x > 0 ? prev : x < 0 ? next : null;
  /** how far the page at x has gone, 0 to 1 (0 where no page comes) @param {number} x */
  const gone = x => coming(x) ? Math.min(1, Math.abs(x) / w) : 0;
  /** the bar's title for the page at x @param {number} x */
  const titleAt = x => gone(x) >= .5 ? coming(x)?.querySelector('.ui-large-title')?.textContent ?? own : own;
  /** @param {number} x */
  const titleShows = x => Math.abs(1 - 2 * gone(x));
  /** @param {number} x */
  const fadeShows = x => Math.max(0, 1 - 2 * gone(x));
  const place = () => {
    current.style.transform = `translateX(${dx}px)`;
    if (prev) prev.style.transform = `translateX(${dx - w}px)`;
    if (next) next.style.transform = `translateX(${dx + w}px)`;
    if (small) { small.textContent = titleAt(dx); small.style.filter = `opacity(${titleShows(dx)})`; }
    for (const f of fades()) f.style.filter = `opacity(${fadeShows(dx)})`;
  };
  // the pages beside are laid out as the finger lands, out of sight, so the first move only moves them
  function prepare() {
    const all = stops(), i = all.indexOf(current);
    prev = all[i - 1] ?? null; next = all[i + 1] ?? null;
    w = host.clientWidth || innerWidth;
    own = small?.textContent ?? '';
    if (still()) return;
    host.classList.add('is-paging');
    for (const [n, off] of /** @type {[HTMLElement | null, number][]} */ ([[prev, -w], [next, w]])) {
      if (!n) continue;
      n.hidden = false;
      n.classList.add('is-beside');
      n.style.top = `${scrollY - (ys.get(n) ?? 0)}px`;   // where it will be once shown at its own scroll
      n.style.transform = `translateX(${off}px)`;
    }
  }
  function unpage() {
    host.classList.remove('is-paging', 'is-moving');
    current.style.transform = '';
    for (const n of [prev, next]) {
      if (!n) continue;
      n.classList.remove('is-beside');
      n.style.transform = ''; n.style.top = '';
      if (n !== current) n.hidden = true;
    }
    for (const f of fades()) f.style.filter = '';
    if (small) small.style.filter = '';
  }
  l.on(document, 'touchstart', (/** @type {TouchEvent} */ e) => {
    x0 = null;
    if (!on() || busy || e.touches.length > 1 || screens.depth() > 0 || !current) return;
    const t = e.touches[0];
    const edge = swipeEdge(innerWidth);
    if (t.clientX <= edge || t.clientX >= innerWidth - edge) return;
    if (!current.contains(/** @type {Node} */ (e.target)) || noGesture(e.target)) return;
    if (html.classList.contains('ui-menu-open') || document.querySelector('dialog[open]') || host.querySelector('.is-editing')) return;
    const sel = getSelection();
    if (sel && !sel.isCollapsed) return;
    x0 = t.clientX; y0 = t.clientY; dx = raw = 0; dir = null; hist = [[e.timeStamp, t.clientX]];
    prepare();
  }, { passive: true });
  l.on(document, 'touchmove', (/** @type {TouchEvent} */ e) => {
    if (x0 === null) return;
    const t = e.touches[0], mx = t.clientX - x0;
    if (!dir) {
      dir = swipeIntent(mx, t.clientY - y0);
      if (!dir) return;
      if (dir === 'y') { x0 = null; unpage(); return; }   // a scroll: leave it to the page
      host.classList.add('is-moving');
    }
    if (e.cancelable) e.preventDefault();
    raw = mx;
    // no page that way: the page stretches, less and less (iOS's rubber band)
    dx = (mx < 0 && !next) || (mx > 0 && !prev) ? rubber(mx, w) : mx;
    hist.push([e.timeStamp, t.clientX]);
    if (hist.length > 5) hist.shift();
    if (!still()) place();
  }, { passive: false });
  const end = async (/** @type {Event} */ e) => {
    if (x0 === null) return;
    x0 = null;
    if (dir !== 'x') { unpage(); return; }
    if (small) small.textContent = own;   // the landing (go) names the bar; still or back, it keeps its own
    const v = velocity(hist);
    const step = pageStep(dx, v, w, !!prev, !!next);
    const to = step === 1 ? next : step === -1 ? prev : null;
    // a right swipe on the first page (nothing before it): tell the app (it opens a drawer)
    const missing = e.type === 'touchend' && !prev && raw > 0 && swipeGoesBack(raw, v, w);
    if (still() || !host.classList.contains('is-paging')) { unpage(); if (to) go(to); else if (missing) onPrevMissing?.(); return; }
    busy = true;
    // the glide: a spring from where the finger left the page, at its speed (none from a stretched end), one frame each
    const stretched = dx !== raw;
    const path = springPath(dx, step === 1 ? -w : step === -1 ? w : 0, stretched ? 0 : v);
    const timing = { duration: (path.length - 1) * 1000 / 60, easing: 'linear', fill: /** @type {const} */ ('forwards') };
    /** @type {Animation[]} */
    const runs = [];
    for (const [el, off] of /** @type {[HTMLElement | null, number][]} */ ([[current, 0], [prev, -w], [next, w]])) {
      if (el) runs.push(el.animate(path.map(x => ({ transform: `translateX(${x + off}px)` })), timing));
    }
    for (const f of fades()) runs.push(f.animate(path.map(x => ({ filter: `opacity(${fadeShows(x)})` })), timing));
    if (small) {
      runs.push(small.animate(path.map(x => ({ filter: `opacity(${titleShows(x)})` })), timing));
      // the title's words change where the glide passes halfway (unseen: it is faded out there)
      const half = path.findIndex(x => titleAt(x) !== titleAt(path[0]));
      if (half >= 0) setTimeout(() => { small.textContent = titleAt(path[half]); }, half * 1000 / 60);
      else small.textContent = titleAt(path[0]);
    }
    await Promise.all(runs.map(a => a.finished.catch(() => {})));
    unpage();
    if (to) go(to); else if (missing) onPrevMissing?.();
    for (const a of runs) a.cancel();
    // the new page's bar parts come in
    if (to) for (const f of fades()) f.animate([{ filter: 'opacity(0)' }, { filter: 'opacity(1)' }], { duration: 200, easing: 'ease-out' });
    busy = false;
  };
  l.on(document, 'touchend', end, { passive: true });
  l.on(document, 'touchcancel', end, { passive: true });

  return { go, current: () => current, stop: () => { l.stop(); unpage(); } };
}
