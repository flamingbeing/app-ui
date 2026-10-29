// Back with tabs, as Android apps do it: switching tabs adds no Back steps; Back on any other tab goes to the first
// tab, and Back on the first tab leaves the app. Leaving the first tab adds one history entry (a tap does it, so Chrome
// keeps it), moving between the other tabs only changes its address, and going to the first tab by a tap takes the
// entry away again. tabPages uses it; an app with its own router calls went() after each tab change it makes.
// Nothing runs on import.

/**
 * @param {{ history: History, events: Pick<Window, 'addEventListener' | 'removeEventListener'>, onFirst: () => void }} o
 *   onFirst: Back took the page to the first tab; show it (the address is already the first tab's)
 * @returns {{ went: (first: boolean, url?: string) => void, away: () => boolean, stop: () => void }}
 *   went: the page now shows a tab (first: whether it is the first); url: its address, if the router keeps one
 */
export function tabBack({ history, events, onFirst }) {
  const away = () => !!history.state?.uiTabBack;
  let was = away();
  /** @param {boolean} first @param {string} [url] */
  function went(first, url) {
    if (!first && !away()) history.pushState({ ...(history.state || {}), uiTabBack: 1 }, '', url);
    else if (first && away()) history.back();   // the first tab's own entry is under this one
    else if (url !== undefined) history.replaceState(history.state, '', url);
    was = !first;
  }
  const landed = () => {
    const now = away();
    if (was && !now) onFirst();
    was = now;
  };
  events.addEventListener('popstate', landed);
  return { went, away, stop: () => events.removeEventListener('popstate', landed) };
}
