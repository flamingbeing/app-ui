// The vault shell's side drawer: a full-height panel that slides in from its side (left or right) while the page's
// content (and the navigation pill) slide the other way by its width, a shade over the strip of page still showing.
// Its outer corner is square. Opened by a button (open, toggle) or by a sideways swipe that starts on the content
// (swipeFrom; never within EDGE px of the screen's edge, which is the phone's own Back), following the finger; closed by
// a tap on the shade, a swipe back, Back (given `steps`, the page's createTransients) or Esc.
// While a finger pulls it, it is shown but not modal; once open it is modal (the page under it out of reach) with a
// history step of its own, so Back closes it without the page's "Press Back again to close".
// Moves only by transform and opacity: the finger's place as it moves, the kit's spring (glide) as it lets go, the
// kit's arbiter (claim 'drawer') so a swipe that is the drawer's is no one else's. Less motion: it fades, nothing slides.
// Styles: ui/vault/vault.css. Nothing runs on import.
import { glide, tracker } from '../motion.js';
import { claim, still } from '../gesture.js';

/** px from the screen's edge: the phone's own Back gesture, never a drawer's swipe */
export const DRAWER_EDGE = 24;
const SLOP = 12;          // px a finger goes sideways before the drawer takes it
const RATIO = 1.5;        // sideways at least this much more than up or down
const FLING = 0.3;        // px/ms: a let-go this fast opens (or closes) whatever the distance
const OPEN_AT = 0.4;      // past this much of its width, a let-go opens it
const TAP_RESPONSE = 0.16;   // s: the spring of a tap's open or close (lands in about 200 ms, slowing down)

/**
 * @typedef {{ open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } }} Steps
 * @typedef {{ el: HTMLDialogElement, open: () => Promise<void>, close: () => Promise<void>, leave: () => Promise<void>,
 *   toggle: () => Promise<void>, isOpen: () => boolean,
 *   swipeFrom: (el: HTMLElement, o?: { can?: () => boolean, edge?: () => number }) => () => void, destroy: () => void }} SideDrawer
 *   open/close: resolve once it has landed; leave: closed without waiting for the slide (resolves once its Back step is
 *   gone, so a page opened next is a step of its own); swipeFrom: a swipe on this element opens it (returns a stop)
 */

/**
 * @param {{ id: string, label: string, side?: 'left' | 'right', steps?: Steps, pushed?: () => (HTMLElement | null | undefined)[],
 *   onChange?: (open: boolean) => void, onOpen?: () => void }} o
 *   id: the dialog's; label: its accessible name; steps: the page's createTransients() (without it, Back leaves it be);
 *   pushed: what slides aside with it (the content, the pill), read at each move; onChange: opening or closing (a
 *   button's look); onOpen: it is about to show (fill it)
 * @returns {SideDrawer}
 */
export function sideDrawer({ id, label, side = 'left', steps, pushed = () => [], onChange, onOpen }) {
  const d = document.createElement('dialog');
  d.id = id;
  d.className = `ui-vault-drawer is-${side}`;
  d.setAttribute('aria-label', label);
  d.tabIndex = -1;
  const shade = Object.assign(document.createElement('div'), { className: 'ui-vault-drawer-shade' });
  shade.setAttribute('aria-hidden', 'true');
  document.body.append(shade, d);
  const html = document.documentElement;
  const sign = side === 'left' ? 1 : -1;
  const width = () => d.getBoundingClientRect().width || Math.min(417, innerWidth * 0.84);

  /** @type {ReturnType<typeof glide> | null} */
  let run = null;
  let x = 0;          // how far open, 0 (shut) to its width
  let shown = false;  // open, or opening (the button's look)
  /** the styles for a place @param {number} at @param {number} w */
  const frames = (at, w) => {
    const calm = still();
    const k = Math.max(0, Math.min(1, at / w));
    return {
      drawer: calm ? { transform: 'none', opacity: String(k) } : { transform: `translateX(${sign * (at - w)}px)`, opacity: '1' },
      push: calm ? { transform: 'none' } : { transform: `translateX(${sign * at}px)` },
      shade: { opacity: String(k) },
    };
  };
  const moved = () => pushed().filter(/** @returns {e is HTMLElement} */ e => !!e);
  /** at a place now (a finger's, or the end of a glide) @param {number} at */
  const put = at => {
    x = at;
    const f = frames(at, width());
    Object.assign(d.style, f.drawer);
    // (open, it has no transform: a fixed child, a toast say, sits on the screen, not in the drawer's box)
    if (at >= width() - 0.5) d.style.transform = 'none';
    for (const e of moved()) e.style.transform = at > 0 && f.push.transform !== 'none' ? f.push.transform : '';
    shade.style.opacity = f.shade.opacity;
  };
  /** glide to `to` from where it is, at the finger's speed @param {number} to @param {number} [v] @param {boolean} [tap] */
  const move = async (to, v = 0, tap = false) => {
    const from = run ? run.stop() : x;
    run = null;
    const w = width();
    if (Math.abs(from - to) < 1) { put(to); return; }
    const g = glide([
      [d, at => frames(at, w).drawer],
      ...moved().map(e => /** @type {[Element, (at: number) => Keyframe]} */ ([e, at => frames(at, w).push])),
      [shade, at => frames(at, w).shade],
    ], from, to, sign * v, tap ? { response: TAP_RESPONSE } : undefined);
    run = g;
    await g.done;
    if (run === g) { run = null; put(to); g.stop(); }
  };

  /** @type {{ readonly active: boolean, close: () => Promise<void> } | null} */
  let step = null;
  /** @param {boolean} on */
  const look = on => { if (shown !== on) { shown = on; onChange?.(on); } };
  /** shown, not yet modal (a finger is pulling it): over the page, its own layer */
  const reveal = () => {
    if (d.open) return;
    onOpen?.();
    shade.classList.add('is-on');
    html.classList.add('ui-vault-drawer-on');
    d.show();
    put(0);
  };
  /** fully open: modal (the page under it out of reach), a Back step */
  const settle = () => {
    if (!d.matches(':modal')) { d.close(); d.showModal(); }
    d.focus({ preventScroll: true });
    if (steps) step ||= steps.open(() => { step = null; void hide(); });
  };
  /** @type {Promise<void> | null} */
  let shutting = null;
  /** slide away and close (its Back step already gone) @param {number} [v] @param {boolean} [tap] */
  const hide = (v = 0, tap = !v) => (shutting ||= (async () => {
    look(false);
    await move(0, v, tap);
    if (!shown) {
      d.close();
      shade.classList.remove('is-on');
      html.classList.remove('ui-vault-drawer-on');
      for (const e of moved()) e.style.transform = '';
    }
    shutting = null;
  })());

  /** @param {number} [v] */
  const open = async (v = 0) => {
    look(true);
    // (the keyboard goes down: nothing typed under the drawer)
    const a = /** @type {HTMLElement | null} */ (document.activeElement);
    if (a && a !== document.body && !d.contains(a)) a.blur();
    reveal();
    const tap = !v && !run && x === 0;
    settle();
    await move(width(), v, tap);
  };
  /** closed, its Back step taken back too -> once it has gone @param {number} [v] */
  const close = async (v = 0) => {
    const s = step;
    step = null;
    await Promise.all([s?.close(), hide(v)]);
  };
  const leave = async () => {
    if (!shown && !step) return;
    const s = step;
    step = null;
    void hide();
    await s?.close();
  };
  const isOpen = () => d.open && shown;
  d.addEventListener('cancel', e => { e.preventDefault(); void close(); });
  // a tap on the shade (outside the drawer's box)
  d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (side === 'left' ? e.clientX > r.right : e.clientX < r.left) void close();
  });

  // ---- the finger: a swipe on the content opens it, a swipe on it (or the shade) shuts it
  const speed = tracker();
  /** @type {{ x: number, y: number, on: boolean, from: number, opening: boolean } | null} */
  let t = null;
  /** @param {TouchEvent} e @param {boolean} opening @param {() => boolean} [can] */
  const down = (e, opening, can = () => true) => {
    t = null;
    if (e.touches.length !== 1 || !can()) return;
    const p = e.touches[0];
    t = { x: p.clientX, y: p.clientY, on: false, from: opening ? 0 : width(), opening };
    speed.reset(e.timeStamp, p.clientX);
  };
  /** @param {TouchEvent} e */
  const follow = e => {
    if (!t) return;
    const p = e.touches[0];
    const dx = (p.clientX - t.x) * sign, dy = p.clientY - t.y;
    if (!t.on) {
      if (Math.abs(dx) <= SLOP && Math.abs(dy) <= SLOP) return;
      const way = t.opening ? dx > 0 : dx < 0;
      if (!way || Math.abs(dx) <= RATIO * Math.abs(dy) || !claim('drawer')) { t = null; return; }
      t.on = true;
      t.x = p.clientX;   // (from here, so it doesn't jump by the slop)
      t.from = run ? run.stop() : x;
      run = null;
      if (t.opening) {
        look(true);
        const a = /** @type {HTMLElement | null} */ (document.activeElement);
        if (a && a !== document.body) a.blur();
        reveal();
      }
    }
    if (e.cancelable) e.preventDefault();
    speed.add(e.timeStamp, p.clientX);
    put(Math.max(0, Math.min(width(), t.from + (p.clientX - t.x) * sign)));
  };
  /** @param {TouchEvent} e */
  const up = e => {
    const was = t;
    t = null;
    if (!was?.on) return;
    const v = e.type === 'touchend' ? speed.speed(e.timeStamp) * sign : 0;
    const opens = v > FLING || (v > -FLING && x > width() * OPEN_AT);
    if (opens) { void open(v); return; }
    if (step) void close(v); else void hide(v);
  };
  /** @type {(() => void)[]} */
  const stops = [];
  /** @param {HTMLElement} el @param {(e: TouchEvent) => void} start */
  const listen = (el, start) => {
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', follow, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);
    const stop = () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', follow);
      el.removeEventListener('touchend', up);
      el.removeEventListener('touchcancel', up);
    };
    stops.push(stop);
    return stop;
  };
  listen(d, e => down(e, false, () => isOpen()));

  /**
   * A swipe on this element opens the drawer (not from the screen's edge, not in a sideways scroller, not with text
   * selected). can: whether it may now; edge: how far in from the edge the swipe must start (more when the edge swipe
   * is another's).
   * @param {HTMLElement} el @param {{ can?: () => boolean, edge?: () => number }} [o]
   */
  const swipeFrom = (el, { can = () => true, edge = () => DRAWER_EDGE } = {}) => {
    /** @param {EventTarget | null} target */
    const scroller = target => {
      for (let n = target instanceof Element ? target : null; n && n !== el; n = n.parentElement)
        if (n.scrollWidth > n.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true;
      return false;
    };
    const selected = () => !(getSelection()?.isCollapsed ?? true);
    return listen(el, e => {
      const p = e.touches[0];
      const from = side === 'left' ? p?.clientX : innerWidth - (p?.clientX ?? 0);
      down(e, true, () => !d.open && can() && from >= edge() && !scroller(e.target) && !selected());
    });
  };

  const destroy = () => {
    run?.stop();
    stops.splice(0).forEach(s => s());
    if (d.open) d.close();
    for (const e of moved()) e.style.transform = '';
    html.classList.remove('ui-vault-drawer-on');
    d.remove();
    shade.remove();
  };
  return { el: d, open: () => open(), close: () => close(), leave, toggle: () => (isOpen() ? close() : open()), isOpen, swipeFrom, destroy };
}
