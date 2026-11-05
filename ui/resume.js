// Warm start (opt-in: startGestures(document, { resume: true }), or tabPages' resume option): an app opened again soon
// after it was left comes back on the same tab, at the same scroll, as a mini programme reopens where it was. Kept on
// this device only (localStorage RESUME_KEY): the page's address path, the tab page's id and the scroll, with when it
// was left; never data, names or account details. Pushed screens are not kept (what one shows is the app's, not the
// shell's), so a warm start opens the tab they were pushed over. Within the window (RESUME_MINUTES, the minutes
// option) a start opens that tab at that scroll instead of the first; later, or with a hash or query in the address
// (a deep link: the app's own), it starts as usual.
// No flash: theme/early.js (the classic script in <head>, before the first paint) reads the kept place with the same
// rule as placeToOpen and marks <html data-resuming="<tab id>" data-resume-y="<px>">; gestures/screens.css keeps the
// pages, tab bar and side bar unseen while it is there (at most 1.2 s), and tabPages opens that tab before anything
// shows, then takes the mark off. Without early.js the tab still opens, a moment later. This module (loaded by
// tabPages with import() only when the option is on) keeps the place when the page is hidden or left (pagehide,
// visibilitychange: no work per scroll frame) and holds the kept scroll while the page's rows are still being drawn.
// Every storage call is in try/catch: no storage (a private window, blocked site data) means a normal start.
// Nothing runs on import.

/** Where the place is kept (localStorage). */
export const RESUME_KEY = 'ui-resume';
/** How long after leaving a start still resumes (minutes; the minutes option). */
export const RESUME_MINUTES = 60;
/** How long the kept scroll is held while the page grows (ms): a list drawn later than this starts at the top. */
export const RESUME_HOLD_MS = 3000;
// a tab page's id as kept: plain, so it is safe as a selector and an attribute
const ID = /^[A-Za-z][\w-]{0,63}$/;

/** @typedef {{ v: 1, path: string, tab: string, y: number, at: number, until: number }} KeptPlace */
/** @typedef {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void }} PlaceStore */

/**
 * The place to keep (pure): which tab, how far down, when, and until when it may be resumed.
 * @param {{ path: string, tab: string, y: number, now: number, minutes?: number }} o
 * @returns {KeptPlace | null}  null: nothing worth keeping (a page without a plain id)
 */
export function keepPlace({ path, tab, y, now, minutes = RESUME_MINUTES }) {
  if (!ID.test(tab)) return null;
  return { v: 1, path, tab, y: Math.max(0, Math.round(Number.isFinite(y) ? y : 0)), at: now, until: now + Math.max(0, minutes) * 60_000 };
}

/**
 * The place a start opens (pure; theme/early.js applies the same rule before the first paint): the kept tab and
 * scroll when the place is this page's, kept at or before now and not yet past its window, and the address has no hash
 * or query (a deep link wins); else null (a normal start).
 * @param {string | null} raw  what RESUME_KEY holds
 * @param {{ path: string, hash?: string, search?: string, now: number }} at  the address now, and the clock
 * @returns {{ tab: string, y: number } | null}
 */
export function placeToOpen(raw, { path, hash = '', search = '', now }) {
  if (!raw || hash || search) return null;
  /** @type {any} */
  let p;
  try { p = JSON.parse(raw); } catch { return null; }
  if (!p || p.v !== 1 || p.path !== path || typeof p.tab !== 'string' || !ID.test(p.tab)) return null;
  if (typeof p.at !== 'number' || typeof p.until !== 'number' || !(now >= p.at && now < p.until)) return null;
  const y = typeof p.y === 'number' && Number.isFinite(p.y) && p.y > 0 ? Math.round(p.y) : 0;
  return { tab: p.tab, y };
}

/** localStorage, or null where it can't be reached @returns {PlaceStore | null} */
function local() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * The browser side (tabPages starts it): keeps the place whenever the page is hidden or left, and holds a resumed
 * scroll while the page grows.
 * @param {{ current: () => HTMLElement, y: () => number, open?: (tab: string, y: number) => boolean }} tabs
 *   current: the tab page showing; y: its scroll (the tab's own under a pushed screen); open: shows a kept tab at a
 *   scroll if nothing has moved yet (used when early.js didn't mark the page; false: not opened)
 * @param {{ minutes?: number, storage?: PlaceStore | null, now?: () => number, location?: Pick<Location, 'pathname' | 'hash' | 'search'>,
 *   events?: Pick<Window, 'addEventListener' | 'removeEventListener'>, doc?: Document, resumed?: { page: HTMLElement, y: number } | null,
 *   scrollTo?: (y: number) => void, scrollY?: () => number }} [o]
 *   resumed: the page tabPages already opened from early.js's mark (its scroll is held); scrollTo / scrollY: the
 *   window's, by default
 * @returns {{ save: () => void, stop: () => void }}  save: keeps the place now
 */
export function resumeTabs(tabs, { minutes = RESUME_MINUTES, storage = local(), now = Date.now, location = globalThis.location,
  events = globalThis, doc = document, resumed = null, scrollTo = y => globalThis.scrollTo(0, y), scrollY = () => globalThis.scrollY } = {}) {
  /** @type {(() => void)[]} */
  const stops = [];
  /** @param {Pick<EventTarget, 'addEventListener' | 'removeEventListener'>} t @param {string} type @param {EventListener} fn @param {AddEventListenerOptions} [o] */
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); stops.push(() => t.removeEventListener(type, fn, o)); };
  let held = resumed;
  if (!held && tabs.open) {
    // no mark from early.js (an app without it in <head>): open the kept tab now, if the person hasn't moved
    let raw = null;
    try { raw = storage?.getItem(RESUME_KEY) ?? null; } catch { /* none */ }
    const place = placeToOpen(raw, { path: location.pathname, hash: location.hash, search: location.search, now: now() });
    if (place && tabs.open(place.tab, place.y)) held = { page: tabs.current(), y: place.y };
  }
  if (held && held.y > 0) stops.push(holdScroll(held.page, held.y, { tabs, doc, scrollTo, scrollY }));

  const save = () => {
    const page = tabs.current();
    const place = page && keepPlace({ path: location.pathname, tab: page.id, y: tabs.y(), now: now(), minutes });
    if (!place) return;
    try { storage?.setItem(RESUME_KEY, JSON.stringify(place)); } catch { /* full or blocked: a normal start next time */ }
  };
  on(events, 'pagehide', save);
  on(doc, 'visibilitychange', () => { if (doc.visibilityState === 'hidden') save(); });
  return { save, stop: () => { while (stops.length) /** @type {() => void} */ (stops.pop())(); } };
}

/**
 * Holds a resumed scroll while the page is still too short for it (its rows come later): each time the page grows the
 * scroll goes to y again, until it is there, the person touches, scrolls with a wheel or key, the tab changes, or
 * RESUME_HOLD_MS pass. @param {HTMLElement} page @param {number} y
 * @param {{ tabs: { current: () => HTMLElement }, doc: Document, scrollTo: (y: number) => void, scrollY: () => number }} o
 * @returns {() => void} stop
 */
function holdScroll(page, y, { tabs, doc, scrollTo, scrollY }) {
  let done = false;
  /** @type {ResizeObserver | null} */
  let ro = null;
  const inputs = ['touchstart', 'wheel', 'keydown', 'pointerdown'];
  const stop = () => {
    if (done) return;
    done = true;
    ro?.disconnect();
    clearTimeout(timer);
    for (const t of inputs) doc.removeEventListener(t, stop, true);
  };
  const again = () => {
    if (done || tabs.current() !== page) { stop(); return; }
    if (Math.abs(scrollY() - y) <= 1) { stop(); return; }
    scrollTo(y);
    if (Math.abs(scrollY() - y) <= 1) stop();
  };
  const timer = setTimeout(stop, RESUME_HOLD_MS);
  for (const t of inputs) doc.addEventListener(t, stop, { capture: true, passive: true });
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(again); ro.observe(page); }
  again();
  return stop;
}
