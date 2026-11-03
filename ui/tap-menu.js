// A tap menu: a short list of actions next to the button that opened it (a bar's "…", a section's "…"). The hold menu
// (hold-menu.js) lifts a preview of what was held; this one only lists, so a plain tap opens it. It uses the menu look
// (.ui-menu-layer, .ui-menu, .ui-menu-item), opens as a popover above any sheet, and Esc, a tap outside or a pick
// closes it and gives the focus back to the button.
// Opt-in extras, none on unless asked: a title over the list (`title`), items that open a list of their own (`items`:
// the menu shows that list under a Back row named after the item; Back or Esc steps out, Esc at the top closes), a bottom
// panel (`sheet`, with `note` as its first line), and class names so an app can skin the parts (`classes`).
import { icon } from '../icons/lucide.js';
import { still } from './gesture.js';

/** @typedef {{ label: string, icon?: import('../icons/lucide.js').IconNodes, color?: string, danger?: boolean, checked?: boolean,
 *   run?: () => unknown, items?: (MenuItem | null)[] }} MenuItem  items: a nested list (run is then not called); checked: a radio
 *   item; null in a list: a divider */

/** @type {(() => void) | null} */
let closeOpen = null;

/**
 * @param {HTMLElement} anchor  the button it opens from (its aria-expanded follows)
 * @param {(MenuItem | null)[]} items
 * @param {{ label?: string, title?: string, sheet?: boolean, note?: string, back?: string,
 *   classes?: { layer?: string, veil?: string, menu?: string, icon?: string } }} [o]  label: the menu's name for screen readers;
 *   title: a heading over the list; back: the words of a nested list's Back row (default "Back")
 * @returns {() => void} close
 */
export function openMenu(anchor, items, { label = '', title = '', sheet = false, note = '', back = 'Back', classes = {} } = {}) {
  closeOpen?.();
  const layer = document.createElement('div'), veil = document.createElement('div'), menu = document.createElement('div');
  layer.className = `ui-menu-layer is-open${classes.layer ? ` ${classes.layer}` : ''}`;
  veil.className = `ui-menu-veil${classes.veil ? ` ${classes.veil}` : ''}`;
  menu.className = `ui-menu${classes.menu ? ` ${classes.menu}` : ''}`;
  menu.setAttribute('role', 'menu');
  if (label || title) menu.setAttribute('aria-label', label || title);
  layer.append(veil, menu);
  /** @type {{ items: (MenuItem | null)[], title: string }[]} */
  const path = [{ items, title }];
  /** @type {HTMLButtonElement[]} */
  let buttons = [];

  /** @param {string} cls @param {string} text */
  const textEl = (cls, text) => Object.assign(document.createElement('div'), { className: cls, textContent: text });

  function draw() {
    const level = path[path.length - 1];
    menu.replaceChildren();
    buttons = [];
    if (sheet) {
      menu.classList.add('ui-menu-panel');
      const grab = document.createElement('div');
      grab.className = 'ui-menu-grab';
      menu.append(grab);
      if (note && path.length === 1) menu.append(textEl('ui-menu-note', note));
    }
    if (level.title && path.length === 1) menu.append(textEl('ui-menu-title', level.title));
    if (path.length > 1) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ui-menu-item ui-menu-back'; b.setAttribute('role', 'menuitem');
      b.append(Object.assign(document.createElement('span'), { textContent: back }));
      b.addEventListener('click', stepOut);
      menu.append(b, textEl('ui-menu-title', level.title));
      buttons.push(b);
    }
    for (const item of level.items) {
      if (!item) { menu.append(document.createElement('hr')); continue; }
      const nested = !!item.items;
      const b = document.createElement('button');
      b.type = 'button'; b.className = `ui-menu-item${item.danger ? ' ui-danger' : ''}`;
      b.setAttribute('role', item.checked === undefined ? 'menuitem' : 'menuitemradio');
      if (item.checked !== undefined) b.setAttribute('aria-checked', String(item.checked));
      if (nested) b.setAttribute('aria-haspopup', 'menu');
      b.append(Object.assign(document.createElement('span'), { textContent: item.label }));
      if (item.icon) {
        const i = icon(item.icon, { class: `ui-menu-icon${classes.icon ? ` ${classes.icon}` : ''}` });
        if (item.color) i.style.color = item.color;
        b.append(i);
      }
      b.addEventListener('click', () => {
        if (item.items) { path.push({ items: item.items, title: item.label }); draw(); place(); buttons[0]?.focus({ preventScroll: true }); return; }
        close(); void item.run?.();
      });
      menu.append(b);
      buttons.push(b);
    }
  }
  function stepOut() { if (path.length > 1) { path.pop(); draw(); place(); buttons[0]?.focus({ preventScroll: true }); } else close(); }

  // under the button, kept on screen; above it when there is no room below (a sheet is docked by its class)
  function place() {
    if (sheet) return;
    const r = anchor.getBoundingClientRect(), m = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - m.width, innerWidth - m.width - 8));
    const below = r.bottom + 6, top = below + m.height > innerHeight - 8 ? Math.max(8, r.top - m.height - 6) : below;
    menu.style.left = `${left}px`; menu.style.top = `${top}px`;
    menu.style.transformOrigin = `${r.left + r.width / 2 - left}px ${top > r.top ? 0 : m.height}px`;
  }

  draw();
  // in the top layer, inside an open sheet when it opens from one: a modal sheet leaves the rest of the page inert
  layer.popover = 'manual';
  (anchor.closest('dialog[open]') ?? document.body).append(layer);
  layer.showPopover();
  document.documentElement.classList.add('ui-menu-open');
  anchor.setAttribute('aria-expanded', 'true');
  place();

  const onKey = (/** @type {KeyboardEvent} */ e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stepOut(); return; }
    const i = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  };
  // the closed menu animates out on its own layer (CSS .is-leaving: a bottom panel sinks and fades 200 ms, a popover
  // shrinks 80 ms), which takes no input; gone on animationend, or by a timer when none comes; Still: at once
  function leave() {
    if (still() || !layer.isConnected) { layer.remove(); return; }
    layer.classList.add('is-leaving');
    layer.inert = true;
    layer.setAttribute('aria-hidden', 'true');
    layer.querySelectorAll('[role], [id]').forEach(n => { n.removeAttribute('role'); n.removeAttribute('id'); });
    const done = () => layer.remove();
    veil.addEventListener('animationend', done);
    setTimeout(done, 320);
  }
  const close = () => {
    if (closeOpen !== close) return;
    closeOpen = null;
    leave();
    document.documentElement.classList.remove('ui-menu-open');
    anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey, true);
    if (document.activeElement === document.body || !document.activeElement || layer.contains(document.activeElement)) anchor.focus({ preventScroll: true });
  };
  veil.addEventListener('pointerdown', e => { e.preventDefault(); close(); });
  document.addEventListener('keydown', onKey, true);
  closeOpen = close;
  buttons[0]?.focus({ preventScroll: true });
  return close;
}
