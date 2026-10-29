// Row swipe actions, as iOS's Mail: slide a row sideways and its actions show behind it, each widening with the
// finger; let go past half of them and the row stays open on them, a flick counts its speed; slide on past FULL_AT
// of the row's width and the first action (the outermost, say Delete) takes the whole width with a haptic tap, and
// letting go there runs it. A tap on an action runs it; a tap on the open row, anywhere else, a scroll or Escape
// closes it. The row moves with the finger by transform only, from motion.js's drag, and settles on its spring
// (glide), so a busy page never stutters it. The list is marked data-swipe-own, so the tab pages' swipe leaves it to
// the row; a finger starting in the screen-edge strip is left to the edge swipe (Back). Swipe actions are a shortcut:
// give each action another way in too (the hold menu, or the row's own screen), for keyboards and screen readers.
// Nothing runs on import.
import { listeners, haptic, noGesture, THROW_MS, rubber } from './gesture.js';
import { drag, glide } from './motion.js';
import { EDGE } from './screens.js';

/**
 * One action: its id (passed to onAction), its words, its colour (tone: the danger red, warn orange, grey, ok green,
 * purple; else the accent), full: the action a full swipe runs (only the first of a side can be).
 * @typedef {{ id: string, label: string, tone?: 'danger' | 'warn' | 'grey' | 'ok' | 'purple' | 'accent', full?: boolean }} SwipeAction
 */
/**
 * @typedef {{ lead?: (row: HTMLElement) => SwipeAction[], trail?: (row: HTMLElement) => SwipeAction[],
 *   onAction: (id: string, row: HTMLElement) => void }} SwipeOptions
 * lead: the actions under the row's start (shown by a swipe towards the end: right in a left-to-right page), trail:
 * those under its end (a swipe towards the start), each listed from the outer edge in; [] or none: that way doesn't
 * open. onAction runs once the row has settled.
 */

/** how far a full swipe goes before it arms, as a share of the row's width */
export const FULL_AT = 0.6;
/** each action button's width, px (iOS's 74) */
export const ACTION_W = 74;

/**
 * Where a let-go row settles (pure): 'full' (run the first action), 'open' (stay on the actions) or 'closed'.
 * @param {number} x  how far the row is out, px (either way) @param {number} v  the let-go speed the same way, px/ms
 * @param {number} width  the row's @param {number} tray  the actions' width @param {boolean} full  a full action
 * @returns {'full' | 'open' | 'closed'}
 */
export function swipeSettle(x, v, width, tray, full) {
  if (!tray || !x) return 'closed';
  const out = Math.abs(x), ahead = out + Math.sign(x) * v * THROW_MS;
  if (full && out >= width * FULL_AT) return 'full';
  return ahead >= tray / 2 ? 'open' : 'closed';
}

/**
 * Where the row shows for a finger at d px out (pure): 1:1 up to the actions' width, then with a full action on
 * freely up to the row's width (past it, a stretch), without one a rubber band past the actions.
 * @param {number} d @param {number} width @param {number} tray @param {boolean} full @returns {number}
 */
export function swipeShown(d, width, tray, full) {
  const s = Math.sign(d), a = Math.abs(d);
  if (!tray) return s * rubber(a, width) * .15;
  const stop = full ? width : tray;
  return s * (a <= stop ? a : stop + rubber(a - stop, width));
}

/**
 * Swipe actions on the rows (.ui-row) of a list.
 * @param {HTMLElement} list  the list (ul.ui-list or any parent of the rows) @param {SwipeOptions} o
 * @returns {{ close: () => void, stop: () => void }}
 */
export function swipeActions(list, { lead, trail, onAction }) {
  const l = listeners();
  list.setAttribute('data-swipe-own', '');
  const rtl = () => getComputedStyle(list).direction === 'rtl';
  /** @type {HTMLElement | null} */
  let row = null;
  /** @type {HTMLElement | null} */
  let tray = null;
  /** @type {HTMLElement[]} */
  let buttons = [];
  /** @type {SwipeAction[]} */
  let acts = [];
  /** @type {ReturnType<typeof glide> | null} */
  let moving = null;
  let side = 0, x = 0, width = 0, trayW = 0, armed = false, hasFull = false;

  /** @param {EventTarget | null} t @returns {HTMLElement | null} */
  const rowOf = t => {
    const r = t instanceof Element ? /** @type {HTMLElement | null} */ (t.closest('.ui-row')) : null;
    return r && list.contains(r) && !r.closest('.ui-swipe-tray') ? r : null;
  };
  // which actions a way shows: s = +1 the row moves right, -1 left
  /** @param {number} s */
  const actsFor = s => ((s > 0) !== rtl() ? lead : trail)?.(/** @type {HTMLElement} */ (row)) ?? [];

  /** builds the tray for way s (the row moving that way), under the row's other end */
  /** @param {number} s */
  function build(s) {
    tray?.remove();
    side = s;
    acts = actsFor(s);
    hasFull = !!acts[0]?.full;
    armed = false;
    tray = null; buttons = []; trayW = 0;
    if (!acts.length || !row) return;
    tray = document.createElement('div');
    tray.className = 'ui-swipe-tray';
    tray.dataset.side = s > 0 ? 'left' : 'right';
    // inner first, so the outer ones paint over them; each button's colour runs on outwards (CSS) to fill the gaps
    buttons = acts.map(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-swipe-action';
      b.textContent = a.label;
      b.dataset.action = a.id;
      if (a.tone) b.dataset.tone = a.tone;
      return b;
    });
    tray.append(...[...buttons].reverse());
    row.append(tray);
    trayW = acts.length * ACTION_W;
  }

  // how far out from the row's edge each button sits at rest (the outermost furthest)
  /** @param {number} k */
  const restOf = k => (acts.length - 1 - k) * ACTION_W;
  /** the keyframe of every moving part, for the row at x @returns {[Element, (x: number) => Keyframe][]} */
  function parts() {
    /** @type {[Element, (x: number) => Keyframe][]} */
    const p = [[/** @type {HTMLElement} */ (row), v => ({ transform: `translateX(${v}px)` })]];
    buttons.forEach((b, k) => p.push([b, v => ({ transform: `translateX(${buttonAt(k, v)}px)` })]));
    return p;
  }
  /** a button's place in the tray (away from the row, signed on screen) for the row at px @param {number} k @param {number} px */
  function buttonAt(k, px) {
    const f = trayW ? Math.abs(px) / trayW : 0, out = -Math.sign(side);
    const at = armed && k === 0 ? 0 : restOf(k) * f;
    return out * at;
  }
  /** @param {number} px */
  function show(px) {
    x = px;
    if (row) row.style.transform = px ? `translateX(${px}px)` : '';
    buttons.forEach((b, k) => { b.style.transform = `translateX(${buttonAt(k, px)}px)`; });
  }
  /** settles on px at speed v, then runs then() @param {number} px @param {number} v @param {() => void} [then] */
  function settle(px, v, then) {
    moving?.stop();
    const from = x, r = row;
    if (from === px) { show(px); finish(px, r); then?.(); return; }
    const g = glide(parts(), from, px, v);
    moving = g;
    x = px;
    g.done.then(landed => {
      if (moving !== g) return;
      moving = null;
      if (!landed) return;
      show(px);
      finish(px, r);
      for (const el of [r, ...buttons]) el?.getAnimations().forEach(a => a.cancel());
      then?.();
    });
  }
  /** a row back at rest gives up its tray @param {number} px @param {HTMLElement | null} r */
  function finish(px, r) {
    if (px || r !== row) return;
    tray?.remove();
    tray = null; buttons = []; acts = []; side = 0;
    row?.classList.remove('is-swiped');
    row = null;
  }
  function close() { if (row && x) settle(0, 0); else finish(0, row); }

  /** runs the action a once the row has closed @param {SwipeAction} a */
  function run(a) {
    const r = /** @type {HTMLElement} */ (row);
    settle(0, 0, () => onAction(a.id, r));
  }

  const stopDrag = drag(list, {
    filter: e => {
      const r = rowOf(e.target);
      if (!r || list.closest('.is-editing') || list.classList.contains('is-editing')) return false;
      if ((/** @type {Element} */ (e.target)).closest('.ui-swipe-tray')) return false;
      if (row && r !== row) return false;   // another row is open (or closing): this touch only closes it
      if (e.clientX <= EDGE && document.documentElement.dataset.edgeBack !== 'off') return false;   // the edge swipe's
      return !noGesture(e.target);
    },
    start: e => {
      if (moving) { x = moving.stop(); moving = null; show(x); }   // caught mid-glide: on from there
      if (!row) { row = rowOf(e.target); x = 0; side = 0; }
      width = /** @type {HTMLElement} */ (row).offsetWidth;
      return x;
    },
    move: d => {
      if (!row) return;
      eat = false;
      const s = Math.sign(d) || side;
      if (s && s !== side) build(s);
      row.classList.add('is-swiped');
      const px = swipeShown(d, width, trayW, hasFull);
      const arm = hasFull && Math.abs(px) >= width * FULL_AT;
      if (arm !== armed) {
        armed = arm;
        haptic('threshold');
        const b = buttons[0];
        if (b) { b.classList.toggle('is-full', arm); }
      }
      show(px);
    },
    end: (d, v) => {
      if (!row) return;
      const to = swipeSettle(x, v, width, trayW, hasFull);
      if (to === 'full') {
        const a = acts[0], r = row, out = Math.sign(x) * width;
        armed = true;
        settle(out, v, () => { onAction(a.id, r); if (r.isConnected) { armed = false; x = out; settle(0, 0); } else finish(0, r); });
        return;
      }
      if (armed) { armed = false; buttons[0]?.classList.remove('is-full'); }
      settle(to === 'open' ? Math.sign(x) * trayW : 0, v);
    },
  });

  // a tap on the open row only closes it: set at its pointerdown, cleared once the finger drags it
  let eat = false;
  // a tap on an action runs it
  l.on(list, 'click', (/** @type {MouseEvent} */ e) => {
    const b = /** @type {Element} */ (e.target).closest?.('.ui-swipe-action');
    if (!b || !tray?.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    const a = acts.find(t => t.id === /** @type {HTMLElement} */ (b).dataset.action);
    if (a) run(a);
  }, true);
  // a touch anywhere but the actions closes an open row; on the row itself it only closes (its click is eaten)
  l.on(document, 'pointerdown', (/** @type {PointerEvent} */ e) => {
    if (!row || !x || moving) return;
    const t = /** @type {Element} */ (e.target);
    if (tray?.contains(t)) return;
    eat = row.contains(t);
    if (!eat) close();
  }, true);
  l.on(document, 'click', (/** @type {MouseEvent} */ e) => {
    if (!eat) return;
    eat = false;
    e.preventDefault(); e.stopPropagation();
    close();
  }, true);
  l.on(document, 'scroll', () => { if (row && x && !moving) close(); }, { capture: true, passive: true });
  l.on(document, 'keydown', (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Escape' && row && x) close(); });

  return {
    close,
    stop() { stopDrag(); l.stop(); moving?.stop(); show(0); finish(0, row); list.removeAttribute('data-swipe-own'); },
  };
}
