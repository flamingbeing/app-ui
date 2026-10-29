// Steps back that a part makes itself (a sheet or the drawer closed by a tap, not by Back): each one is a
// history.back() that lands later (WebKit: much later). A page pushed, or a sheet opened, before it lands would be
// undone by it: the step lands on the newer entry. So the steps on their way are counted; whoever pushes waits on
// stepsSettled() first, and parts ignore the popstates these steps make (ourStep()).

let backs = 0;
/** @type {Promise<void> | null} */
let backing = null;
/** @type {(() => void) | null} */
let landed = null;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let lost;
let ours = false;   // the popstate being handled is one of the steps
// (added on import, before any part's own popstate listener: it must run first)
if (typeof window !== 'undefined') window.addEventListener('popstate', () => {
  ours = backs > 0;
  if (ours && --backs === 0) done();
  setTimeout(() => { ours = false; });
}, true);
const done = () => { backs = 0; clearTimeout(lost); backing = null; const r = landed; landed = null; r?.(); };

/** One step back, counted. */
export function stepBack() {
  if (!backing) backing = new Promise(r => { landed = r; });
  backs++;
  clearTimeout(lost); lost = setTimeout(done, 1000);   // never landed (no history here)
  try { history.back(); } catch { done(); }
}
/** Resolves once every step back on its way has landed: push after it. @returns {Promise<void>} */
export const stepsSettled = () => backing || Promise.resolve();
/** Whether steps are on their way (push only after stepsSettled()). */
export const stepping = () => backing !== null;
/** Whether the popstate being handled is one of these steps (read it in a popstate listener). */
export const ourStep = () => ours;
