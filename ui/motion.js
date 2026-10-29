// Motion: the finger physics every drag in the kit shares, and an app's own drags can take. The rules (README,
// "Responsiveness rules"): a drag follows the finger 1:1 from its first move, with touch-action set so the browser
// never takes the drag's axis; let go, the finger's speed is handed to a critically damped spring (glide) that moves
// transform and opacity only and runs on the compositor (Web Animations), so a busy main thread can't stutter it; a
// finger landing on a glide stops it where it is (stop() gives the place) and drags on from there; at an edge the
// move stretches like iOS's rubber band. Less motion (still()) never stops a finger-driven move or the glide that
// finishes it; only extra flourishes skip. afterGesture() holds an app's work (save, sync, re-render) until the
// fingers lift and the glides land; pressFeedback() marks a touched control pressed at once.
// Nothing runs on import: listeners are added by the first call that needs them.
import { springPath, pathAt, releaseVelocity, swipeIntent, rubber, SPRING_S, SLOP, listeners, claim, onCaptured } from './gesture.js';

export { rubber, unrubber, springPath, releaseVelocity, swipeIntent, THROW_MS, SPRING_S, still } from './gesture.js';

// the glides moving now (afterGesture waits for them)
let gliding = 0;

/**
 * A glide: a spring from where a finger let go to where it rests.
 * @typedef {{ from: number, to: number, path: number[], at: () => number, stop: () => number,
 *   done: Promise<boolean>, running: () => boolean }} Glide
 *   at: where it is now; stop: stops it there (a finger caught it) and gives that place; done: true once it lands,
 *   false if stopped first. A landed glide holds its last frame until stop() (set the resting styles, then stop).
 */

/**
 * Glides `parts` from `from` to `to` on a critically damped spring that starts at the finger's speed v (px/ms) and
 * lands without overshoot (springPath; about a third of a second). Each part is an element and the keyframe it shows
 * at a place x, transform or opacity only (the compositor runs them; no layout per frame).
 * @param {[Element, (x: number) => Keyframe][]} parts
 * @param {number} from @param {number} to @param {number} [v] @param {{ response?: number }} [o]  response: the spring's, in s
 * @returns {Glide}
 */
export function glide(parts, from, to, v = 0, { response = SPRING_S } = {}) {
  const path = springPath(from, to, v, response);
  const timing = { duration: (path.length - 1) * 1000 / 60, easing: 'linear', fill: /** @type {const} */ ('forwards') };
  const runs = parts.filter(([el]) => typeof el.animate === 'function').map(([el, frame]) => el.animate(path.map(frame), timing));
  return handle(from, to, path, () => runs.length ? pathAt(runs[0], path) : to,
    () => { for (const a of runs) a.cancel(); }, Promise.all(runs.map(a => a.finished)).then(() => true, () => false));
}

/**
 * The same spring for a value that isn't an element's transform or opacity (a height, a scroll): apply(x) once a
 * frame (requestAnimationFrame). Prefer glide(): this one runs on the main thread.
 * @param {(x: number) => void} apply @param {number} from @param {number} to @param {number} [v] @param {{ response?: number }} [o]
 * @returns {Glide}
 */
export function spring(apply, from, to, v = 0, { response = SPRING_S } = {}) {
  const path = springPath(from, to, v, response);
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (/** @type {FrameRequestCallback} */ f) => setTimeout(() => f(Date.now()), 16);
  const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout;
  /** @type {number | undefined} */
  let t0;
  let x = from, id = 0;
  /** @type {(landed: boolean) => void} */
  let finish = () => {};
  const done = new Promise(r => { finish = r; });
  /** @param {number} now */
  const tick = now => {
    t0 ??= now;
    const i = Math.min(path.length - 1, Math.round((now - t0) * 60 / 1000));
    x = path[i];
    apply(x);
    if (i < path.length - 1) id = raf(tick); else finish(true);
  };
  id = raf(tick);
  return handle(from, to, path, () => x, () => { caf(id); finish(false); }, done);
}

/** @param {number} from @param {number} to @param {number[]} path @param {() => number} where @param {() => void} cancel
 * @param {Promise<boolean>} ran @returns {Glide} */
function handle(from, to, path, where, cancel, ran) {
  let on = true;
  gliding++;
  const off = () => { if (on) { on = false; gliding--; settled(); } };
  const done = ran.then(landed => { const first = on; off(); return landed && first; });
  return {
    from, to, path, done,
    at: () => on ? where() : to,
    running: () => on,
    stop() { const x = on ? where() : to; off(); cancel(); return x; },
  };
}

/**
 * A finger's let-go speed: add() each move (time, place along the axis), speed(now) at the let-go (over about its
 * last 100 ms, so a finger that stopped before it lifted throws nothing).
 * @returns {{ reset: (t: number, x: number) => void, add: (t: number, x: number) => void, speed: (now: number) => number }}
 */
export function tracker() {
  /** @type {[number, number][]} */
  let hist = [];
  return {
    reset(t, x) { hist = [[t, x]]; },
    add(t, x) { hist.push([t, x]); if (hist.length > 12) hist.shift(); },
    speed: now => releaseVelocity(hist, now),
  };
}

/**
 * A drag along one axis of `el`, glued to the finger (pointer events; a mouse too with mouse: true). touch-action is
 * set so the browser keeps only the other axis's scroll (pan-y for 'x', pan-x for 'y'). The drag starts once the
 * finger has clearly gone along the axis (8 px, swipeIntent); a move the other way is left to the page. start() may
 * give the place the drag starts from (a caught glide's); past bounds() the move stretches (rubber band). end() gets
 * the place and the let-go speed (px/ms, 0 when the browser cancelled the touch); a drag that moved swallows the
 * click that follows. name: the arbiter's (gesture.js claim), claimed as the drag starts; refused, it is the page's.
 * @param {HTMLElement} el
 * @param {{ axis?: 'x' | 'y', mouse?: boolean, name?: keyof typeof import('./gesture.js').PRIORITY, filter?: (e: PointerEvent) => boolean, start?: (e: PointerEvent) => number | void,
 *   move: (x: number, e: PointerEvent) => void, end: (x: number, v: number) => void, bounds?: () => [number, number] }} o
 * @returns {() => void} stop
 */
export function drag(el, { axis = 'x', mouse = false, name, filter, start, move, end, bounds }) {
  const l = listeners();
  const was = el.style.touchAction;
  el.style.touchAction = axis === 'x' ? 'pan-y' : 'pan-x';
  const at = (/** @type {PointerEvent} */ e) => axis === 'x' ? e.clientX : e.clientY;
  const v = tracker();
  /** @type {number | null} */
  let id = null;
  let x0 = 0, y0 = 0, base = 0, x = 0, live = false, moved = false;
  /** @param {number} d */
  const stretch = d => {
    if (!bounds) return d;
    const [lo, hi] = bounds(), span = Math.max(1, hi - lo) || (axis === 'x' ? innerWidth : innerHeight);
    return d < lo ? lo + rubber(d - lo, span) : d > hi ? hi + rubber(d - hi, span) : d;
  };
  l.on(el, 'pointerdown', (/** @type {PointerEvent} */ e) => {
    if (id !== null || !e.isPrimary || e.button > 0 || (e.pointerType === 'mouse' && !mouse) || (filter && !filter(e))) return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; live = false; moved = false;
    base = Number(start?.(e) ?? 0);
    v.reset(e.timeStamp, at(e));
    finger(1);
  }, { passive: true });
  l.on(el, 'pointermove', (/** @type {PointerEvent} */ e) => {
    if (e.pointerId !== id) return;
    if (!live) {
      const way = swipeIntent(e.clientX - x0, e.clientY - y0);
      if (!way) return;
      if (way !== axis || (name && !claim(name))) { id = null; finger(-1); end(base, 0); return; }   // the other way (or taken): the page's
      live = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* gone */ }
    }
    moved = true;
    v.add(e.timeStamp, at(e));
    x = stretch(base + at(e) - (axis === 'x' ? x0 : y0));
    move(x, e);
  }, { passive: true });
  const up = (/** @type {PointerEvent} */ e) => {
    if (e.pointerId !== id) return;
    id = null;
    finger(-1);
    end(live ? x : base, live && e.type === 'pointerup' ? v.speed(e.timeStamp) : 0);
  };
  l.on(el, 'pointerup', up, { passive: true });
  l.on(el, 'pointercancel', up, { passive: true });
  l.on(el, 'click', (/** @type {MouseEvent} */ e) => { if (moved) { moved = false; e.preventDefault(); e.stopPropagation(); } }, true);
  return () => { l.stop(); el.style.touchAction = was; if (id !== null) { id = null; finger(-1); } };
}

// --- holding work until the finger lifts

// fingers (and mouse buttons) down now, as the page's own listeners count them; null: not counting yet
/** @type {{ touches: number, buttons: number, own: number } | null} */
let down = null;
/** @type {Set<() => void>} */
const waiting = new Set();
/** @type {ReturnType<typeof setTimeout> | undefined} */
let overdue;

/** a kit drag's finger, counted until the page's listeners see it too @param {number} n */
function finger(n) { if (down) { down.own = Math.max(0, down.own + n); if (n < 0) settled(); } }

function count() {
  if (down || typeof document === 'undefined') return;
  const d = down = { touches: 0, buttons: 0, own: 0 };
  /** @param {TouchEvent} e */
  const touches = e => { d.touches = e.touches.length; settled(); };
  document.addEventListener('touchstart', touches, { capture: true, passive: true });
  document.addEventListener('touchend', touches, { capture: true, passive: true });
  document.addEventListener('touchcancel', touches, { capture: true, passive: true });
  // a mouse or pen (a finger's pointer events can stop mid-touch, when the page scrolls; its touch events don't)
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') d.buttons = e.buttons ? 1 : 0; }, { capture: true, passive: true });
  const lift = (/** @type {PointerEvent} */ e) => { if (e.pointerType !== 'touch') { d.buttons = 0; settled(); } };
  document.addEventListener('pointerup', lift, { capture: true, passive: true });
  document.addEventListener('pointercancel', lift, { capture: true, passive: true });
}

/** A finger is down, or a drag's glide is still moving: the time to hold heavy work. @returns {boolean} */
export function gesturing() {
  count();
  return gliding > 0 || !!down && (down.touches > 0 || down.buttons > 0 || down.own > 0);
}

/**
 * Runs fn once the fingers have lifted and the glides have landed (a frame after, so the landing paints first); at
 * once, a frame later, when nothing is moving. The same fn asked for twice runs once. A finger held down longer than
 * maxWait (ms) doesn't hold it for ever. Use it for saves, syncs and re-renders a gesture starts.
 * @param {() => void} fn @param {{ maxWait?: number }} [o]
 * @returns {() => void} cancel
 */
export function afterGesture(fn, { maxWait = 1500 } = {}) {
  count();
  waiting.add(fn);
  clearTimeout(overdue);
  overdue = setTimeout(flush, maxWait);
  settled();
  return () => { waiting.delete(fn); };
}

let flushing = false;
// nothing moving: the waiting work runs after the next frame paints
function settled() {
  if (flushing || !waiting.size || gesturing()) return;
  flushing = true;
  const later = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (/** @type {() => void} */ f) => setTimeout(f, 16);
  later(() => setTimeout(() => { flushing = false; if (!gesturing()) flush(); else settled(); }));
}
function flush() {
  clearTimeout(overdue);
  const fns = [...waiting];
  waiting.clear();
  for (const fn of fns) {
    try { fn(); } catch (e) { setTimeout(() => { throw e; }); }   // one failing job doesn't stop the rest
  }
}

// --- pressed at once

/** What shows pressed: buttons, tabs, menu items, rows that open something, and anything marked data-press. */
export const PRESSABLE = 'button, [role="button"], .ui-tab, .ui-menu-item, a.ui-row, .ui-row[tabindex], .ui-row[data-push], summary, [data-press]';

/** How long a press inside something that scrolls waits before it shows (Android's tap timeout): the touch may be a scroll. */
export const PRESS_DELAY = 100;
const RIPPLE_OUT = 150;

/**
 * Whether el sits in something that scrolls now (an overflowing auto or scroll box, or the page); a fixed or sticky
 * box (a bar, a sheet, the tab bar) does not scroll with it.
 * @param {Element} el
 */
export function inScroller(el) {
  for (let n = /** @type {Element | null} */ (el); n && n !== document.documentElement; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.position === 'fixed' || s.position === 'sticky') return false;
    if (/auto|scroll/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return true;
    if (/auto|scroll/.test(s.overflowX) && n.scrollWidth > n.clientWidth) return true;
  }
  const d = document.scrollingElement || document.documentElement;
  return d.scrollHeight > d.clientHeight;
}

/**
 * The Android look's ripple (android.css): a circle grows from where the finger landed to el's farthest corner.
 * @param {HTMLElement} el @param {number} x @param {number} y
 */
function ripple(el, x, y) {
  if (document.documentElement.dataset.family !== 'android') return;
  const r = el.getBoundingClientRect(), px = x - r.left, py = y - r.top;
  el.style.setProperty('--ui-ripple-x', `${Math.round(px)}px`);
  el.style.setProperty('--ui-ripple-y', `${Math.round(py)}px`);
  el.style.setProperty('--ui-ripple-max', `${Math.ceil(Math.hypot(Math.max(px, r.width - px), Math.max(py, r.height - py)))}px`);
  el.setAttribute('data-ripple', 'in');
}
/** The ripple fades out (RIPPLE_OUT), then goes. @param {Element} el */
function unripple(el) {
  if (!el.hasAttribute('data-ripple')) return;
  el.setAttribute('data-ripple', 'out');
  setTimeout(() => {
    if (el.getAttribute('data-ripple') !== 'out') return;   // pressed again meanwhile
    el.removeAttribute('data-ripple');
    for (const k of ['x', 'y', 'max']) /** @type {HTMLElement} */ (el).style.removeProperty(`--ui-ripple-${k}`);
  }, RIPPLE_OUT);
}

/**
 * Marks the control a finger (or pen) lands on pressed (data-pressed; theme.css styles it), without the browser's
 * wait to see whether the touch is a scroll: at once, or after PRESS_DELAY inside something that scrolls (a scroll
 * that starts by then never shows it; a tap lifted sooner shows it at the lift). A scroll, a move past SLOP or the
 * lift clears it, after one painted frame at least. In the Android look a ripple grows from the finger. A mouse
 * keeps the browser's own :active.
 * @param {ParentNode & EventTarget} [root]
 * @returns {() => void} stop
 */
export function pressFeedback(root = document) {
  const l = listeners();
  /** @type {HTMLElement | null} */
  let on = null;
  let x0 = 0, y0 = 0, shownAt = 0;   // shownAt: when the pressed mark went on (0: not yet)
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let wait;
  const show = (/** @type {HTMLElement} */ el) => {
    el.setAttribute('data-pressed', '');
    shownAt = performance.now();
    ripple(el, x0, y0);
  };
  const unpress = (/** @type {Element} */ el) => { el.removeAttribute('data-pressed'); unripple(el); };
  const clear = (/** @type {boolean} */ now) => {
    const el = on;
    on = null;
    if (!el) return;
    clearTimeout(wait);   // (not timer: an earlier press's unpress, which checks on itself)
    if (!shownAt) {
      if (now) return;   // a scroll or a part's gesture before the delay ran out: never shown
      show(el);          // a quick tap in a scroller still shows
    }
    const left = now ? 0 : 80 - (performance.now() - shownAt);   // a quick tap still shows
    shownAt = 0;
    if (left <= 0) unpress(el);
    else timer = setTimeout(() => { if (on !== el) unpress(el); }, left);
  };
  l.on(root, 'pointerdown', (/** @type {PointerEvent} */ e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    clear(true);
    const t = /** @type {HTMLElement | null} */ (e.target instanceof Element ? e.target.closest(PRESSABLE) : null);
    if (!t || t.matches(':disabled, [aria-disabled="true"]')) return;
    on = t; x0 = e.clientX; y0 = e.clientY; shownAt = 0;
    if (inScroller(t)) wait = setTimeout(() => { if (on === t) show(t); }, PRESS_DELAY);
    else show(t);
  }, { capture: true, passive: true });
  l.on(root, 'pointermove', (/** @type {PointerEvent} */ e) => {
    if (on && e.isPrimary && Math.hypot(e.clientX - x0, e.clientY - y0) > SLOP) clear(true);
  }, { capture: true, passive: true });
  l.on(root, 'pointerup', () => clear(false), { capture: true, passive: true });
  l.on(root, 'pointercancel', () => clear(true), { capture: true, passive: true });
  // a part took the touch (a swipe, a drag, a hold): not a press
  const standDown = onCaptured(() => { if (on) clear(true); });
  return () => { l.stop(); standDown(); clear(true); };
}
