// Back on the home screen of the installed app: one spare history entry under the page, so Back there runs onHome
// (for example, go to the first tab) instead of leaving. On Android, leaving the first entry of an installed app can
// show an empty window rather than closing it. In a browser tab Back leaves the site as usual, so it is off there.
// Chrome skips an entry pushed without a tap when going back, so the spare entry goes in at a tap on the home screen
// (and again after each use): Back twice in a row with no tap between still leaves. Nothing runs on import.

/**
 * @typedef {{ history: History, events: Pick<Window, 'addEventListener' | 'removeEventListener'>,
 *   standalone?: boolean, atHome?: () => boolean, onHome?: () => void }} GuardOptions
 *   standalone: whether the page runs as the installed app (default: installedApp()); atHome: whether the page shows
 *   its home screen with nothing open over it (the spare entry goes in only then); onHome: runs when Back would leave
 */

/** Whether the page runs as an installed app (its own window). @param {(q: string) => boolean} [media] @param {Navigator} [nav] */
export function installedApp(media = q => typeof matchMedia === 'function' && matchMedia(q).matches,
  nav = typeof navigator === 'undefined' ? /** @type {Navigator} */ ({}) : navigator) {
  return /** @type {any} */ (nav).standalone === true
    || ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(m => media(`(display-mode: ${m})`));
}

/** @param {GuardOptions} o @returns {{ armed: () => boolean, stop: () => void }} */
export function backGuard({ history, events, standalone = installedApp(), atHome = () => true, onHome = () => {} }) {
  if (!standalone) return { armed: () => false, stop: () => {} };
  const mark = () => history.state?.uiBackGuard;
  // after a reload the spare entry may still be under the page
  let armed = mark() === 'top';
  const arm = () => {
    if (armed || !atHome()) return;
    armed = true;
    const state = history.state || {};
    history.replaceState({ ...state, uiBackGuard: 'base' }, '');
    history.pushState({ ...state, uiBackGuard: 'top' }, '');
  };
  const landed = () => {
    if (mark() !== 'base') return;
    armed = false;
    onHome();
  };
  const taps = /** @type {const} */ (['pointerup', 'keydown']);
  taps.forEach(t => events.addEventListener(t, arm, true));
  events.addEventListener('popstate', landed);
  return {
    armed: () => armed,
    stop() { taps.forEach(t => events.removeEventListener(t, arm, true)); events.removeEventListener('popstate', landed); },
  };
}
