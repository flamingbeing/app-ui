// Loading and error states for a list: grey skeleton rows while it loads, or the error with a Retry button.
// The page says which (loading / failed / done); nothing is shown once done.
import { LABELS } from './labels.js';
import { el, button } from './dom.js';

/**
 * @param {HTMLElement} host  the block is added here, empty until loading() or failed()
 * @param {{ rows?: number, labels?: Record<string, string> }} [o]  rows: how many skeleton rows (default 4)
 * @returns {{ loading: () => void, failed: (message: string, retry: () => unknown) => void, done: () => void, stop: () => void }}
 */
export function loadState(host, { rows = 4, labels = {} } = {}) {
  const words = { ...LABELS, ...labels };
  const box = el('div', { class: 'load-state' });
  box.hidden = true;
  host.append(box);
  const done = () => { box.replaceChildren(); box.hidden = true; host.removeAttribute('aria-busy'); };
  return {
    loading() {
      const hadFocus = box.contains(document.activeElement);
      const skeleton = Array.from({ length: rows }, () => el('div', { class: 'load-row' }));
      box.replaceChildren(el('p', { class: 'load-note', role: 'status', tabindex: '-1' }, words.loading), ...skeleton);
      box.hidden = false;
      if (hadFocus) /** @type {HTMLElement} */ (box.firstElementChild).focus();   // Try again was pressed: focus stays in the block
      host.setAttribute('aria-busy', 'true');
    },
    failed(message, retry) {
      const hadFocus = box.contains(document.activeElement);
      done();
      const again = button(words.retry, retry, { class: 'load-retry' });
      box.replaceChildren(el('p', { class: 'load-error', role: 'alert' }, message), again);
      box.hidden = false;
      if (hadFocus) again.focus();
    },
    done,
    stop() { done(); box.remove(); },
  };
}

// ---------- instant start ----------
// Three helpers so a screen never flashes empty or "Loading…" while it is starting. The app keeps its own data and
// decides where a kept copy lives (read/write below); these only paint, wait and swap.

/** How many rows of a list a kept copy holds: more than a tall screen shows. */
export const SNAP_ROWS = 60;

/**
 * The last list, painted at once on start from the app's kept copy, like a phone app reopening where it was; the
 * real list takes over once it has come. Call it when the page starts, before waiting for sign-in or sync.
 * The copy is the host's markup: its first `rows` children, without aria-current, aria-selected or .changed. A row
 * (`[data-id]`) tapped while the copy shows is kept, and takeOver() hands its id back to open once the real list is
 * drawn. While the copy shows, the host has data-ui-cached and aria-busy.
 * @param {HTMLElement} host  the list's own element (it is filled with the copy, then emptied for the real list)
 * @param {{ read: () => string | null | undefined, write: (html: string | null) => void, rows?: number, wait?: number }} o
 *   read: the kept copy (null: none, the page starts as before); write: keep it (null: forget it, at sign-out);
 *   rows: how many rows to keep (default SNAP_ROWS); wait: ms after the last keep() before it is written (default 1000)
 * @returns {{ painted: boolean, keep: () => void, takeOver: () => string, drop: () => void, stop: () => void }}
 *   painted: the copy is showing; keep: the list changed, write the copy soon (when the page is idle, and at once on
 *   leaving); takeOver: the real list is about to be drawn, gives the tapped row's id or ''; drop: forget the copy
 */
export function cachedPaint(host, { read, write, rows = SNAP_ROWS, wait = 1000 }) {
  let html = null;
  try { html = read(); } catch { /* storage off */ }
  let cached = typeof html === 'string' && html !== '';
  let tapped = '', dirty = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const onTap = (/** @type {Event} */ e) => {
    const row = e.target instanceof Element ? e.target.closest('[data-id]') : null;
    if (cached && row && host.contains(row)) tapped = row.getAttribute('data-id') || '';
  };
  if (cached) {
    host.innerHTML = /** @type {string} */ (html);
    host.setAttribute('data-ui-cached', '');
    host.setAttribute('aria-busy', 'true');
    host.addEventListener('click', onTap);
  }
  const save = () => {
    clearTimeout(timer);
    if (!dirty || cached) return;
    dirty = false;
    const box = /** @type {HTMLElement} */ (host.cloneNode(false));
    for (const child of [...host.children].slice(0, rows)) {
      const c = /** @type {HTMLElement} */ (child.cloneNode(true));
      for (const n of [c, ...c.querySelectorAll('[aria-current], [aria-selected], .changed')]) {
        n.removeAttribute('aria-current'); n.removeAttribute('aria-selected'); n.classList.remove('changed');
      }
      box.append(c);
    }
    try { write(box.innerHTML); } catch { /* storage full or off */ }
  };
  const onHide = () => { if (document.visibilityState === 'hidden') save(); };
  document.addEventListener('visibilitychange', onHide);
  return {
    get painted() { return cached; },
    keep() {
      dirty = true;
      clearTimeout(timer);
      const idle = /** @type {(f: () => void) => unknown} */ (globalThis.requestIdleCallback ?? (f => setTimeout(f, 0)));
      timer = setTimeout(() => idle(save), wait);   // (when the page is idle, so a swipe or typing never waits on it)
    },
    takeOver() {
      if (!cached) return '';
      cached = false;
      host.removeEventListener('click', onTap);
      host.removeAttribute('data-ui-cached');
      host.removeAttribute('aria-busy');
      host.replaceChildren();
      const id = tapped;
      tapped = '';
      return id;
    },
    drop() { clearTimeout(timer); dirty = false; try { write(null); } catch { /* storage off */ } },
    stop() { clearTimeout(timer); host.removeEventListener('click', onTap); document.removeEventListener('visibilitychange', onHide); },
  };
}

/**
 * Holds a list's empty state until its first data has come, so a list that will fill shows as loading, never as
 * "Nothing here yet" for the second or two sign-in and the first sync take. Draw the empty state only when
 * `!hold.holding`; draw loading (loadState's skeleton) while it holds. It ends at release() (the data came, or the
 * lookup failed) or after `ms`, so a stuck sign-in never holds it for ever; onEnd runs once then (redraw).
 * @param {{ hold?: boolean, ms?: number, onEnd?: () => void }} [o]  hold: whether to hold at all (say, this device had
 *   data last time; default true); ms: the longest it holds (default 8000)
 * @returns {{ readonly holding: boolean, release: () => void }}
 */
export function holdEmpty({ hold = true, ms = 8000, onEnd } = {}) {
  let holding = hold;
  const release = () => { if (!holding) return; holding = false; clearTimeout(timer); onEnd?.(); };
  const timer = holding ? setTimeout(release, ms) : undefined;
  return { get holding() { return holding; }, release };
}

/** @type {WeakMap<HTMLElement, HTMLElement>} the view each host is waiting to show */
const coming = new WeakMap();

/**
 * Shows `next` in `host` once `ready` has settled, keeping what the host shows now up (still, inert) until then: a
 * tab switch whose module mounts into `next` shows the tab's last view instead of an empty or "Loading…" page. With
 * nothing in the host, `next` goes in at once. Meanwhile `next` is laid out but unseen (.ui-swap-in), so the module
 * can measure. A later swap into the same host wins: an earlier `next` still waiting is dropped.
 * @param {HTMLElement} host @param {HTMLElement} next @param {Promise<unknown>} ready  (a failure swaps in too: the
 *   module shows its own error in `next`)
 * @returns {Promise<boolean>}  whether `next` is the one showing
 */
export async function swapWhenReady(host, next, ready) {
  const old = /** @type {HTMLElement[]} */ ([...host.children]).filter(c => c !== next && !c.classList.contains('ui-swap-in'));
  coming.get(host)?.remove();
  if (!old.length) { coming.delete(host); host.replaceChildren(next); await Promise.resolve(ready).catch(() => {}); return next.parentNode === host; }
  coming.set(host, next);
  for (const c of old) c.inert = true;
  next.classList.add('ui-swap-in');
  host.append(next);
  await Promise.resolve(ready).catch(() => {});
  if (coming.get(host) !== next) return false;
  coming.delete(host);
  next.classList.remove('ui-swap-in');
  host.replaceChildren(next);
  return true;
}
