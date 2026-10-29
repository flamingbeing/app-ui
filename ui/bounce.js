// Bounce: iOS's rubber band at the ends of a scroll, in every browser. The page turns the browser's own off
// (gestures/base.css: a pull at the top would reload the page) and Android never had one, so this draws it: a finger
// that pulls a list on past its top or bottom stretches it (rubber, the same stretch as the sheets and drags), and let
// go, it springs back carrying the finger's speed (glide, on the compositor); a fling that runs into an end bounces
// past it at its speed and back (a flourish: not with Less motion). A finger landing on a bounce catches it where it
// is. Touch only: a mouse wheel or trackpad keeps the page's plain scroll.
// Where: the page's scroll and any element that scrolls up and down (a sheet's body, a data grid), not where the
// finger can't scroll up and down (touch-action), not past a sheet body's top (that pull is the sheet's own drag,
// detent-sheet.js), not while a hold menu is open, and not inside [data-no-bounce]. What moves: the scroller's
// children (the page's: those of the touched .ui-screen, else the top one's, else main's, else body's), transform only; fixed and
// sticky ones (the bars, an action bar) stay where they are.
// Nothing runs on import: bounce() adds the listeners; startGestures() calls it ({ bounce: false } leaves it out).
import { glide, tracker } from './motion.js';
import { rubber, unrubber, swipeIntent, still, listeners, claim } from './gesture.js';

/** a fling's speed (px/ms) is capped here, so its bounce goes at most about 90 px past the end */
const MAX_V = 5;
/** a fling slower than this (px/ms) runs into the end without a bounce */
const MIN_V = 0.3;
/** a scroll this long (ms) after the finger lifts is its fling */
const FLING_MS = 2000;

/** The rubber band's slope at a stretch d (pure): how far the stretch moves per px of finger there. @param {number} d @param {number} w */
export const rubberSlope = (d, w) => 0.55 / (Math.abs(d) * 0.55 / w + 1) ** 2;

/** The element a touch at `t` scrolls up and down, or null for the page; false where nothing may bounce.
 * @param {Element} t @returns {HTMLElement | null | false} */
function scrollerOf(t) {
  for (let n = /** @type {Element | null} */ (t); n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    if (n instanceof HTMLElement && n.scrollHeight > n.clientHeight + 1) {
      const o = getComputedStyle(n).overflowY;
      if (o === 'auto' || o === 'scroll') return n;
    }
    if (n.tagName === 'DIALOG') return false;   // a dialog's own scroll only; the page behind it is out of reach
  }
  return null;
}

/** The finger may scroll up and down from `t` through to `box` (no touch-action on the way keeps it from it).
 * @param {Element} t @param {HTMLElement | null} box */
function pansY(t, box) {
  for (let n = /** @type {Element | null} */ (t); n && n !== box?.parentElement; n = n.parentElement) {
    const a = getComputedStyle(n).touchAction;
    if (a && a !== 'auto' && a !== 'manipulation' && !/pan-(y|up|down)/.test(a)) return false;
    if (!box && n === document.documentElement) break;
  }
  return true;
}

/** What moves for a scroller: its children (the page's: the touched screen's, else the top one's, main's, body's), leaving
 * fixed and sticky ones. @param {Element} t @param {HTMLElement | null} box @returns {HTMLElement[]} */
function partsOf(t, box) {
  const host = box ?? t.closest('.ui-screen') ?? document.querySelector('.ui-screen.is-top, .ui-screen:not([hidden])')
    ?? document.querySelector('main') ?? document.body;
  return /** @type {HTMLElement[]} */ ([...host.children]).filter(c => c instanceof HTMLElement && c.offsetParent !== null
    && !/^(fixed|sticky)$/.test(getComputedStyle(c).position));   // (offsetParent: not shown, or fixed)
}

/** @param {HTMLElement | null} box */
const posOf = box => box ? box.scrollTop : (document.scrollingElement ?? document.documentElement).scrollTop;
/** the furthest a scroller goes @param {HTMLElement | null} box */
const maxOf = box => box ? box.scrollHeight - box.clientHeight
  : (document.scrollingElement ?? document.documentElement).scrollHeight - innerHeight;
/** the rubber band's width: the scroller's height @param {HTMLElement | null} box */
const spanOf = box => Math.max(1, box ? box.clientHeight : innerHeight);

/**
 * Starts the bounce for touches on `root` (the page by default).
 * @param {ParentNode & EventTarget} [root]
 * @returns {() => void} stop
 */
export function bounce(root = document) {
  const l = listeners();
  /** the stretch moving now: its scroller, its parts, their own transforms, and its glide when let go
   * @type {{ box: HTMLElement | null, parts: HTMLElement[], was: string[], run: import('./motion.js').Glide | null } | null} */
  let cur = null;
  /** @param {number} y */
  const show = y => { if (cur) for (const p of cur.parts) p.style.transform = y ? `translateY(${y}px)` : ''; };
  // the stretch put away: the parts as they were
  const clear = () => {
    if (!cur) return;
    const c = cur;
    cur = null;
    c.parts.forEach((p, i) => { p.style.transform = c.was[i]; });
    c.run?.stop();
  };
  /** @param {HTMLElement | null} box @param {HTMLElement[]} parts */
  const take = (box, parts) => { clear(); cur = { box, parts, was: parts.map(p => p.style.transform), run: null }; };
  /** springs back from y at v px/ms (a fling's bounce: from 0, outward) @param {number} y @param {number} v */
  const letGo = (y, v) => {
    if (!cur) return;
    const c = cur;
    const run = c.run = glide(c.parts.map(p => [p, x => ({ transform: `translateY(${x}px)` })]), y, 0, v);
    show(0);   // the glide draws it from here; the parts' own styles are its resting place
    void run.done.then(landed => { if (landed && cur === c) clear(); });
  };

  // the finger: one touch at a time
  /** @type {number | null} */
  let id = null;
  /** @type {Element | null} */
  let target = null;
  /** @type {HTMLElement | null} */
  let box = null;
  let ok = false, way = /** @type {'x' | 'y' | null} */ (null), top = true, x0 = 0, y0 = 0, last = 0, raw = 0, span = 1;
  let fingers = 0, lifted = -Infinity;
  const v = tracker();
  /** @param {TouchList} list */
  const mine = list => [...list].find(t => t.identifier === id);

  l.on(root, 'touchstart', (/** @type {TouchEvent} */ e) => {
    fingers = e.touches.length;
    if (id !== null) return;
    const t = e.changedTouches[0];
    const el = t?.target instanceof Element ? t.target : null;
    if (!t || !el) return;
    const b = scrollerOf(el);
    target = el;
    ok = b !== false && !el.closest('[data-no-bounce]') && !document.documentElement.classList.contains('ui-menu-open')
      && pansY(el, b || null);
    if (!ok) return;
    id = t.identifier; box = b || null; way = null; raw = 0;
    x0 = t.clientX; y0 = last = t.clientY; span = spanOf(box);
    top = !box?.closest('dialog.ui-sheet');   // a sheet's top pull is the sheet's
    v.reset(e.timeStamp, t.clientY);
    // a finger on a bounce catches it where it is
    if (cur?.run?.running() && cur.box === box) {
      const y = cur.run.stop();
      cur.run = null;
      show(y);
      raw = unrubber(y, span);
      way = 'y';
    } else if (cur?.run?.running()) cur.run.stop();
  }, { passive: true });

  l.on(root, 'touchmove', (/** @type {TouchEvent} */ e) => {
    const t = id === null ? null : mine(e.changedTouches);
    if (!t) return;
    if (!way) {
      way = swipeIntent(t.clientX - x0, t.clientY - y0);
      if (way === 'x') { id = null; return; }   // sideways: the pager's or a drawer's
      if (!way) return;
    }
    const d = t.clientY - last;
    last = t.clientY;
    v.add(e.timeStamp, t.clientY);
    if (raw) {
      const r = raw + d;
      if (Math.sign(r) !== Math.sign(raw)) { raw = 0; clear(); return; }   // back past the end: the scroll's again
      raw = r;
    } else if (d > 0 && top && posOf(box) <= 0) raw = d;
    else if (d < 0 && posOf(box) >= maxOf(box) - 1) raw = d;
    else return;
    if (!claim('bounce')) { id = null; raw = 0; return; }   // another part has this touch
    if (!cur || cur.box !== box || cur.run) take(box, partsOf(/** @type {Element} */ (target), box));
    show(rubber(raw, span));
  }, { passive: true });

  const up = (/** @type {TouchEvent} */ e) => {
    fingers = e.touches.length;
    const t = id === null ? null : mine(e.changedTouches);
    if (!t) return;
    id = null;
    lifted = e.timeStamp;
    if (!raw || !cur || cur.run) return;
    const r = raw;
    raw = 0;
    letGo(rubber(r, span), e.type === 'touchend' ? v.speed(e.timeStamp) * rubberSlope(r, span) : 0);
  };
  l.on(root, 'touchend', up, { passive: true });
  l.on(root, 'touchcancel', up, { passive: true });

  // a fling that runs into an end: the scroll's speed as it got there, from the scroll events of the finger's fling
  // (not a wheel's, a key's or a script's jump: those come in one step or long after a lift)
  /** @type {[number, number][]} */
  let seen = [];
  /** @type {EventTarget | null} */
  let seenOn = null;
  l.on(document, 'wheel', () => { lifted = -Infinity; }, { passive: true, capture: true });
  l.on(document, 'scroll', (/** @type {Event} */ e) => {
    const b = e.target instanceof HTMLElement ? e.target : null;
    const now = e.timeStamp, pos = posOf(b);
    if (seenOn !== e.target) { seen = []; seenOn = e.target; }
    const prev = seen.at(-1);
    seen.push([now, pos]);
    if (seen.length > 6) seen.shift();
    if (fingers || id !== null || now - lifted > FLING_MS || !prev || cur || still()) return;
    const max = maxOf(b), atTop = pos <= 0, atEnd = pos >= max - 1;
    if (!atTop && !atEnd || prev[1] <= 0 && atTop || prev[1] >= max - 1 && atEnd) return;
    // a steady run of steps (three or more over the last 400 ms, all the same way, none after a pause; a busy phone
    // can send them 200 ms apart): a key's or a script's jump is one step
    const run = seen.filter(([t]) => now - t <= 400);
    if (run.length < 3 || run.some(([t, p], i) => i && (t - run[i - 1][0] > 250
      || Math.sign(p - run[i - 1][1]) !== Math.sign(pos - run[0][1])))) return;
    const speed = (pos - run[0][1]) / Math.max(1, now - run[0][0]);
    if (Math.abs(speed) < MIN_V || (speed < 0) !== atTop) return;
    const t = target && document.contains(target) ? target : null;
    if (b ? !b.contains(t) && !t?.contains(b) : t && scrollerOf(t) !== null) return;   // not the scroll the finger flung
    if (t?.closest('[data-no-bounce]') || atTop && b?.closest('dialog.ui-sheet')) return;
    take(b, partsOf(t ?? document.body, b));
    letGo(0, -Math.sign(speed) * Math.min(MAX_V, Math.abs(speed)));
  }, { passive: true, capture: true });

  return () => { l.stop(); clear(); id = null; };
}
