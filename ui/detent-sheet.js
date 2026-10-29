// Sheets with detents: dialog.ui-sheet[data-detents="medium large"] opens at its first height; drag the grabber or the
// head between heights, or down to close; tap the grabber (or Enter / Space on it) to expand or collapse. Below full
// height a finger on the body drags the sheet too (sideways scrollers and fields keep theirs); at full height the body
// scrolls, and pulled down from its top it drags the sheet down. Let go, it settles on the nearest height, judged by
// where it is and how fast it moved. On a phone the drag and the settle move it by transform only (no layout per
// frame): the sheet is made as tall as it can get for the move, slid down so the right part shows, and given its
// detent's height again once still. From 840 px wide it is a centred dialog: a drag changes its height.
// Each open sheet is a history entry, so Back (Android's, the browser's, the edge swipe) closes it. Done and any
// [data-close] close it; [data-open-sheet="#id"] buttons open it and get focus back.
import { SLOP, claim, haptic, listeners, still } from './gesture.js';
import { glide as springGlide, tracker } from './motion.js';
import { ourStep, stepBack as back, stepping, stepsSettled } from './steps.js';

const WIDE = '(min-width: 840px)';

// A close's step back is counted (steps.js): a sheet opened meanwhile pushes its entry once the steps have landed, and
// sheets ignore the popstates they make. An app's router waits on sheetsSettled() before it pushes a page.
/** Resolves once every sheet's (and the drawer's) step back has landed: push a page after it. @returns {Promise<void>} */
export const sheetsSettled = stepsSettled;
// how much taller than the screen the sheet is made for a move on a phone, hidden below the bottom edge: room for
// the pull past full height and the spring's overshoot
const SPARE = 48;

/**
 * Where a drag lands (pure): -> the detent to settle on, or 'close'.
 * @param {string[]} detents @param {string} now  the detent it started at
 * @param {number} dy  how far it moved (down is +) @param {number} v  px per ms at the end (down is +)
 */
export function settle(detents, now, dy, v) {
  const top = topDetent(detents), lower = detents.find(d => d !== top);
  const projected = dy + v * 200;   // where a flick would carry it
  if (projected < -80) return top;
  if (projected > 140) return now === top && lower ? lower : 'close';
  return now;
}

/** @param {string[]} ds */
export const topDetent = ds => ds.includes('large') ? 'large' : ds[ds.length - 1];

/** @param {HTMLDialogElement} sheet */
const detentsOf = sheet => (sheet.getAttribute('data-detents') || 'medium').split(/\s+/).filter(Boolean);

/**
 * @param {HTMLDialogElement} sheet  dialog.ui-sheet[data-detents]
 * @returns {{ open: (opener?: HTMLElement | null) => void, close: () => void, setDetent: (d: string) => void, stop: () => void }}
 */
export function detentSheet(sheet) {
  const l = listeners();
  const html = document.documentElement;
  const ds = detentsOf(sheet), top = topDetent(ds);
  const wide = typeof matchMedia === 'function' ? matchMedia(WIDE) : { matches: false };
  const grab = /** @type {HTMLElement | null} */ (sheet.querySelector('.ui-sheet-grabber'));
  const body = /** @type {HTMLElement | null} */ (sheet.querySelector('.ui-sheet-body'));
  /** @type {HTMLElement | null} */
  let opener = null;
  let pushed = false;
  const key = sheet.id || 'sheet';

  /** At full height the body pans freely, except that at its top a finger moving down is left to the sheet. */
  function setBodyPan() {
    if (!body) return;
    const atTop = sheet.getAttribute('data-detent') === top;
    // WebKit has no pan-down (it would ignore the value and keep the last one): there the sheet's touchmove alone takes
    // a pull down at the top
    const down = typeof CSS !== 'undefined' && CSS.supports?.('touch-action', 'pan-x pan-down') ? 'pan-x pan-down' : '';
    body.style.touchAction = !atTop ? 'pan-x' : body.scrollTop <= 0 ? down : '';
    // a sideways scroller is a scroll container of its own, so it needs the same rule or an up-down finger on it
    // would scroll the body below full height
    body.querySelectorAll('.ui-scroll-x').forEach(x => { /** @type {HTMLElement} */ (x).style.touchAction = atTop ? '' : 'pan-x'; });
  }
  /** @param {string} d */
  function setDetent(d) {
    sheet.setAttribute('data-detent', d);
    html.classList.toggle('ui-sheet-large-open', d === 'large' && sheet.open);
    grab?.setAttribute('aria-expanded', String(d === top));
    setBodyPan();
  }
  // its own entry, once the steps back on their way have landed
  function push() {
    const go = () => {
      if (pushed || !sheet.open || leaving) return;
      try { history.pushState({ ...(history.state || {}), uiSheet: key }, ''); pushed = true; } catch { /* no history here */ }
    };
    if (stepping()) void stepsSettled().then(go); else go();
  }
  /** @param {HTMLElement | null} [from] */
  function open(from = null) {
    if (leaving) {   // opened again while sliding away: it comes back
      stay();
      if (from) opener = from;
      if (!pushed) push();
      return;
    }
    if (sheet.open) return;
    opener = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    sheet.showModal();
    setDetent(ds[0]);
    rest = sheet.getBoundingClientRect().height;   // pre-sized now, so a drag's first frame needs no layout
    push();
  }
  // Close: on a phone the sheet slides down from wherever it is (mid-drag too) and the backdrop fades, then it closes;
  // a centred dialog fades. Still: at once.
  /** @type {import('./motion.js').Glide | null} */
  let leaving = null;
  /** @type {Animation | null} */
  let fading = null;
  // a close cut short (opened again, or closed for real): the sheet back as it was
  function stay() {
    leaving?.stop(); fading?.cancel(); leaving = null; fading = null;
    unstyle(); sheet.classList.remove('is-dragging');
  }
  // v: a finger's let-go speed (px/ms, down), which the slide starts at (a finger's let-go slides with Less motion too)
  const close = (v = 0, touch = false) => {
    if (!sheet.open || leaving) return;
    if ((still() && !touch) || typeof sheet.animate !== 'function') { sheet.close(); return; }
    const t = getComputedStyle(sheet).transform;
    const y = glider ? box0 - glider.stop() : t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
    glider = null;
    sheet.classList.add('is-dragging');   // (no CSS transition while the animation moves it)
    const out = sheet.getBoundingClientRect().height + 8;
    // a phone: a spring down from where it is; a centred dialog: a fade (0 to 100 is how far gone)
    const run = leaving = wide.matches
      ? springGlide([[sheet, x => ({ opacity: 1 - x / 100, transform: `scale(${1 - x * .0003})` })]], 0, 100, 0)
      : springGlide([[sheet, x => ({ transform: `translateY(${x}px)` })]], y, out, Math.max(0, v));
    const ms = (run.path.length - 1) * 1000 / 60;
    try { fading = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, pseudoElement: '::backdrop', fill: 'forwards' }); } catch { /* no ::backdrop animation */ }
    void run.done.then(landed => { if (landed && leaving === run && sheet.open) sheet.close(); });
    // its history entry goes now, not at the end: what the app does next (a push, say) is not undone by it
    if (pushed) { pushed = false; back(); }
  };
  // Esc: the same slide (the browser would close it at once)
  l.on(sheet, 'cancel', (/** @type {Event} */ e) => { if (!still() && e.cancelable) { e.preventDefault(); close(); } });
  /** the settle's glide (motion.js; its place is how much shows), and the box it moves in @type {import('./motion.js').Glide | null} */
  let glider = null;
  let box0 = 0;
  // the sheet's height at rest (0 = unknown: measure at drag start); keeps begin() free of a forced layout
  let rest = 0;
  // the sheet's own height and place again (inline styles off), without a transition
  function unstyle() {
    glider?.stop(); glider = null; rest = 0;
    const was = sheet.classList.contains('is-dragging');
    sheet.classList.add('is-dragging');
    sheet.style.transform = ''; sheet.style.height = ''; sheet.style.maxHeight = '';
    void sheet.offsetHeight;
    if (!was) sheet.classList.remove('is-dragging');
  }
  // how much of the sheet shows above the bottom edge (its box less how far it is slid down, mid-settle too)
  function shown() {
    const t = getComputedStyle(sheet).transform;
    return sheet.getBoundingClientRect().height - (t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0);
  }
  /** Make the sheet `box` px tall and slide it down so `h` px show (transform only). @param {number} box @param {number} h */
  function place(box, h) {
    sheet.style.maxHeight = 'none'; sheet.style.height = `${box}px`; sheet.style.transform = `translateY(${Math.max(0, box - h)}px)`;
  }
  /** Settle on detent d from `from` px showing, at v px/ms (up; a finger's let-go speed): on a phone a spring by
   * transform, then its own height. A finger's let-go (touch) springs with Less motion too.
   * @param {string} d @param {number} from @param {number} [v] @param {boolean} [touch] */
  function glide(d, from, v = 0, touch = false) {
    if (wide.matches || (still() && !touch)) { unstyle(); sheet.classList.remove('is-dragging'); setDetent(d); return; }
    glider?.stop();
    sheet.classList.add('is-dragging');   // (no CSS transition: the animation below moves it)
    sheet.style.transform = ''; sheet.style.height = ''; sheet.style.maxHeight = '';
    setDetent(d);
    const to = sheet.getBoundingClientRect().height, box = Math.max(from, to) + SPARE;
    place(box, to);
    box0 = box;
    const a = glider = springGlide([[sheet, x => ({ transform: `translateY(${box - x}px)` })]], from, to, v);
    void a.done.then(landed => { if (landed && glider === a) { unstyle(); sheet.classList.remove('is-dragging'); rest = sheet.getBoundingClientRect().height; } });
  }
  function cycle() { glide(ds[(ds.indexOf(sheet.getAttribute('data-detent') || ds[0]) + 1) % ds.length], shown()); }

  l.on(window, 'resize', () => { rest = 0; });   // rotation, the URL bar, the keyboard: measure again at the next drag

  document.querySelectorAll(`[data-open-sheet="#${CSS.escape(sheet.id)}"]`).forEach(b =>
    l.on(b, 'click', () => open(/** @type {HTMLElement} */ (b))));
  sheet.querySelectorAll('[data-close]').forEach(b => l.on(b, 'click', () => close()));
  l.on(sheet, 'click', (/** @type {MouseEvent} */ e) => { if (e.target === sheet) close(); });   // the backdrop
  l.on(sheet, 'close', () => {
    stay();
    setDetent(ds[0]);
    html.classList.remove('ui-sheet-large-open');
    if (pushed) { pushed = false; back(); }
    opener?.focus();
  });
  l.on(window, 'popstate', () => { if (!ourStep() && sheet.open && history.state?.uiSheet !== key) { pushed = false; close(); } });
  if (grab && ds.length > 1) {
    grab.setAttribute('role', 'button');
    grab.tabIndex = 0;
    if (!grab.getAttribute('aria-label')) grab.setAttribute('aria-label', 'Expand or collapse');
    grab.removeAttribute('aria-hidden');
    l.on(grab, 'keydown', (/** @type {KeyboardEvent} */ e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      cycle();
    });
  }

  // one drag at a time; a drag that moved swallows the click that follows it
  /** @type {number | null} */
  let y0 = null;
  // h0: how much showed at the start; box: the sheet's height for a phone drag; h: how much shows now
  let x0 = 0, h0 = 0, box = 0, h = 0, dy = 0, live = false, moved = false, from0 = ds[0];
  // aimed: where a let-go would land now (a haptic when it changes)
  let aimed = ds[0];
  const last = tracker();
  /** @type {number | string | null} */
  let id = null;
  /** @type {HTMLElement | null} */
  let from = null;
  const noGestureInSheet = (/** @type {Element} */ t) => !!t.closest('input,textarea,select,[contenteditable],[data-no-gesture],.ui-scroll-x');

  /** @param {PointerEvent} e @param {HTMLElement} el @param {boolean} fromBody */
  function down(e, el, fromBody) {
    const t = /** @type {Element} */ (e.target);
    if (leaving) return;   // on its way out
    if (sheet.dataset.wide === 'panel' && wide.matches) return;   // a side panel keeps its height
    if (fromBody) {   // a finger on the body, below full height
      if (e.pointerType === 'mouse' || sheet.getAttribute('data-detent') === top || noGestureInSheet(t)) return;
    } else if (t.closest('button:not(.ui-sheet-grabber),a,input,select,textarea')) return;
    y0 = e.clientY; x0 = e.clientX; dy = 0; last.reset(e.timeStamp, e.clientY); id = e.pointerId; from = el; moved = false;
    from0 = sheet.getAttribute('data-detent') || ds[0];
    live = false;
    if (!fromBody) begin();   // the body waits until the finger clearly moves up or down
  }
  function begin() {
    claim('sheet');   // the highest: always its own
    live = true;
    aimed = from0;
    try { if (from && typeof id === 'number') from.setPointerCapture(id); } catch { /* gone */ }
    // a finger on the settling sheet catches it where it is
    h0 = h = glider ? glider.stop() : rest > 0 && !wide.matches ? rest : shown();
    glider = null;
    sheet.classList.add('is-dragging');
    if (wide.matches) { sheet.style.transform = ''; sheet.style.height = ''; sheet.style.maxHeight = ''; h0 = h = shown(); }
    else { box = Math.max(innerHeight - 12, h0) + SPARE; place(box, h0); }
  }
  /** @param {{ pointerId: number | string, clientX: number, clientY: number, timeStamp: number }} e */
  function move(e) {
    if (y0 === null || e.pointerId !== id) return;
    if (leaving) { y0 = null; live = false; return; }   // closed mid-drag (Back, say): the slide out wins
    dy = e.clientY - y0;
    last.add(e.timeStamp, e.clientY);
    if (!live) {
      const dx = Math.abs(e.clientX - x0);
      if (dx > SLOP && dx > Math.abs(dy)) { y0 = null; return; }   // sideways: not ours
      if (Math.abs(dy) < 6) return;
      begin();
    }
    if (Math.abs(dy) > 4) moved = true;
    // a let-go here (held still) would now land somewhere else: past the close line, or on another height
    const aim = settle(ds, from0, dy, 0);
    if (aim !== aimed) { aimed = aim; haptic('threshold'); }
    const maxH = innerHeight - 12;
    if (wide.matches) {   // a centred dialog: change the height
      const want = h0 - dy * 2;
      h = want > maxH ? maxH + (want - maxH) * 0.15 : Math.max(120, want);
      sheet.style.height = `${h}px`; sheet.style.maxHeight = 'none';
    } else {   // a phone: slide the tall sheet, up to a little past full height
      const want = h0 - dy;
      h = want > maxH ? maxH + Math.min(SPARE / 2, (want - maxH) * 0.15) : Math.max(0, want);
      place(box, h);
    }
  }
  /** @param {{ pointerId: number | string, timeStamp: number, type?: string }} e */
  function up(e) {
    if (y0 === null || e.pointerId !== id) return;
    const wasLive = live;
    y0 = null; live = false;
    if (leaving) return;
    if (!wasLive || !moved) { unstyle(); sheet.classList.remove('is-dragging'); return; }
    const v = e.type === 'pointercancel' || e.type === 'touchcancel' ? 0 : last.speed(e.timeStamp);
    const to = settle(ds, from0, dy, v);
    if (to === 'close') close(v, true);   // (slides on from where the finger left it, at its speed)
    else if (wide.matches) { sheet.classList.remove('is-dragging'); sheet.style.height = ''; sheet.style.maxHeight = ''; setDetent(to); }
    else glide(to, h, -v, true);
  }
  const handles = /** @type {HTMLElement[]} */ ([...sheet.querySelectorAll('.ui-sheet-grabber,.ui-sheet-head')]);
  for (const h of handles) {
    h.style.touchAction = 'none';
    l.on(h, 'pointerdown', (/** @type {PointerEvent} */ e) => down(e, h, false));
    l.on(h, 'pointermove', move);
    l.on(h, 'pointerup', up);
    l.on(h, 'pointercancel', up);
  }
  if (body) {
    l.on(body, 'pointerdown', (/** @type {PointerEvent} */ e) => down(e, body, true));
    l.on(body, 'pointermove', move);
    l.on(body, 'pointerup', up);
    l.on(body, 'pointercancel', up);
    l.on(body, 'scroll', setBodyPan, { passive: true });
    // At full height, scrolled to the top, pulling down drags the sheet. Touch events: only a cancelled touchmove
    // stops the browser taking the pan. Nothing is decided inside the first 6 px (a real finger wobbles).
    /** @type {number | null} */
    let ty = null;
    let tx = 0;
    l.on(sheet, 'touchstart', (/** @type {TouchEvent} */ e) => {
      ty = null;
      if (wide.matches || e.touches.length !== 1 || sheet.getAttribute('data-detent') !== top) return;
      const t = /** @type {Element} */ (e.target);
      if (t.closest('.ui-sheet-grabber,.ui-sheet-head') || noGestureInSheet(t)) return;
      ty = e.touches[0].clientY; tx = e.touches[0].clientX;
    }, { passive: true });
    l.on(sheet, 'touchmove', (/** @type {TouchEvent} */ e) => {
      if (ty === null) return;
      const t = e.touches[0], ddy = t.clientY - ty, ddx = Math.abs(t.clientX - tx);
      if (id !== 'touch') {
        if (body.scrollTop > 0 || ddy <= -6 || (ddx > 6 && ddx > ddy)) { ty = null; return; }   // scrolling or sideways
        if (ddy > 0 && e.cancelable) e.preventDefault();   // hold the pan until it is clearly a pull down
        if (ddy < 6) return;
        y0 = t.clientY; x0 = tx; dy = 0; last.reset(e.timeStamp, t.clientY); id = 'touch'; from = body; moved = false;
        from0 = top;
        begin();
      }
      if (e.cancelable) e.preventDefault();
      move({ pointerId: 'touch', clientX: t.clientX, clientY: t.clientY, timeStamp: e.timeStamp });
    }, { passive: false });
    const touchEnd = (/** @type {TouchEvent} */ e) => {
      ty = null;
      if (id !== 'touch') return;
      up({ pointerId: 'touch', timeStamp: e.timeStamp, type: e.type });
      id = null; moved = false;   // a cancelled touchmove means no click to swallow
    };
    l.on(sheet, 'touchend', touchEnd);
    l.on(sheet, 'touchcancel', touchEnd);
  }
  // a new press clears the flag, so a drag with no click after it never eats the next tap
  l.on(sheet, 'pointerdown', () => { moved = false; }, true);
  l.on(sheet, 'click', (/** @type {MouseEvent} */ e) => {
    if (moved) { moved = false; e.preventDefault(); e.stopPropagation(); return; }
    if (grab && ds.length > 1 && e.target === grab) cycle();
  }, true);
  l.on(window, 'resize', () => { if (sheet.open) setDetent(sheet.getAttribute('data-detent') || ds[0]); });
  setDetent(ds[0]);
  return { open, close: () => close(), setDetent, stop() { l.stop(); stay(); if (sheet.open) sheet.close(); } };
}
