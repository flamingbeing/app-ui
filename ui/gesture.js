// What every gesture part shares: how long a hold is, how far a finger may wander, which places never start a
// gesture, the device's Still choice, a light haptic tap, and the finger physics of the pager and the drawer (which
// way a first move goes, a let-go speed, the spring glide, the rubber band). Not exported from @core/ui except still()
// and haptic() (tab-pages.js passes the physics on).

/** a hold: this long (ms) without moving more than SLOP (px) */
export const HOLD_MS = 500;
export const SLOP = 10;

/**
 * Less motion: the device's Reduce Motion, or Still in the theme switch (data-motion="still" on <html>). Read each
 * time, as either can change while the page is open.
 * @returns {boolean}
 */
export function still() {
  if (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'still') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Places a gesture never starts from: fields, dialogs (outside the sheet part's own handling), drag handles, things
 * that scroll sideways, and anything marked data-no-gesture.
 * @param {EventTarget | null} target
 * @param {{ inDialog?: boolean }} [opts]  inDialog: the caller is a dialog's own part, so dialogs don't count
 */
export function noGesture(target, { inDialog = false } = {}) {
  const t = /** @type {Element | null} */ (target instanceof Element ? target : null);
  if (!t) return true;
  if (t.closest(`input,textarea,select,[contenteditable],[data-no-gesture],[data-drag-handle],.ui-scroll-x${inDialog ? '' : ',dialog'}`)) return true;
  // anything between the target and the page that scrolls sideways keeps the finger
  for (let n = t.parentElement; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1) {
      const o = getComputedStyle(n).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
    }
  }
  return false;
}

/** @type {HTMLLabelElement | null} */
let tickLabel = null;
/**
 * A light tap: navigator.vibrate where there is one (Android); on iPhone (iOS 18 and later) toggling a hidden
 * <input switch> through its label gives the system's own haptic, the only one a web page can reach there.
 */
export function haptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(10); } catch { /* not allowed now (no user gesture yet) */ }
    return;
  }
  if (typeof document === 'undefined') return;
  if (!tickLabel) {
    tickLabel = document.createElement('label');
    tickLabel.setAttribute('aria-hidden', 'true');
    tickLabel.className = 'ui-haptic';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    tickLabel.append(input);
    document.body.append(tickLabel);
  }
  tickLabel.click();
}

/**
 * Adds listeners and gives back one function that removes them all.
 * @returns {{ on: (t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) => void, stop: () => void }}
 */
export function listeners() {
  /** @type {(() => void)[]} */
  const offs = [];
  return {
    on(t, type, fn, opts) { t.addEventListener(type, fn, opts); offs.push(() => t.removeEventListener(type, fn, opts)); },
    stop() { while (offs.length) /** @type {() => void} */ (offs.pop())(); },
  };
}

/** A first move's direction (pure): 'x' sideways, 'y' a scroll, null not far enough to tell. Sideways is under
 * about 40° from the horizontal; 8 px tells (a phone sends its first move about there). @param {number} mx @param {number} my */
export function swipeIntent(mx, my) {
  if (Math.max(Math.abs(mx), Math.abs(my)) < 8) return null;
  return Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
}

/** How far ahead a let-go swipe's speed is projected, in ms (iOS's paging: the throw counts, not just the drag). */
export const THROW_MS = 200;

/** iOS's rubber band (pure): how far a page shows when pulled d px where there is no page, for a width w. It gives
 * less and less, never more than w. @param {number} d @param {number} w */
export const rubber = (d, w) => Math.sign(d) * (1 - 1 / (Math.abs(d) * 0.55 / w + 1)) * w;

/** The finger travel that shows a page r px out of a rubber band (pure; rubber's inverse, for a stretched page caught
 * by a finger). @param {number} r @param {number} w */
export const unrubber = (r, w) => Math.sign(r) * (1 / (1 - Math.min(Math.abs(r), w * .999) / w) - 1) * w / 0.55;

/** How quickly a let-go glide settles: the spring's response in s (iOS's paging feel). */
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

/** Where a glide run with springPath's frames (linear, one frame each) is now: the frame its time has reached, so a
 * finger can catch it there. @param {Animation} a @param {number[]} path */
export function pathAt(a, path) {
  const t = Number(a.currentTime ?? 0);
  return path[Math.max(0, Math.min(path.length - 1, Math.round(t * 60 / 1000)))];
}

/**
 * The speed a finger lets go at (pure), px per ms: over about its last 100 ms, up to `now` (a phone sends no moves
 * while a finger is still, so one that stopped before it lifted throws nothing, and one that slowed throws less).
 * @param {[number, number][]} samples  [time, position] @param {number} now  the let-go's time
 */
export function releaseVelocity(samples, now) {
  const i = samples.findIndex(s => s[0] >= now - 100);
  if (i < 0) return 0;
  const a = samples[Math.max(0, i - 1)], b = samples[samples.length - 1];
  return (b[1] - a[1]) / Math.max(16, now - a[0]);
}

/**
 * Velocity (px per ms) over the last few samples [time, position].
 * @param {[number, number][]} samples
 */
export function velocity(samples) {
  if (samples.length < 2) return 0;
  const a = samples[0], b = samples[samples.length - 1];
  return (b[1] - a[1]) / Math.max(1, b[0] - a[0]);
}
