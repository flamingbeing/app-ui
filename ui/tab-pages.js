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
// stretches like iOS's rubber band (rubber), the first page too: a swipe never pulls the side bar out as a drawer (it
// took swipes meant to change page; the side bar's button opens it). The host gets touch-action: pan-y (.is-pager), so the browser never
// pans sideways and every sideways move stays the pager's; the pages beside are laid out at the first move that
// looks sideways (a scroll never pays for them). The bar's title cross-fades to the coming page's (its
// .ui-large-title) as the page passes halfway; anything in the bar marked data-swipe-fade fades out with the swipe
// and back in on the new page. Never on a pushed screen, in a field (a text box only while it is typed in), editor,
// sideways scroller, card deck ([data-swipe-own]), dialog, sheet or open menu, in select mode, with text selected,
// or within swipeEdge() px of either edge (the system's Back gestures and screens.js's edge swipe). A mostly vertical
// move scrolls instead. Less motion doesn't stop it: the pages move with the finger (direct touch, as iOS's paging
// with Reduce Motion). Off: data-swipe="off" on the tab bar (or <html>), or { swipe: false }.
// A tapped tab (or side link) slides its page in from the side it sits on in the tab bar (SLIDE_MS, the logbook's
// page motion), at every width; a finger landing on the page while it slides lands it at once. Less motion: it just switches. Off: data-slide="off" on the tab bar (or <html>), or
// { slide: false }. Fade mode (opt-in: data-slide="fade" on the tab bar or <html>, or { slide: 'fade' }; the reference
// apps' tab switch): the page leaves with a TAB_FADE_OUT_MS fade, TAB_FADE_GAP_MS of nothing, then the page's blocks
// (its direct children) fade in top-down, TAB_FADE_STAGGER_MS apart, no translate; the lit tab's pill fades
// (gestures/tabbar.css). Opacity only; Less motion: it just switches. Rise mode (opt-in: data-slide="rise" or { slide: 'rise' }):
// the page leaves with the same fade, then its blocks fade in and rise 12px top-down, the last landing ~317 ms in.
// Dip mode (opt-in: data-slide="dip" or { slide: 'dip' }; a one-piece page fade): the leaving page goes at once (a cut),
// TAB_DIP_GAP_MS of nothing, then the whole page fades in as one block from TAB_DIP_FROM to 1 over TAB_DIP_IN_MS, linear;
// no rise, no stagger, the lit tab switches at once. A tab (or the page) marked data-tab-motion="cut" has a TAB_CUT_GAP_MS
// blank and no fade. Opacity only; Less motion: it just switches.
// Drawn ahead (opt-in, from the logbook: { ahead }): so a swipe never brings in an empty or out-of-date page, not even
// in quick flicks in a row (each catches the glide and goes on from the page it was going to), ahead(page) asks the
// app to draw a still copy of a page that isn't on screen, in that page. Each time a page lands, every other page on
// the bar is asked, nearest first, one per idle moment, never under a finger or a glide (motion.js afterGesture); and
// as a finger lands, a page about to come in beside that hasn't been asked since it was last on screen is asked at
// once (a caught glide's new neighbours). The app keeps it cheap (a page it has just drawn ahead can return at once) and,
// if it empties its hidden pages, spares the ones with .is-beside (tabPages has laid them out beside the current one).
// Kept parts (opt-in: data-tab-keep="<name>" on a part of two pages side by side, such as a date bar both share): while
// a swipe slides the pages, the part stays still on screen, lined up with the current page's copy; the coming page's
// copy takes over at halfway (as the bar's title does), and on landing glides the last few px to its own place. The page
// beside is scrolled so its copy lines up where it can (a bar pinned at the top stays pinned on the page that comes).
// Towards a page beside without a copy, the part slides away with its page like the rest of it.
import { tabBack, CLOSE_MS } from './tab-back.js';
import { toaster } from './toast.js';
import { LABELS } from './labels.js';
import { still, SLIDE_MS, SLIDE_EASE, noGesture, listeners, swipeIntent, THROW_MS, rubber, unrubber, claim, onCaptured } from './gesture.js';
import { glide as springGlide, tracker, afterGesture } from './motion.js';
import { EDGE, swipeGoesBack } from './screens.js';
import { TABLET_MIN } from './shell/shell.js';

export { swipeIntent, THROW_MS, rubber, SPRING_S, springPath, SLIDE_MS } from './gesture.js';

/** Fade mode (above): the leaving page fades out, a gap, then each block fades in (ms). */
export const TAB_FADE_OUT_MS = 67, TAB_FADE_GAP_MS = 100, TAB_FADE_IN_MS = 120, TAB_FADE_STAGGER_MS = 20, TAB_FADE_BLOCKS = 12;
/** Rise mode (opt-in slide 'rise'): after TAB_RISE_GAP_MS each block fades in and rises TAB_RISE_PX over TAB_RISE_IN_MS; the
 * last block lands TAB_RISE_END_MS after the switch (the stagger between blocks is at most TAB_RISE_MAX_STAGGER_MS). */
export const TAB_RISE_GAP_MS = 10, TAB_RISE_IN_MS = 150, TAB_RISE_PX = 12, TAB_RISE_END_MS = 317, TAB_RISE_MAX_STAGGER_MS = 40;
/** Dip mode (opt-in slide 'dip'): the old page cut, TAB_DIP_GAP_MS blank, then the whole page fades in from TAB_DIP_FROM over
 * TAB_DIP_IN_MS (linear); a data-tab-motion="cut" tab: TAB_CUT_GAP_MS blank, no fade. */
export const TAB_DIP_GAP_MS = 100, TAB_DIP_IN_MS = 80, TAB_DIP_FROM = .15, TAB_CUT_GAP_MS = 50;

/** Dip mode's one page animation (pure): blank for the gap, then (unless `cut`) a linear fade from TAB_DIP_FROM to 1.
 * @param {boolean} [cut] @returns {{ keyframes: Keyframe[], duration: number }} */
export function tabDip(cut = false) {
  if (cut) return { keyframes: [{ opacity: 0 }, { opacity: 0 }], duration: TAB_CUT_GAP_MS };
  const duration = TAB_DIP_GAP_MS + TAB_DIP_IN_MS, at = TAB_DIP_GAP_MS / duration;
  return { keyframes: [{ opacity: 0, offset: 0 }, { opacity: 0, offset: at }, { opacity: TAB_DIP_FROM, offset: at }, { opacity: 1, offset: 1 }], duration };
}

/** The start delay of each of n blocks in fade mode (pure): after the gap, top-down, one stagger apart, the blocks past TAB_FADE_BLOCKS with the last.
 * With `rise`: spread so the last block (of at most TAB_FADE_BLOCKS + 1) ends at TAB_RISE_END_MS, no more than TAB_RISE_MAX_STAGGER_MS apart.
 * @param {number} n @param {boolean} [rise] @returns {number[]} */
export function tabFadeDelays(n, rise = false) {
  if (rise) {
    const seen = Math.min(n, TAB_FADE_BLOCKS + 1), step = seen > 1 ? Math.min(TAB_RISE_MAX_STAGGER_MS, (TAB_RISE_END_MS - TAB_RISE_IN_MS - TAB_RISE_GAP_MS) / (seen - 1)) : 0;
    return Array.from({ length: n }, (_, i) => Math.round(TAB_RISE_GAP_MS + Math.min(i, TAB_FADE_BLOCKS) * step));
  }
  return Array.from({ length: n }, (_, i) => TAB_FADE_GAP_MS + Math.min(i, TAB_FADE_BLOCKS) * TAB_FADE_STAGGER_MS);
}

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

/** In an idle moment (no requestIdleCallback, as Safari: soon after) @param {() => void} fn */
const idle = fn => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));

/** How quickly a let-go tab swipe settles (the spring's response in s): quicker than sheets' SPRING_S, so a page
 * change lands in about 0.3 s (owner 1 Nov: tab changes felt slow). */
export const PAGE_SPRING_S = 0.22;

/** A drawer a finger can pull (the shell's side bar on a phone, shell.js): pull(x) shows it x px out (0 closed),
 * release(x, v) lets it go there at v px/ms, to open or closed. (No swipe pulls it any more: the drawer option is
 * still taken, and ignored, so apps that pass it need no change.)
 * @typedef {{ pull: (x: number) => void, release: (x: number, v: number) => void }} PullDrawer */

/** The pages' glide after a let-go: where to, and whether it was a right swipe with nothing before.
 * @typedef {{ run: import('./motion.js').Glide, to: HTMLElement | null, missing: boolean, timer: ReturnType<typeof setTimeout> | number }} Gliding */

/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number, baseY?: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean | 'fade' | 'rise' | 'dip', drawer?: () => PullDrawer | null, onPrevMissing?: () => void,
 *   backToFirst?: boolean, backToClose?: boolean, toasts?: { show: (message: string, o?: { ms?: number }) => () => void },
 *   labels?: Record<string, string>, ahead?: (page: HTMLElement) => void, resume?: boolean | { minutes?: number } }} o
 *   screens: the page's screen stack; host: its .ui-screens; root: where the tabs and side links are (default the
 *   page); drawer: ignored (a swipe no longer pulls the side bar out); onPrevMissing: told after a right swipe on the first page (nothing before it); backToFirst (default on): Back
 *   on another page goes to the first, and Back there leaves (tab-back.js); off, the pages add no history at all;
 *   backToClose (default on, with backToFirst): the first Back on the first page stays and shows the backAgain words
 *   in a toast (the app's toaster given as toasts, else one of its own), a second within CLOSE_MS leaves; labels: words over LABELS;
 *   ahead: draws a still copy of a page that isn't on screen (above, "Drawn ahead"; left out, nothing is drawn ahead);
 *   resume (default off): warm start, a start soon after leaving opens the tab and scroll it was left on (resume.js;
 *   minutes: the window, default RESUME_MINUTES)
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void, drawAhead: () => void }}
 *   drawAhead: asks for every page again, nearest first (the app's data changed); nothing without ahead
 */
export function tabPages(bar, { screens, host, root = document, swipe = true, slide = true, onPrevMissing, backToFirst = true, backToClose = true, toasts, labels = {}, ahead, resume = false }) {
  const l = listeners();
  const html = document.documentElement;
  // warm start (resume.js): the tab theme/early.js found kept, and its scroll; opened at the end, before the first paint.
  // The mark comes off either way (an app that has turned resume off since)
  const keptTab = html.getAttribute('data-resuming'), keptY = Math.max(0, Number(html.getAttribute('data-resume-y')) || 0);
  html.removeAttribute('data-resuming'); html.removeAttribute('data-resume-y');
  /** one of the host's screens, by selector @param {string | null | undefined} sel @returns {HTMLElement | null} */
  const find = sel => {
    if (!sel) return null;
    try { const p = /** @type {HTMLElement | null} */ (document.querySelector(sel)); return p && p.parentElement === host ? p : null; }
    catch { return null; }
  };
  /** @param {Element | null} t */
  const pageOf = t => find(t?.getAttribute('data-tab-page'));
  // the swipe stops, in the tab bar's order (hidden tabs, and the ones the person took off the bar, left out)
  const stops = () => [...new Set(/** @type {HTMLElement[]} */ ([...bar.querySelectorAll('[data-tab-page]')])
    .filter(t => !t.hidden && !t.hasAttribute('data-off-bar')).map(pageOf).filter(p => p !== null))];
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
    const from = current;
    current = page;
    asked.delete(page);   // (live now: once left, the app may empty it)
    mark();
    const y = ys.get(page) ?? 0;
    const fade = tab && dir && ['fade', 'rise'].includes(slideKind()) && !still();
    // (not through a Promise unless fading: the page change itself stays synchronous, as a caught glide's landing expects)
    const change = () => screens.base(page).then(() => {
      scrollTo(0, y);
      if (current === page) drawAhead();
      if (tab && dir && !still()) { const k = slideKind(); if (k === 'fade' || k === 'rise') fadeIn(page, k === 'rise'); else if (k === 'dip') dipIn(page, tab); else if (k === 'slide') slideIn(page, dir); }
      if (current === page) back?.went(page === stops()[0]);
      host.dispatchEvent(new CustomEvent('ui-tab', { bubbles: true, detail: { page, tab } }));
    });
    if (fade) void fadeOut(from).then(change); else void change();
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
  /** how a tapped tab changes the page now: 'off', 'slide' (default), 'fade', 'rise' or 'dip' (data-slide on the bar or <html>, else the option) */
  function slideKind() {
    if (!slide || bar.dataset.slide === 'off' || html.dataset.slide === 'off') return 'off';
    // (the bar's own data-slide beats <html>'s, which beats the option: one app can give one bar its own motion)
    const own = [bar.dataset.slide, html.dataset.slide].find(v => v === 'dip' || v === 'rise' || v === 'fade' || v === 'slide');
    return own ?? (slide === 'dip' || slide === 'rise' || slide === 'fade' ? slide : 'slide');
  }
  /** fade mode, out: the leaving page fades (opacity only); it is put away by the switch @param {HTMLElement} from @returns {Promise<void>} */
  function fadeOut(from) {
    if (typeof from.animate !== 'function') return Promise.resolve();
    const a = from.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TAB_FADE_OUT_MS, easing: 'ease-in', fill: 'forwards' });
    return a.finished.then(() => { a.cancel(); }, () => {});
  }
  /** fade mode, in: after the gap each block of the page fades in, top-down; `rise`: and rises from 12px below, spread over ~317 ms
   * @param {HTMLElement} page @param {boolean} [rise] */
  function fadeIn(page, rise = false) {
    if (typeof page.animate !== 'function') return;
    sliding?.cancel();
    const blocks = [...page.children].filter(c => c instanceof HTMLElement).slice(0, TAB_FADE_BLOCKS + 1);
    const delays = tabFadeDelays(blocks.length, rise);
    const frames = rise ? [{ opacity: 0, transform: `translateY(${TAB_RISE_PX}px)` }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }];
    const as = blocks.map((b, i) => b.animate(frames,
      { duration: rise ? TAB_RISE_IN_MS : TAB_FADE_IN_MS, delay: delays[i], easing: 'ease-out', fill: 'backwards' }));
    const a = sliding = as[as.length - 1] ?? null;
    if (!a) return;
    const done = () => { if (sliding === a) sliding = null; };
    a.finished.then(done, done);
  }
  /** dip mode, in: the page (already switched: the old one is cut) stays blank for the gap, then fades in as one block;
   * a data-tab-motion="cut" tab or page: only the short blank @param {HTMLElement} page @param {Element} tab */
  function dipIn(page, tab) {
    if (typeof page.animate !== 'function') return;
    sliding?.cancel();
    const { keyframes, duration } = tabDip(tab.getAttribute('data-tab-motion') === 'cut' || page.getAttribute('data-tab-motion') === 'cut');
    const a = sliding = page.animate(keyframes, { duration, easing: 'linear' });
    const done = () => { if (sliding === a) sliding = null; };
    a.finished.then(done, done);
  }
  /** the tapped page comes in from its side (clipped, so the start offset can't widen the page) @param {HTMLElement} page @param {number} dir */
  function slideIn(page, dir) {
    sliding?.cancel();
    host.classList.add('is-sliding');
    const a = sliding = page.animate([{ transform: `translateX(${dir * Math.round(innerWidth * .3)}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: SLIDE_MS, easing: SLIDE_EASE });
    const done = () => { if (sliding === a) { sliding = null; host.classList.remove('is-sliding'); } };
    a.finished.then(done, done);
  }
  // drawn ahead: the pages asked for a copy since they were last on screen, and the run asking them (a newer one stops it)
  /** @type {WeakSet<HTMLElement>} */
  const asked = new WeakSet();
  let aheadRun = 0;
  /** @param {HTMLElement} page */
  function ask(page) {
    asked.add(page);
    try { ahead?.(page); } catch (err) { console.warn(err); }
  }
  function drawAhead() {
    if (!ahead) return;
    const run = ++aheadRun;
    /** @type {HTMLElement[] | null} */
    let todo = null;
    const later = () => idle(() => afterGesture(step));
    later();
    function step() {
      if (run !== aheadRun) return;
      if (x0 !== null || glide || ready) { later(); return; }   // a finger is down, or the pages are out: after them
      if (!todo) {
        const all = stops(), i = all.indexOf(current);
        /** @param {HTMLElement} p */
        const far = p => Math.abs(all.indexOf(p) - i);
        todo = all.filter(p => p !== current).sort((a, b) => far(a) - far(b));
      }
      const page = todo.shift();
      if (!page) return;
      if (todo.length) later();
      if (page !== current && page.isConnected) ask(page);
    }
  }
  mark();
  void screens.base(current).then(drawAhead);

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
    for (const k of keeps) { Object.assign(k.el.style, keepAt(k, dx)); Object.assign(k.page.style, liftAt(k.page, dx)); }
  };
  /** parts kept still while the pages slide (data-tab-keep): the part, its page, the page's offset, its lift to line up
   * @type {{ el: HTMLElement, page: HTMLElement, off: number, dy: number }[]} */
  let keeps = [];
  /** whether a kept part's copy shows with the pages at x: the current page's until the coming page's takes over at halfway
   * @param {HTMLElement} page @param {number} x */
  const keepShows = (page, x) => {
    const c = coming(x), half = gone(x) >= .5 && keeps.some(k => k.page === c);
    return page === current ? !half : page === c && half;
  };
  /** whether the part is held still at x: only towards a page that has its copy; towards one without, the current copy
   * goes with its page (else it hung over the page coming in and vanished as it landed)
   * @param {number} x */
  const keepHeld = x => keeps.some(k => k.page === coming(x));
  /** @param {{ off: number, dy: number, page: HTMLElement }} k @param {number} x @returns {Keyframe} */
  const keepAt = (k, x) => k.page === current && !keepHeld(x) ? { transform: 'translate(0px, 0px)', filter: 'opacity(1)' }
    : { transform: `translate(${-(x + k.off)}px, ${k.dy}px)`, filter: `opacity(${keepShows(k.page, x) ? 1 : 0})` };
  /** the page whose copy shows sits on top, so the page beside (painted later, over it) can't hide the part
   * @param {HTMLElement} page @param {number} x @returns {Keyframe} */
  const liftAt = (page, x) => ({ zIndex: keepShows(page, x) ? '1' : '0' });
  function findKeeps() {
    keeps = [];
    const mine = /** @type {HTMLElement | null} */ (current.querySelector('[data-tab-keep]'));
    if (!mine) return;
    const name = CSS.escape(mine.dataset.tabKeep ?? ''), top = mine.getBoundingClientRect().top;
    for (const [n, off] of /** @type {[HTMLElement | null, number][]} */ ([[prev, -w], [next, w]])) {
      const o = /** @type {HTMLElement | null} */ (n?.querySelector(`[data-tab-keep="${name}"]`) ?? null);
      if (!n || !o) continue;
      // the page beside scrolls (as far as it can) so its copy lines up: a bar stuck at the top stays stuck there
      let dy = top - o.getBoundingClientRect().top;
      if (Math.abs(dy) >= 1) {
        // (a stuck sticky part: 1px further, so the copy is stuck too, not just touching where it sticks)
        const y = Math.max(0, (ys.get(n) ?? 0) - dy + (dy < 0 && getComputedStyle(mine).position === 'sticky' ? 1 : 0));
        ys.set(n, y); n.style.top = `${readyY - y}px`;
        dy = top - o.getBoundingClientRect().top;
      }
      keeps.push({ el: o, page: n, off, dy });
    }
    if (keeps.length) keeps.push({ el: mine, page: current, off: 0, dy: 0 });
  }
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
    // no layers yet: most touches are scrolls, and on iOS a page made a layer as the scroll starts (and unmade as it
    // ends) goes blank while it scrolls; the layers come once the touch is a swipe (lift)
    host.classList.add('is-paging');
    for (const [n, off] of /** @type {[HTMLElement | null, number][]} */ ([[prev, -w], [next, w]])) {
      if (!n) continue;
      if (ahead && !asked.has(n)) ask(n);   // not drawn ahead since it was on screen (a caught glide's new neighbour)
      n.hidden = false;
      n.classList.add('is-beside');
      // where it shows at its own scroll (readyY, not scrollY: read after a page is unhidden, it lays both out here)
      n.style.top = `${readyY - (ys.get(n) ?? 0)}px`;
      n.style.transform = `translateX(${off}px)`;
    }
    findKeeps();
  }
  /** the touch is a swipe: the pages get their own layers, so each frame only moves them */
  const lift = () => host.classList.add('is-moving');
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
    for (const k of keeps) { k.el.style.transform = ''; k.el.style.filter = ''; k.page.style.zIndex = ''; }
    keeps = [];
  }
  // the pages laid out for a touch that became a scroll are put away once the scroll is done, not on its first frame
  const putAway = () => afterGesture(() => { if (x0 === null && !glide && ready) unpage(); });
  /** the pages land where the glide was taking them: the new page, or back @param {Gliding} g */
  function land(g) {
    clearTimeout(g.timer);
    if (small) small.textContent = own;   // the landing (go) names the bar; back, it keeps its own
    const kept = g.to ? keeps.find(k => k.page === g.to) : undefined;
    unpage();
    if (g.to) go(g.to); else if (g.missing) onPrevMissing?.();
    g.run.stop();
    // the new page's kept part glides from where it was held to its own place
    if (kept && Math.abs(kept.dy) >= 1 && !still()) kept.el.animate([{ transform: `translateY(${kept.dy}px)` }, { transform: 'none' }], { duration: 240, easing: SLIDE_EASE });
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
    lift();
    // the finger travel that puts the page where it is (more than that, on a rubber band)
    raw = (dx < 0 && !next) || (dx > 0 && !prev) ? unrubber(dx, w) : dx;
    place();
  }
  l.on(document, 'touchstart', (/** @type {TouchEvent} */ e) => {
    x0 = null;
    // a finger on a page still sliding in (a tapped tab): it lands now, so the scroll (or swipe) the finger starts
    // moves a page that stands still under it, not one still drifting in sideways and fading up
    if (sliding && host.contains(/** @type {Node} */ (e.target))) sliding.finish();
    const t = e.touches[0];
    const caught = !!glide && e.touches.length === 1 && host.contains(/** @type {Node} */ (e.target));
    if (glide && !caught) settle();
    if (!on() || e.touches.length > 1 || screens.depth() > 0 || !current) return;
    if (!caught) {
      const edge = swipeEdge(innerWidth);
      if (t.clientX <= edge || t.clientX >= innerWidth - edge) return;
      if (!current.contains(/** @type {Node} */ (e.target)) || noGesture(e.target, { idleText: true })) return;
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
      // a move the page can't hold: the browser has started its scroll, and keeps an up-or-down touch. A sideways one
      // is still the pager's (touch-action: pan-y, so the browser never pans sideways): Firefox sends one this way
      // after the drawer has shut (its touch hit-test still has the page as the drawer's inert one)
      if (!e.cancelable && Math.abs(my) > Math.abs(mx)) { x0 = null; putAway(); return; }
      if (Math.abs(mx) >= Math.abs(my)) { prepare(); if (e.cancelable) e.preventDefault(); }   // looks sideways: lay out, hold the scroll
      dir = swipeIntent(mx, my);
      if (!dir) return;
      if (dir === 'y') { x0 = null; putAway(); return; }   // a scroll: leave it to the page
      held = 'tabs';
      if (!claim('tabs')) { x0 = null; putAway(); return; }   // a part above has this touch
      prepare();
      lift();
    }
    if (e.cancelable) e.preventDefault();
    raw = mx;
    hist.add(e.timeStamp, t.clientX);
    // no page that way: the page stretches, less and less (iOS's rubber band)
    dx = (mx < 0 && !next) || (mx > 0 && !prev) ? rubber(mx, w) : mx;
    place();
  }, { passive: false });
  const end = (/** @type {TouchEvent} */ e) => {
    if (x0 === null) return;
    x0 = null;
    const v = hist.speed(e.timeStamp);
    if (dir !== 'x') { unpage(); return; }
    if (e.cancelable) e.preventDefault();   // no click on what the finger let go of (a caught page, a tap that stopped it)
    // a flick on a caught glide, the way it was going: one page on from where it was going (quick flicks each count)
    const onward = caughtWay !== 0 && Math.sign(v) === caughtWay && Math.abs(v) >= FLICK_V;
    const step = onward ? (v < 0 ? (next ? 1 : 0) : (prev ? -1 : 0)) : pageStep(dx, v, w, !!prev, !!next);
    const to = step === 1 ? next : step === -1 ? prev : null;
    // a right swipe on the first page (nothing before it): tell the app
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
    for (const k of keeps) parts.push([k.el, x => keepAt(k, x)], [k.page, x => liftAt(k.page, x)]);
    if (small) parts.push([small, x => ({ filter: `opacity(${titleShows(x)})` })]);
    const run = springGlide(parts, dx, to0, stretched ? 0 : v, { response: PAGE_SPRING_S });
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

  // warm start (opt-in: resume, resume.js): the kept tab opens now, before anything shows, at its kept scroll; the
  // module itself (keeping the place, holding the scroll while the rows come) loads with import() only when it is on
  let unresume = () => {}, stopped = false;
  if (resume) {
    const start = current;
    const tabY = () => (screens.depth() > 0 && screens.baseY ? screens.baseY() : scrollY);
    /** @param {string} tab @param {number} y @returns {boolean} whether it opened */
    const open = (/** @type {string} */ tab, /** @type {number} */ y, /** @type {Record<string, number> | undefined} */ others) => {
      for (const [id, oy] of Object.entries(others ?? {})) { const p = find(`#${id}`); if (p && p !== current && stops().includes(p) && !ys.has(p)) ys.set(p, oy); }   // the other pages' own places
      const page = find(`#${tab}`);
      if (!page || !stops().includes(page)) return false;
      if (page === current) scrollTo(0, y);
      else { ys.set(page, y); go(page); }
      return true;
    };
    /** @type {{ page: HTMLElement, y: number } | null} */
    /** @type {Record<string, number> | undefined} */
    let keptYs;
    try { keptYs = keptTab ? JSON.parse(localStorage.getItem('ui-resume') || 'null')?.ys : undefined; } catch { /* none */ }
    const resumed = keptTab && open(keptTab, keptY, keptYs) ? { page: current, y: keptY } : null;
    const othersY = () => Object.fromEntries([...ys].filter(([p]) => p !== current && p.id).map(([p, y]) => [p.id, y]));
    const minutes = typeof resume === 'object' ? resume.minutes : undefined;
    // (without early.js's mark: opened when the module comes, unless the person has moved on by then)
    const late = (/** @type {string} */ tab, /** @type {number} */ y, /** @type {Record<string, number> | undefined} */ others) => current === start && screens.depth() === 0 && scrollY < 1 && open(tab, y, others);
    void import('./resume.js').then(m => {
      if (stopped) return;
      unresume = m.resumeTabs({ current: () => current, y: tabY, ys: othersY, open: resumed ? undefined : late }, { minutes, resumed }).stop;
    }, err => console.warn(err));
  }

  return { go, current: () => current, drawAhead, stop: () => { stopped = true; unresume(); aheadRun++; l.stop(); standDown(); back?.stop(); settle(); unpage(); host.classList.remove('is-pager'); } };
}
