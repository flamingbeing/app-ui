// Tab pages: each tab ([data-tab-page="#id"] on a button or link in nav.ui-tabbar, and on the side bar's links) shows
// one .ui-screen of the page's .ui-screens as the bottom screen (screens.js base); the tab with aria-current="page"
// starts. A tab without data-tab-page (one that opens a sheet) is left alone and is no swipe stop. Each page keeps
// its own scroll; tapping the current tab with a screen pushed over it goes back to the page. The host sends "ui-tab"
// (detail.page, detail.tab) after each change. Back, as Android apps do: another page goes to the first, the first
// leaves the app; switching pages adds no other history (tab-back.js; { backToFirst: false }: none at all). The first
// Back on the first page stays and says "Press Back again to close" (a toast); a second one within 2 s leaves
// ({ backToClose: false }: the first Back leaves).
// On a phone (< 600 px) a sideways swipe on the content moves to the next or previous page, the pages following the
// finger 1:1 (a pager) and, let go, glide on as iOS's paging does: a spring that starts at the finger's speed and settles
// without overshoot (springPath), to the next page if the finger's throw would carry it past half the width
// (pageStep), else back. A finger that lands on gliding pages catches them where they are and throws them again (the
// nearer page becomes the current one), so quick flicks in a row each count. Where there is no page the page
// stretches like iOS's rubber band (rubber); on the first page, given a drawer (the shell's side bar), a right swipe
// pulls the drawer out with the finger instead. The host gets touch-action: pan-y (.is-pager), so the browser never
// pans sideways and every sideways move stays the pager's; the pages beside are laid out at the first move that
// looks sideways (a scroll never pays for them). The bar's title cross-fades to the coming page's (its
// .ui-large-title) as the page passes halfway; anything in the bar marked data-swipe-fade fades out with the swipe
// and back in on the new page. Never on a pushed screen, in a field, editor, sideways scroller, card deck
// ([data-swipe-own]), dialog, sheet or open menu, in select mode, with text selected, or within swipeEdge() px of
// either edge (the system's Back gestures and screens.js's edge swipe). A mostly vertical move scrolls instead. Less
// motion doesn't stop it: the pages move with the finger (direct touch, as iOS's paging with Reduce Motion). Off:
// data-swipe="off" on the tab bar (or <html>), or { swipe: false }.
// A tapped tab (or side link) slides its page in from the side it sits on in the tab bar (SLIDE_MS, the logbook's
// page motion), at every width. Less motion: it just switches. Off: data-slide="off" on the tab bar (or <html>), or
// { slide: false }.
import { tabBack, CLOSE_MS } from './tab-back.js';
import { toaster } from './toast.js';
import { LABELS } from './labels.js';
import { still, noGesture, listeners, swipeIntent, THROW_MS, rubber, unrubber, claim, onCaptured } from './gesture.js';
import { glide as springGlide, tracker, afterGesture } from './motion.js';
import { EDGE, swipeGoesBack } from './screens.js';
import { TABLET_MIN } from './shell/shell.js';

export { swipeIntent, THROW_MS, rubber, SPRING_S, springPath } from './gesture.js';

/** A let-go this fast (px/ms) is a flick: it goes a page that way however short it was. */
export const FLICK_V = 0.4;

/** Where a let-go swipe goes (pure): 1 the next page, -1 the previous one, 0 back to this one. Like iOS's paging,
 * the page goes when where it is plus its throw (v x THROW_MS) is past half the width (a slow drag past half), or on
 * a flick (FLICK_V or faster) that way; a finger that turns back at the end takes it back. So quick flicks one after
 * another each go one page on (a caught glide counts from the page it was going to).
 * @param {number} dx  finger travel, negative = to the left @param {number} v  px/ms, signed like dx
 * @param {number} width @param {boolean} hasPrev @param {boolean} hasNext */
export function pageStep(dx, v, width, hasPrev, hasNext) {
  const end = dx + v * THROW_MS;
  if (hasNext && (end < -width / 2 || (v <= -FLICK_V && end < 0))) return 1;
  if (hasPrev && (end > width / 2 || (v >= FLICK_V && end > 0))) return -1;
  return 0;
}

/** How far from either edge a tab swipe may not start (pure): the system's Back gesture zone (Android's is about
 * 24-30 px at its default), a little wider on wide phones, never more than 32 px. @param {number} width */
export const swipeEdge = width => Math.max(EDGE, Math.min(32, width / 14));

/** How long a tapped tab's page takes to slide in, in ms. */
export const SLIDE_MS = 280;

/** A drawer a finger can pull (the shell's side bar on a phone, shell.js): pull(x) shows it x px out (0 closed),
 * release(x, v) lets it go there at v px/ms, to open or closed.
 * @typedef {{ pull: (x: number) => void, release: (x: number, v: number) => void }} PullDrawer */

/** The pages' glide after a let-go: where to, and whether it was a right swipe with nothing before.
 * @typedef {{ run: import('./motion.js').Glide, to: HTMLElement | null, missing: boolean, timer: ReturnType<typeof setTimeout> | number }} Gliding */

/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number, baseY?: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean, drawer?: () => PullDrawer | null, onPrevMissing?: () => void,
 *   backToFirst?: boolean, backToClose?: boolean, toasts?: { show: (message: string, o?: { ms?: number }) => () => void },
 *   labels?: Record<string, string> }} o
 *   screens: the page's screen stack; host: its .ui-screens; root: where the tabs and side links are (default the
 *   page); drawer: the drawer a right swipe on the first page pulls out (adaptiveShell().drawer); onPrevMissing
 *   (without a drawer): told after a right swipe on the first page (nothing before it); backToFirst (default on): Back
 *   on another page goes to the first, and Back there leaves (tab-back.js); off, the pages add no history at all;
 *   backToClose (default on, with backToFirst): the first Back on the first page stays and shows the backAgain words
 *   in a toast (the app's toaster given as toasts, else one of its own), a second within CLOSE_MS leaves; labels: words over LABELS
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void }}
 */
export function tabPages(bar, { screens, host, root = document, swipe = true, slide = true, drawer, onPrevMissing, backToFirst = true, backToClose = true, toasts, labels = {} }) {
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

  /** the tab of page lit (current's; a let-go swipe lights the page it goes to at once) @param {HTMLElement} [page] */
  function mark(page = current) {
    for (const t of root.querySelectorAll('[data-tab-page]')) {
      if (pageOf(t) === page) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    }
  }
  /** @param {string | HTMLElement} target @param {Element | null} [tab] */
  function go(target, tab = null) {
    if (glide) settle();   // a tab tapped while the pages glide: they land first
    if (ready) unpage();   // (laid out early, at a touch: put away)
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
      if (current === page) back?.went(page === stops()[0]);
      host.dispatchEvent(new CustomEvent('ui-tab', { bubbles: true, detail: { page, tab } }));
    });
  }
  // Back on another page goes to the first page (the address is the first page's already)
  // (the pages keep their own scroll: the browser's would land a page at the scroll it had when the entry was added)
  if (backToFirst) try { history.scrollRestoration = 'manual'; } catch { /* none */ }
  // Back on the first page: a toast, one at a time (made at the first Back, not before)
  /** @type {(() => void) | null} */
  let unsay = null;
  const onClose = () => {
    unsay?.();
    toasts ??= toaster(document.body);
    unsay = toasts.show(labels.backAgain ?? LABELS.backAgain, { ms: CLOSE_MS });
  };
  const back = backToFirst ? tabBack({ history, events: window, onFirst: () => { const first = stops()[0]; if (first) go(first); },
    onClose: backToClose ? onClose : undefined, first: current === stops()[0] }) : null;
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
  // the browser keeps vertical scrolls only: a sideways move is never its pan, so each one comes to the pager, at once
  // and cancelable (a browser pan, once started, would take the rest of the touch)
  host.classList.add('is-pager');
  /** @type {number | null} */
  let x0 = null;
  let y0 = 0, dx = 0, raw = 0, w = 0, ready = false, readyY = 0;
  /** @type {'x' | 'y' | null} */
  let dir = null;
  const hist = tracker();
  /** @type {HTMLElement | null} */
  let prev = null;
  /** @type {HTMLElement | null} */
  let next = null;
  /** the drawer this touch pulls (a right swipe on the first page), or null @type {PullDrawer | null} */
  let pulling = null;
  let held = '';   // the name this swipe claimed the touch as (its own win is not a rival's)
  /** the pages gliding after a let-go (motion.js), or null @type {Gliding | null} */
  let glide = null;
  /** the way the glide this touch caught was going (-1 left, 1 right, 0 none caught) */
  let caughtWay = 0;
  // the bar's title cross-fades to the coming page's at halfway; its data-swipe-fade parts fade out (filter, so the
  // bar's own opacity rules stand)
  const fades = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.ui-bar [data-swipe-fade]')]);
  /** @type {HTMLElement[]} */
  let faders = [];
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
  // one frame: transforms and filters only (the words change only at halfway)
  const place = () => {
    current.style.transform = `translateX(${dx}px)`;
    if (prev) prev.style.transform = `translateX(${dx - w}px)`;
    if (next) next.style.transform = `translateX(${dx + w}px)`;
    if (small) {
      const t = titleAt(dx);
      if (small.textContent !== t) small.textContent = t;
      small.style.filter = `opacity(${titleShows(dx)})`;
    }
    for (const f of faders) f.style.filter = `opacity(${fadeShows(dx)})`;
  };
  // the pages beside are laid out, out of sight, at the first move that looks sideways
  function prepare() {
    if (ready) return;
    ready = true;
    const all = stops(), i = all.indexOf(current);
    prev = all[i - 1] ?? null; next = all[i + 1] ?? null;
    w = host.clientWidth || innerWidth;
    readyY = scrollY;
    own = small?.textContent ?? '';
    faders = fades();
    host.classList.add('is-paging', 'is-moving');   // (its layers made now too, not at the first move)
    for (const [n, off] of /** @type {[HTMLElement | null, number][]} */ ([[prev, -w], [next, w]])) {
      if (!n) continue;
      n.hidden = false;
      n.classList.add('is-beside');
      n.style.top = `${scrollY - (ys.get(n) ?? 0)}px`;   // where it will be once shown at its own scroll
      n.style.transform = `translateX(${off}px)`;
    }
  }
  function unpage() {
    ready = false;
    host.classList.remove('is-paging', 'is-moving');
    current.style.transform = '';
    for (const n of [prev, next]) {
      if (!n) continue;
      n.classList.remove('is-beside');
      n.style.transform = ''; n.style.top = '';
      if (n !== current) n.hidden = true;
    }
    for (const f of faders) f.style.filter = '';
    if (small) small.style.filter = '';
  }
  // the pages laid out for a touch that became a scroll are put away once the scroll is done, not on its first frame
  const putAway = () => afterGesture(() => { if (x0 === null && !glide && ready) unpage(); });
  /** the pages land where the glide was taking them: the new page, or back @param {Gliding} g */
  function land(g) {
    clearTimeout(g.timer);
    if (small) small.textContent = own;   // the landing (go) names the bar; back, it keeps its own
    unpage();
    if (g.to) go(g.to); else if (g.missing) onPrevMissing?.();
    g.run.stop();
    // the new page's bar parts come in
    if (g.to && !still()) for (const f of faders) f.animate([{ filter: 'opacity(0)' }, { filter: 'opacity(1)' }], { duration: 200, easing: 'ease-out' });
  }
  /** the glide lands now (a tab tapped, the swipe stopped) */
  function settle() {
    const g = glide;
    glide = null;
    if (g) land(g);
  }
  /** a finger lands on the gliding pages: they stop under it, the nearer page as the current one */
  function catchGlide() {
    const g = /** @type {Gliding} */ (glide);
    glide = null;
    clearTimeout(g.timer);
    const x = g.run.stop();   // stopped where it is, under the finger
    caughtWay = Math.sign(g.run.to - g.run.from);
    // the page it was going to is the current one now (so a flick goes on from it), or the nearer one going back
    const near = g.to ?? (Math.abs(x) > w / 2 ? coming(x) : null);
    if (near) {
      const ahead = near === next;
      if (small) small.textContent = own;
      unpage();
      go(near);
      scrollTo(0, ys.get(near) ?? 0);   // (go's own scroll comes a moment later, the same)
      dx = ahead ? x + w : x - w;   // (where it is beside the old page, either side of the middle)
    } else {
      mark();
      ready = false;   // laid out again below, for the same page
      dx = x;
    }
    prepare();
    // the finger travel that puts the page where it is (more than that, on a rubber band)
    raw = (dx < 0 && !next) || (dx > 0 && !prev) ? unrubber(dx, w) : dx;
    place();
  }
  l.on(document, 'touchstart', (/** @type {TouchEvent} */ e) => {
    x0 = null;
    pulling = null;
    const t = e.touches[0];
    const caught = !!glide && e.touches.length === 1 && host.contains(/** @type {Node} */ (e.target));
    if (glide && !caught) settle();
    if (!on() || e.touches.length > 1 || screens.depth() > 0 || !current) return;
    if (!caught) {
      const edge = swipeEdge(innerWidth);
      if (t.clientX <= edge || t.clientX >= innerWidth - edge) return;
      if (!current.contains(/** @type {Node} */ (e.target)) || noGesture(e.target)) return;
      if (/** @type {Element} */ (e.target).closest('[data-swipe-own]')) return;   // a card deck's own swipe
      if (html.classList.contains('ui-menu-open') || document.querySelector('dialog[open]') || host.querySelector('.is-editing')) return;
      const sel = getSelection();
      if (sel && !sel.isCollapsed) return;
      dx = raw = 0; dir = null; caughtWay = 0;
      if (ready && scrollY !== readyY) unpage();   // laid out for another scroll
      // the pages beside are laid out now, before the finger has moved: the first move then only moves them (laid
      // out at that move, the move comes a frame or two late); a touch that turns out a scroll or a tap puts them away
      prepare();
    } else {
      catchGlide();
      dir = 'x';   // a caught page moves only sideways
      held = 'tabs';
      claim('tabs');   // a new touch: it is free
    }
    x0 = t.clientX - raw; y0 = t.clientY;
    hist.reset(e.timeStamp, t.clientX);
  }, { passive: true });
  l.on(document, 'touchmove', (/** @type {TouchEvent} */ e) => {
    if (x0 === null) return;
    const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
    if (!dir) {
      if (!e.cancelable) { x0 = null; putAway(); return; }   // the browser has started its scroll: it keeps the touch
      if (Math.abs(mx) >= Math.abs(my)) { prepare(); e.preventDefault(); }   // looks sideways: lay out, hold the scroll
      dir = swipeIntent(mx, my);
      if (!dir) return;
      if (dir === 'y') { x0 = null; putAway(); return; }   // a scroll: leave it to the page
      const d = mx > 0 && !prev ? drawer?.() ?? null : null;
      const want = d ? 'drawer' : 'tabs';
      held = want;
      if (!claim(want)) { x0 = null; putAway(); return; }   // a part above has this touch
      if (d) { pulling = d; unpage(); }   // the first page, swiped right: the drawer comes out instead
      else prepare();
    }
    if (e.cancelable) e.preventDefault();
    raw = mx;
    hist.add(e.timeStamp, t.clientX);
    if (pulling) { pulling.pull(Math.max(0, mx)); return; }
    // no page that way: the page stretches, less and less (iOS's rubber band)
    dx = (mx < 0 && !next) || (mx > 0 && !prev) ? rubber(mx, w) : mx;
    place();
  }, { passive: false });
  const end = (/** @type {TouchEvent} */ e) => {
    if (x0 === null) return;
    x0 = null;
    const v = hist.speed(e.timeStamp);
    if (pulling) {
      const d = pulling;
      pulling = null;
      if (e.cancelable) e.preventDefault();
      d.release(e.type === 'touchend' ? Math.max(0, raw) : 0, e.type === 'touchend' ? v : 0);
      return;
    }
    if (dir !== 'x') { unpage(); return; }
    if (e.cancelable) e.preventDefault();   // no click on what the finger let go of (a caught page, a tap that stopped it)
    // a flick on a caught glide, the way it was going: one page on from where it was going (quick flicks each count)
    const onward = caughtWay !== 0 && Math.sign(v) === caughtWay && Math.abs(v) >= FLICK_V;
    const step = onward ? (v < 0 ? (next ? 1 : 0) : (prev ? -1 : 0)) : pageStep(dx, v, w, !!prev, !!next);
    const to = step === 1 ? next : step === -1 ? prev : null;
    // a right swipe on the first page (nothing before it, no drawer): tell the app
    const missing = e.type === 'touchend' && !prev && raw > 0 && swipeGoesBack(raw, v, w);
    // the glide: a spring from where the finger left the page, at its speed (none from a stretched end), one frame each
    const stretched = dx !== raw;
    const to0 = step === 1 ? -w : step === -1 ? w : 0;
    /** @type {[Element, (x: number) => Keyframe][]} */
    const parts = [];
    for (const [el, off] of /** @type {[HTMLElement | null, number][]} */ ([[current, 0], [prev, -w], [next, w]])) {
      if (el) parts.push([el, x => ({ transform: `translateX(${x + off}px)` })]);
    }
    for (const f of faders) parts.push([f, x => ({ filter: `opacity(${fadeShows(x)})` })]);
    if (small) parts.push([small, x => ({ filter: `opacity(${titleShows(x)})` })]);
    const run = springGlide(parts, dx, to0, stretched ? 0 : v);
    /** @type {Gliding} */
    const g = glide = { run, to, missing, timer: 0 };
    mark(to ?? current);   // the tab lights at the let-go, as Android's does, not when the pages land
    if (small) {
      // the title's words change where the glide passes halfway (unseen: it is faded out there)
      const path = run.path, half = path.findIndex(x => titleAt(x) !== titleAt(path[0]));
      if (half >= 0) g.timer = setTimeout(() => { small.textContent = titleAt(path[half]); }, half * 1000 / 60);
      else small.textContent = titleAt(path[0]);
    }
    void run.done.then(landed => { if (landed && glide === g) settle(); });
  };
  l.on(document, 'touchend', end, { passive: false });
  l.on(document, 'touchcancel', end, { passive: true });
  // a part above took the touch mid-swipe: let go where it is, as a cancelled touch does
  const standDown = onCaptured(name => {
    if (x0 !== null && dir === 'x' && name !== held) end(/** @type {TouchEvent} */ (/** @type {unknown} */ ({ type: 'touchcancel', timeStamp: performance.now(), cancelable: false })));
  });

  return { go, current: () => current, stop: () => { l.stop(); standDown(); back?.stop(); settle(); unpage(); host.classList.remove('is-pager'); } };
}
