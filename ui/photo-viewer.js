// Photo viewer (from an app): photos one at a time, full screen on black. Pinch or double-tap to zoom (to where the
// fingers or the tap are), drag a zoomed photo to pan it, swipe sideways for the next one, swipe down (or the X, Esc,
// Back given `steps`) to close. A thumb already on the page shows at once and the full photo takes its place when it
// has loaded. Movement is transform and opacity only: the fingers move it 1:1, and a let-go hands their speed to the
// kit's spring (motion.js glide); the touch is the viewer's (gesture.js claim, "viewer", over every other part).
// Less motion: a double-tap zooms and the X closes at once; a finger's own move and the glide that ends it stay.
// Loaded on first use (index.js loadPhotoViewer, an import()); styles in ui/ui.css ("photo viewer"). Nothing runs on import.
import { claim, listeners, rubber, still } from './gesture.js';
import { glide, tracker } from './motion.js';
import { icon, x as xIcon } from '../icons/lucide.js';

/** The most a photo zooms (times its fitted size), and how far a double-tap zooms in. */
export const VIEWER_MAX_ZOOM = 6;
export const VIEWER_TAP_ZOOM = 2.5;
/** Two taps this close in time (ms) and place (px) are a double-tap. */
export const DOUBLE_TAP_MS = 320;
/** A swipe down past this (px), or let go faster than CLOSE_SPEED (px/ms), closes the viewer. */
export const CLOSE_DROP = 110;
export const CLOSE_SPEED = 0.6;

/**
 * @typedef {{ src: string, thumb?: string, cap?: string, alt?: string }} ViewerPhoto
 *   src: the full photo; thumb: one already loaded (shown until src arrives); cap: the caption; alt: its text alternative
 * @typedef {{ open: (photos: ViewerPhoto[], at?: number) => void, close: () => void, index: () => number,
 *   go: (n: number) => void, stop: () => void }} PhotoViewer
 */

const clamp = (/** @type {number} */ v, /** @type {number} */ a, /** @type {number} */ b) => Math.min(b, Math.max(a, v));

/** How far a photo of w x h px, zoomed s times, may pan each way in a box of W x H px (pure): [x, y].
 * @param {number} w @param {number} h @param {number} s @param {number} W @param {number} H @returns {[number, number]} */
export const panLimits = (w, h, s, W, H) => [Math.max(0, (w * s - W) / 2), Math.max(0, (h * s - H) / 2)];

/**
 * A pinch's zoom and pan (pure): the point under the fingers stays under them, and follows them as they move.
 * m0, m: the fingers' midpoint (px from the box's centre) and spread at the start and now; s0, x0, y0: the zoom and pan
 * at the start. @param {{ x: number, y: number, d: number }} m0 @param {{ x: number, y: number, d: number }} m
 * @param {number} s0 @param {number} x0 @param {number} y0 @returns {{ s: number, x: number, y: number }}
 */
export function pinchTo(m0, m, s0, x0, y0) {
  const s = clamp(s0 * m.d / (m0.d || 1), 0.8, VIEWER_MAX_ZOOM);
  return { s, x: m.x - (m0.x - x0) * s / s0, y: m.y - (m0.y - y0) * s / s0 };
}

/** Where a double-tap at (px, py) px from the centre zooms to (pure): in VIEWER_TAP_ZOOM times with that point kept
 * in place, or back out from any zoom. @param {number} px @param {number} py @param {number} s @returns {{ s: number, x: number, y: number }} */
export const tapZoom = (px, py, s) => (s > 1 ? { s: 1, x: 0, y: 0 } : { s: VIEWER_TAP_ZOOM, x: px * (1 - VIEWER_TAP_ZOOM), y: py * (1 - VIEWER_TAP_ZOOM) });

/** Which photo a sideways swipe lands on (pure): the next or the one before once it went past 18 % of the width or
 * was thrown that way (over 0.3 px/ms), else the same. @param {number} i @param {number} n @param {number} dx
 * @param {number} v @param {number} W */
export function swipeTo(i, n, dx, v, W) {
  const way = dx < -W * 0.18 || v < -0.3 ? 1 : dx > W * 0.18 || v > 0.3 ? -1 : 0;
  return clamp(i + (way && Math.sign(-dx || way) === way ? way : 0), 0, Math.max(0, n - 1));
}

/**
 * @param {HTMLDialogElement} dlg  an empty <dialog> to fill (an aria-label names it; "Photo" if it has none)
 * @param {{ steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } } | null,
 *   labels?: { close?: string, photo?: string }, onChange?: (i: number) => void }} [o]
 *   steps: the page's createTransients(), so Back closes it; labels: the close button's and the dialog's names;
 *   onChange: the photo shown changed (its index)
 * @returns {PhotoViewer}
 */
export function photoViewer(dlg, { steps = null, labels = {}, onChange } = {}) {
  const words = { close: 'Close', photo: 'Photo', ...labels };
  const l = listeners();
  const make = (/** @type {string} */ tag, /** @type {string} */ cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  dlg.classList.add('ui-photo-viewer');
  if (!dlg.hasAttribute('aria-label')) dlg.setAttribute('aria-label', words.photo);
  const bg = make('div', 'ui-pv-bg'), track = make('div', 'ui-pv-track'), cap = make('p', 'ui-pv-cap');
  const closeBtn = /** @type {HTMLButtonElement} */ (make('button', 'ui-pv-close'));
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', words.close);
  closeBtn.append(icon(xIcon));
  cap.setAttribute('aria-live', 'polite');
  dlg.replaceChildren(bg, track, closeBtn, cap);

  /** @type {ViewerPhoto[]} */ let list = [];
  let i = 0, s = 1, x = 0, y = 0, drop = 0;   // the photo shown, its zoom, pan (px from centre) and drop (a swipe down)
  /** @type {Map<number, { x: number, y: number }>} */
  const pts = new Map();   // fingers down
  /** @type {any} */ let g = null;   // the gesture in progress
  let lastTap = { t: 0, x: 0, y: 0 }, closing = false;
  const speed = tracker();
  /** @type {{ readonly active: boolean, close: () => Promise<void> } | null} */
  let step = null;
  const W = () => dlg.clientWidth || innerWidth, H = () => dlg.clientHeight || innerHeight;
  const home = () => (i ? -i * W() : 0);   // the track's place for the photo shown (no -0)
  const img = () => /** @type {HTMLImageElement | undefined} */ (track.children[i]?.querySelector('img') ?? undefined);

  // ---- the track (sideways): placed by the finger, glided by the spring
  let trackAt = 0;
  /** @type {import('./motion.js').Glide | null} */ let trackRun = null;
  const trackFrame = (/** @type {number} */ p) => ({ transform: `translate3d(${p}px,0,0)` });
  function placeTrack(/** @type {number} */ p) {
    const run = trackRun;
    trackRun = null;
    run?.stop();
    trackAt = p;
    track.style.transform = trackFrame(p).transform;
  }
  /** a finger landed on the track's glide: it holds where it is (stop() gives the place) */
  const catchTrack = () => { if (trackRun) placeTrack(trackRun.stop()); };
  function settleTrack(v = 0) {
    catchTrack();
    const to = home();
    if (Math.abs(to - trackAt) < 1) { placeTrack(to); return; }
    const run = trackRun = glide([[track, trackFrame]], trackAt, to, v);
    track.style.transform = trackFrame(to).transform;   // (the glide shows over it; it rests there when the glide is gone)
    trackAt = to;
    void run.done.then(landed => { if (landed && trackRun === run) { trackRun.stop(); trackRun = null; } });
  }

  // ---- the photo (zoom, pan, drop) and the black behind it
  const shrink = (/** @type {number} */ d) => 1 - Math.min(d, 400) / 2000;
  const photoFrame = (/** @type {{ s: number, x: number, y: number, drop: number }} */ t) => ({ transform: `translate3d(${t.x}px,${t.y + t.drop}px,0) scale(${t.s * shrink(t.drop)})` });
  const bgFrame = (/** @type {number} */ d) => ({ opacity: String(Math.max(0, 1 - Math.min(d, 500) / 500)) });
  /** @type {import('./motion.js').Glide | null} */ let zoomRun = null;
  /** @type {HTMLImageElement | undefined} */ let zoomImg;
  function showZoom() {
    const p = img();
    if (zoomRun) { zoomRun.stop(); zoomRun = null; }
    if (p) p.style.transform = photoFrame({ s, x, y, drop }).transform;
    bg.style.opacity = bgFrame(drop).opacity;
    dlg.classList.toggle('is-zoomed', s > 1.01);
  }
  /** glide from the photo's place now to {s, x, y, drop} (the spring runs 0..1000 as the share of the way) */
  function glideZoom(/** @type {{ s: number, x: number, y: number, drop: number }} */ to, v = 0) {
    const p = img();
    const from = { s, x, y, drop };
    ({ s, x, y, drop } = to);
    if (!p || still()) { showZoom(); return null; }
    const mix = (/** @type {number} */ k) => ({ s: from.s + (to.s - from.s) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, drop: from.drop + (to.drop - from.drop) * k });
    const dist = Math.max(1, Math.abs(to.drop - from.drop), Math.abs(to.x - from.x), Math.abs(to.y - from.y), Math.abs(to.s - from.s) * 400);
    showZoom();
    zoomImg = p;
    const run = zoomRun = glide([[p, k => photoFrame(mix(k / 1000))], [bg, k => bgFrame(mix(k / 1000).drop)]], 0, 1000, v * 1000 / dist);
    void run.done.then(landed => { if (landed && zoomRun === run) { zoomRun.stop(); zoomRun = null; } });
    return run;
  }
  /** a finger landed on a zoom glide: hold the photo where it is */
  function catchZoom() {
    if (!zoomRun) return;
    const p = zoomImg, run = zoomRun;
    zoomRun = null;
    if (!run.running() || !p) { run.stop(); return; }
    const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
    run.stop();
    const sc = Math.hypot(m.a, m.b) || 1;
    drop = 0; s = sc; x = m.e; y = m.f;
    bg.style.opacity = '1';
    showZoom();
  }
  /** @param {number} k */
  const limits = (k = s) => { const p = img(); return p ? panLimits(p.offsetWidth, p.offsetHeight, k, W(), H()) : /** @type {[number, number]} */ ([0, 0]); };
  /** a zoom k with the pan (tx, ty) kept inside the photo's limits at that zoom @param {number} k @param {number} tx @param {number} ty */
  const fit = (k, tx, ty) => { const [lx, ly] = limits(k); return { s: k, x: clamp(tx, -lx, lx), y: clamp(ty, -ly, ly), drop: 0 }; };
  function unzoom() { catchZoom(); s = 1; x = 0; y = 0; drop = 0; showZoom(); const p = img(); if (p) p.style.transform = ''; }

  function caption() {
    const ph = list[i];
    cap.textContent = [ph?.cap || ph?.alt || '', list.length > 1 ? `${i + 1} / ${list.length}` : ''].filter(Boolean).join('  ·  ');
  }
  /** @param {number} n @param {number} [v] */
  function go(n, v = 0) {
    n = clamp(n, 0, list.length - 1);
    if (n !== i) { unzoom(); i = n; caption(); onChange?.(i); }
    settleTrack(v);
  }

  /** @param {ViewerPhoto[]} photos @param {number} [at] */
  function open(photos, at = 0) {
    if (!photos.length) return;
    list = photos; i = clamp(at, 0, photos.length - 1); s = 1; x = 0; y = 0; drop = 0; pts.clear(); g = null;
    track.replaceChildren(...photos.map((ph, n) => {
      const fig = make('figure', 'ui-pv-slide'), p = /** @type {HTMLImageElement} */ (document.createElement('img'));
      p.alt = ph.alt || ph.cap || '';
      p.draggable = false;
      p.decoding = 'async';
      if (Math.abs(n - i) > 1) p.loading = 'lazy';
      p.src = ph.thumb || ph.src;
      if (ph.thumb && ph.thumb !== ph.src) { const full = new Image(); full.onload = () => { p.src = ph.src; }; full.src = ph.src; }
      fig.append(p);
      return fig;
    }));
    bg.style.opacity = '1';
    caption();
    if (!dlg.open) dlg.showModal();
    placeTrack(home());
    if (steps && !step) step = steps.open(() => { step = null; if (dlg.open) dlg.close(); });
    onChange?.(i);
  }
  /** closes it (Back's step too) */
  function close() {
    if (step?.active) { void step.close(); return; }   // (its dismiss closes the dialog)
    if (dlg.open) dlg.close();
  }

  // ---- fingers (and a mouse): pointer events on the dialog, which takes every touch (touch-action: none)
  const mid = () => {
    const [a, b] = [...pts.values()];
    return { x: (a.x + b.x) / 2 - W() / 2, y: (a.y + b.y) / 2 - H() / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  const startOne = (/** @type {{ clientX: number, clientY: number, timeStamp?: number }} */ e) => {
    g = { one: true, sx: e.clientX, sy: e.clientY, x0: x, y0: y, mode: '' };
    speed.reset(e.timeStamp ?? performance.now(), 0);
  };
  l.on(dlg, 'pointerdown', (/** @type {PointerEvent} */ e) => {
    if (closing || /** @type {Element} */ (e.target).closest('.ui-pv-close')) return;
    dlg.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    catchTrack(); catchZoom();
    if (trackAt !== home() && pts.size === 1) {   // caught mid-glide: the swipe goes on from there
      const dx = trackAt + i * W();
      g = { one: true, sx: e.clientX - dx, sy: e.clientY, x0: x, y0: y, mode: 'swipe' };
      speed.reset(e.timeStamp, dx);
      return;
    }
    if (pts.size === 2) {
      claim('viewer');
      g = { pinch: true, m0: mid(), s0: s, x0: x, y0: y };
      drop = 0;
      settleTrack();
    } else if (pts.size === 1) startOne(e);
  });
  l.on(dlg, 'pointermove', (/** @type {PointerEvent} */ e) => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pinch && pts.size >= 2) { ({ s, x, y } = pinchTo(g.m0, mid(), g.s0, g.x0, g.y0)); showZoom(); return; }
    if (!g.one) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.mode && Math.hypot(dx, dy) > 8) {
      g.mode = s > 1.01 ? 'pan' : Math.abs(dx) > Math.abs(dy) ? 'swipe' : dy > 0 ? 'down' : 'none';
      if (g.mode !== 'none') claim('viewer');
    }
    if (g.mode === 'pan') { const [lx, ly] = limits(); x = clamp(g.x0 + dx, -lx, lx); y = clamp(g.y0 + dy, -ly, ly); showZoom(); }
    else if (g.mode === 'swipe') {
      const end = (i === 0 && dx > 0) || (i === list.length - 1 && dx < 0);
      placeTrack(home() + (end ? rubber(dx, W()) : dx));
      speed.add(e.timeStamp, dx);
    } else if (g.mode === 'down') { drop = Math.max(0, dy); showZoom(); speed.add(e.timeStamp, dy); }
  });
  /** @param {PointerEvent} e */
  function lift(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!g) return;
    if (g.pinch) {   // back inside the limits (or out to 1 from a little zoom); a finger still down pans on from there
      glideZoom(s <= 1.02 ? { s: 1, x: 0, y: 0, drop: 0 } : fit(Math.min(s, VIEWER_MAX_ZOOM), x, y));
      if (pts.size === 1) { const [p] = [...pts.values()]; startOne({ clientX: p.x, clientY: p.y, timeStamp: e.timeStamp }); g.mode = s > 1.01 ? 'pan' : 'none'; }
      else g = null;
      return;
    }
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy, mode = g.mode;
    g = null;
    if (e.type === 'pointercancel') { settleTrack(); glideZoom({ s, x, y, drop: 0 }); return; }
    const v = speed.speed(e.timeStamp);
    if (mode === 'swipe') go(swipeTo(i, list.length, dx, v, W()), v);
    else if (mode === 'down') {
      if (dy > CLOSE_DROP || v > CLOSE_SPEED) {   // on down and out of sight as it fades, then closed
        closing = true;
        const run = glideZoom({ s, x, y, drop: H() }, Math.max(v, 0.5));
        if (run) void run.done.then(() => close()); else close();
      } else glideZoom({ s, x, y, drop: 0 }, v);
    } else if (!mode) {   // a tap: two quick ones zoom in (to where you tapped) or back out
      if (e.timeStamp - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        lastTap.t = 0;
        const t = tapZoom(e.clientX - W() / 2, e.clientY - H() / 2, s);
        glideZoom(fit(t.s, t.x, t.y));
      } else lastTap = { t: e.timeStamp, x: e.clientX, y: e.clientY };
    }
  }
  l.on(dlg, 'pointerup', lift);
  l.on(dlg, 'pointercancel', lift);
  l.on(dlg, 'wheel', (/** @type {WheelEvent} */ e) => {
    e.preventDefault();
    catchZoom();
    s = clamp(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, VIEWER_MAX_ZOOM);
    ({ x, y } = s === 1 ? { x: 0, y: 0 } : fit(s, x, y));
    showZoom();
  }, { passive: false });
  l.on(dlg, 'keydown', (/** @type {KeyboardEvent} */ e) => { if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1); });
  l.on(dlg, 'cancel', (/** @type {Event} */ e) => { if (step?.active) { e.preventDefault(); close(); } });   // Esc: through Back's step
  l.on(closeBtn, 'click', close);
  l.on(dlg, 'close', () => {
    if (zoomRun) { zoomRun.stop(); zoomRun = null; }
    if (trackRun) { trackRun.stop(); trackRun = null; }
    track.replaceChildren(); list = []; pts.clear(); g = null; s = 1; x = 0; y = 0; drop = 0; closing = false;
    dlg.classList.remove('is-zoomed');
    if (step?.active) { const st = step; step = null; void st.close(); }
  });
  l.on(window, 'resize', () => { if (dlg.open) { unzoom(); placeTrack(home()); } });

  return {
    open, close, go: n => go(n), index: () => i,
    stop: () => { close(); l.stop(); dlg.replaceChildren(); dlg.classList.remove('ui-photo-viewer', 'is-zoomed'); },
  };
}
