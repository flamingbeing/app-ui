// The side bar's hiding. The wide side bar (opt-in, laptop only): html[data-wide-side] at >= 840 px; adaptiveShell
// (shell.js) imports this file when both hold, or when the bar's menu button first hides the side bar from 600 px (any
// single-pane shell; then only the button below stays unseen). Its look is ui/shell/shell.css's ":root[data-wide-side]"
// block (and its "hidden by the menu button" block).
//   toggle   a 32 px button (panel-left icon) at the end of the side bar's head row (.ui-side-head; made, holding a
//            leading .ui-sidebar-name, when the page has none). It hides the side bar fully: the main column takes the
//            room and the button stays, fixed at the page's top-left. Enter or Space on it, as on any button.
//   state    kept per device: the `store` passed in ({ get(): boolean, set(v) }) or localStorage 'ui-side-hidden'
//            (sideStore, in shell.js)
//   marks    html[data-wide-ready] once loaded, html[data-side-hidden] while hidden (html[data-side-moving] while it
//            slides); the shell sends "ui-side" (detail.hidden) on each change
//   motion   about 270 ms ease-out, transform only: the side bar slides out over the page while the main column slides
//            into the room (or back), then the grid settles; reduced motion: at once
import { still } from '../gesture.js';
import { sideStore } from './shell.js';

export { SIDE_KEY, sideStore } from './shell.js';

export const SIDE_MS = 270;
const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';
const PANEL_LEFT = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>';

/** @typedef {import('./shell.js').SideStore} SideStore */

/**
 * @param {HTMLElement} shell  .ui-shell (with a nav.ui-sidebar)
 * @param {{ store?: SideStore | null }} [opts]
 * @returns {{ toggle: (hide?: boolean) => void, hidden: () => boolean, stop: () => void }}
 */
export function wideSide(shell, { store = null } = {}) {
  const html = document.documentElement;
  const keep = sideStore(store);
  const side = /** @type {HTMLElement} */ (shell.querySelector('.ui-sidebar'));
  if (!side.id) side.id = 'ui-side';
  let head = /** @type {HTMLElement | null} */ (side.querySelector('.ui-side-head'));
  if (!head) {
    head = document.createElement('div');
    head.className = 'ui-side-head';
    const name = side.firstElementChild?.classList.contains('ui-sidebar-name') ? side.firstElementChild : null;
    side.prepend(head);
    if (name) head.append(name);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ui-side-toggle';
  button.innerHTML = PANEL_LEFT;
  button.setAttribute('aria-controls', side.id);
  head.append(button);

  let hidden = keep.get();
  /** @type {Animation[]} */
  let running = [];
  function mark() {
    html.toggleAttribute('data-side-hidden', hidden);
    button.setAttribute('aria-expanded', String(!hidden));
    button.setAttribute('aria-label', hidden ? 'Show sidebar' : 'Hide sidebar');
    button.title = button.getAttribute('aria-label') ?? '';
  }
  mark();
  html.toggleAttribute('data-wide-ready', true);

  const settle = () => { for (const a of running) a.cancel(); running = []; html.removeAttribute('data-side-moving'); };
  /** the other columns (bar, screens): they slide by the side bar's width */
  const mains = () => /** @type {HTMLElement[]} */ ([...shell.children]).filter(el => el !== side && !el.classList.contains('ui-drawer-shade'));

  /** @param {boolean} [hide] */
  function toggle(hide = !hidden) {
    if (hide === hidden) return;
    settle();
    const w = side.offsetWidth || 280;
    hidden = hide;
    keep.set(hidden);
    if (!still() && side.getClientRects().length && typeof side.animate === 'function') {
      // the grid takes its new shape at once; the parts start where they were and slide to it
      if (hidden) html.setAttribute('data-side-moving', '');
      mark();
      const o = { duration: SIDE_MS, easing: EASE_OUT };
      const along = hidden ? ['translateX(0)', 'translateX(-100%)'] : ['translateX(-100%)', 'translateX(0)'];
      running = [side.animate(along.map(transform => ({ transform })), o),
        ...mains().map(el => el.animate([{ transform: `translateX(${hidden ? w : -w}px)` }, { transform: 'translateX(0)' }], o))];
      const mine = running;
      void Promise.all(mine.map(a => a.finished)).then(() => { if (running === mine) settle(); }, () => {});
    } else mark();
    shell.dispatchEvent(new CustomEvent('ui-side', { bubbles: true, detail: { hidden } }));
  }
  const click = () => toggle();
  button.addEventListener('click', click);

  return {
    toggle,
    hidden: () => hidden,
    stop() {
      settle();
      button.removeEventListener('click', click);
      button.remove();
      html.removeAttribute('data-side-hidden');
      html.removeAttribute('data-wide-ready');
    },
  };
}
