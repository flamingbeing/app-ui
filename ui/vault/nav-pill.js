// The vault shell's navigation pill: a frosted pill floating over the bottom of the page, with the app's buttons in
// the order it gives them. Known slots come with their Lucide icon and words: back, forward, search, add (+), tabs (a
// small box holding the open tabs' count) and menu; any other slot needs its own icon and label. The app runs each
// tap (handlers given), says which buttons have somewhere to go (can: a button that can't is faint, says
// aria-disabled and ignores taps, but keeps its place) and sets the tabs count.
// While the on-screen keyboard is up (the kit's keyboard watch: html.ui-keyboard-open, startGestures starts it) the
// pill fades and drops out of the way and can't be tapped (inert); it comes back as the keyboard goes.
// Styles: ui/vault/vault.css (light and dark, frosted, no ring). Nothing runs on import.
import { chevronLeft, chevronRight, menu, plus, search } from '../../icons/lucide.js';
import { vaultIcon } from './icons.js';

/**
 * @typedef {import('../../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ slot: string, run: () => unknown, id?: string, label?: string, icon?: IconNodes, count?: number }} NavButton
 *   slot: back, forward, search, add, tabs, menu, or the app's own name; id: default `<pill id>-<slot>`; label: the
 *   button's name (a known slot has one); icon: a known slot has one; count: the tabs slot's starting count
 * @typedef {{ el: HTMLElement, button: (slot: string) => HTMLButtonElement | undefined, can: (slot: string, ok: boolean) => void,
 *   count: (n: number) => void, destroy: () => void }} NavPill
 */

/** @type {Record<string, { icon?: IconNodes, label: string }>} */
const SLOTS = {
  back: { icon: chevronLeft, label: 'Back' },
  forward: { icon: chevronRight, label: 'Forward' },
  search: { icon: search, label: 'Search' },
  add: { icon: plus, label: 'New tab' },
  tabs: { label: 'Open tabs' },
  menu: { icon: menu, label: 'Menu' },
};

/**
 * @param {{ buttons: NavButton[], id?: string, label?: string, parent?: HTMLElement, tabsLabel?: (n: number) => string }} o
 *   buttons: the pill's buttons, in order; id: the pill's (default ui-vault-nav); label: its landmark name (default
 *   Navigation); parent: where it goes (default body); tabsLabel: the tabs button's name for a count (default "Open
 *   tabs: n")
 * @returns {NavPill}
 */
export function navPill({ buttons, id = 'ui-vault-nav', label = 'Navigation', parent = document.body, tabsLabel = n => `Open tabs: ${n}` }) {
  const nav = document.createElement('nav');
  nav.id = id;
  nav.className = 'ui-vault-nav';
  nav.setAttribute('aria-label', label);
  /** @type {Map<string, HTMLButtonElement>} */
  const bySlot = new Map();
  /** @type {HTMLElement | null} */
  let countBox = null;
  /** @type {HTMLButtonElement | null} */
  let tabsBtn = null;
  for (const want of buttons) {
    const known = SLOTS[want.slot] || { label: want.slot };
    const b = Object.assign(document.createElement('button'), { type: 'button', id: want.id || `${id}-${want.slot}`, className: 'ui-vault-nav-btn' });
    b.dataset.slot = want.slot;
    b.setAttribute('aria-label', want.label || known.label);
    const nodes = want.icon || known.icon;
    if (want.slot === 'tabs' && !want.icon) {
      countBox = Object.assign(document.createElement('span'), { className: 'ui-vault-count' });
      countBox.setAttribute('aria-hidden', 'true');
      b.append(countBox);
      tabsBtn = b;
    } else if (nodes) b.append(vaultIcon(nodes));
    b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') want.run(); });
    bySlot.set(want.slot, b);
    nav.append(b);
  }
  /** @param {number} n */
  const count = n => {
    if (!countBox || !tabsBtn) return;
    countBox.textContent = String(n);
    tabsBtn.setAttribute('aria-label', tabsLabel(n));
  };
  const start = buttons.find(b => b.slot === 'tabs');
  count(start?.count ?? 1);
  /** @param {string} slot @param {boolean} ok */
  const can = (slot, ok) => {
    const b = bySlot.get(slot);
    if (!b) return;
    b.toggleAttribute('data-faint', !ok);
    b.setAttribute('aria-disabled', String(!ok));
  };

  // the keyboard up: the pill steps aside and can't be tapped
  const html = document.documentElement;
  const keyboard = () => { nav.inert = html.classList.contains('ui-keyboard-open'); };
  html.addEventListener('ui-keyboard', keyboard);
  keyboard();
  parent.append(nav);
  return {
    el: nav,
    button: slot => bySlot.get(slot),
    can,
    count,
    destroy: () => { html.removeEventListener('ui-keyboard', keyboard); nav.remove(); },
  };
}
