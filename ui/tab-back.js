// Back with tabs, as Android apps do it: switching tabs adds no Back steps; Back on any other tab goes to the first
// tab, and Back on the first tab leaves the app. Leaving the first tab adds one history entry (a tap does it, so Chrome
// keeps it), moving between the other tabs only changes its address, and going to the first tab by a tap takes the
// entry away again. tabPages uses it; an app with its own router calls went() after each tab change it makes.
// Press Back again to close (given onClose): one more entry, the guard, sits on the first tab's own, so the first Back
// there stays in the app (an installed app closed by Back opens cold next time, splash and all). It lands on the
// first tab's own entry and calls onClose (show "Press Back again to close"); a second Back within closeMs leaves.
// After that the guard comes back (or, with a sheet or pushed screen open then, once Back has closed it). Entries:
// [first tab, guard] on the first tab, [first tab, guard, other tab] on another; sheets and screens stack on top and
// close first, as before. Chrome skips an entry added with no tap since (its history intervention) until the next tap,
// so a Back before any tap at all may still leave.
// Nothing runs on import.
import { stepping, stepsSettled } from './steps.js';

/** How long the second Back may wait and still leave (Android's own "press again" window). */
export const CLOSE_MS = 2000;

// the entries the parts push over the first tab's own (sheets, screens, the drawer, the tabs')
const OVER = ['uiTabGuard', 'uiTabBack', 'uiScreens', 'uiSheet', 'uiTransient', 'uiDrawer'];

/**
 * @param {{ history: History, events: Pick<Window, 'addEventListener' | 'removeEventListener'>, onFirst: () => void,
 *   onClose?: () => void, closeMs?: number, first?: boolean }} o
 *   onFirst: Back took the page to the first tab; show it (the address is already the first tab's); onClose: Back on
 *   the first tab, kept in the app: say "Press Back again to close" (without it, no guard: Back there leaves);
 *   closeMs: the window for that second Back (default CLOSE_MS); first: whether the page starts on the first tab
 *   (default: yes, unless the entry is another tab's)
 * @returns {{ went: (first: boolean, url?: string) => void, away: () => boolean, closing: () => boolean, stop: () => void }}
 *   went: the page now shows a tab (first: whether it is the first); url: its address, if the router keeps one;
 *   closing: within the window, a Back now leaves
 */
export function tabBack({ history, events, onFirst, onClose, closeMs = CLOSE_MS, first: startFirst }) {
  const away = () => !!history.state?.uiTabBack;
  const guarded = () => !!history.state?.uiTabGuard;
  const bottom = () => !OVER.some(k => history.state?.[k] != null);   // the first tab's own entry, nothing over it
  let was = away();
  let wasGuarded = guarded();
  let first = startFirst ?? !was;
  let closing = false;   // the window after onClose: no guard, a Back leaves
  let owed = false;      // the guard is due back once the page is down on the first tab's own entry
  let tapped = false;    // the next landing is went()'s own step back to the first tab
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  function arm() {
    if (!onClose || closing) return;
    if (stepping()) { void stepsSettled().then(arm); return; }
    if (guarded() || !bottom()) { owed = !guarded(); return; }
    owed = false;
    try { history.pushState({ ...(history.state || {}), uiTabGuard: 1 }, ''); wasGuarded = true; } catch { /* no history here */ }
  }
  function shut() { clearTimeout(timer); closing = false; }

  /** @param {boolean} isFirst @param {string} [url] */
  function went(isFirst, url) {
    // a sheet's or the drawer's step back still on its way would land on the entry pushed here and undo it
    if (stepping()) { void stepsSettled().then(() => went(isFirst, url)); return; }
    first = isFirst;
    if (!isFirst && !away()) {
      // left within the window (no guard under): this entry is the guard too, so Back comes to the first tab and asks
      const guard = onClose && !guarded() ? { uiTabGuard: 1 } : {};
      shut(); owed = false;
      history.pushState({ ...(history.state || {}), ...guard, uiTabBack: 1 }, '', url);
      wasGuarded = guarded();
    }
    else if (isFirst && away()) { tapped = true; history.back(); }   // the first tab's own entry (or its guard) is under this one
    else if (url !== undefined) history.replaceState(history.state, '', url);
    was = !isFirst;
  }
  const landed = () => {
    const now = away();
    const g = guarded();
    // Back (or went's own step) from another tab; or below the guard while on another tab (the page started there)
    const left = !now && (was || (!first && !g && !tapped));
    if (left) { first = true; if (!tapped) onFirst(); }
    if (onClose && !g && wasGuarded && bottom() && !closing) {
      if (first && !left && !tapped) {
        // Back on the first tab: kept in the app, and the window opens
        closing = true;
        timer = setTimeout(() => { closing = false; arm(); }, closeMs);
        onClose();
      } else arm();
    } else if (owed && !g && bottom()) arm();
    tapped = false;
    was = now;
    wasGuarded = guarded();
  };
  events.addEventListener('popstate', landed);
  arm();
  return { went, away, closing: () => closing, stop: () => { shut(); events.removeEventListener('popstate', landed); } };
}
