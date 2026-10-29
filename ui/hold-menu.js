// Touch and hold: [data-hold-menu="#template-id"] gets a menu from that <template> (its .ui-menu-item buttons, each
// with data-action), with a lifted copy of the element as a preview (a sheet menu names the element in its head
// instead: a copy over the list beside the sheet read as part of it). Also right-click, Android's own long press, the
// context-menu key and Shift+F10. A pick sends a "ui-menu" event (detail.action) from the element.
// A hold is HOLD_MS without moving more than SLOP; the click that comes with lifting the finger is swallowed (it
// neither opens the row nor presses a menu item); no hold from fields, dialogs, sideways scrollers or select mode.
// In a select list marked data-hold-select (.ui-list[data-select][data-hold-select]) a finger's hold (and Android's own
// long press) starts select mode with the row ticked instead, as a phone's own lists do ("ui-edit", detail.row, to the
// list); a mouse's right-click and the keys still open the row's menu.
import { HOLD_MS, SLOP, still, noGesture, haptic, listeners } from './gesture.js';

/**
 * Where the preview and the menu go (pure): the preview stays put and the menu goes under it, or above if there is no
 * room; if neither fits, the preview moves up so the menu fits under it. Left follows the finger when there is one.
 * @param {{ left: number, top: number, bottom: number, height: number }} r  the element's rect
 * @param {{ w: number, h: number }} menu @param {{ w: number, h: number }} view @param {{ x: number } | null} [at]
 * @returns {{ left: number, top: number, previewTop: number, below: boolean }}
 */
export function placeMenu(r, menu, view, at) {
  const gap = 10, edge = 16;
  let top = r.bottom + gap, previewTop = r.top;
  if (top + menu.h > view.h - edge) {
    if (r.top - gap - menu.h > edge) top = r.top - gap - menu.h;
    else { previewTop = Math.max(edge, view.h - edge - menu.h - gap - r.height); top = previewTop + r.height + gap; }
  }
  const left = Math.min(Math.max(edge, at && at.x ? at.x - menu.w / 2 : r.left), view.w - edge - menu.w);
  return { left, top, previewTop, below: top > previewTop };
}

/**
 * Where a mouse's right-click menu goes (pure): its corner at the pointer, as on a desktop; flipped left or up when it
 * would run off the screen, and kept 8 px inside it.
 * @param {{ w: number, h: number }} menu @param {{ w: number, h: number }} view @param {{ x: number, y: number }} at
 * @returns {{ left: number, top: number, below: boolean }}
 */
export function placeAtPointer(menu, view, at) {
  const edge = 8;
  const left = at.x + menu.w <= view.w - edge ? at.x : at.x - menu.w;
  const below = at.y + menu.h <= view.h - edge;
  const top = below ? at.y : at.y - menu.h;
  return { left: Math.max(edge, Math.min(left, view.w - edge - menu.w)), top: Math.max(edge, Math.min(top, view.h - edge - menu.h)), below };
}

// a look whose menus come up as a sheet (data-menu="sheet" on <html>, looks.js) shows them so on phones
export const SHEET_BELOW = 840;

/**
 * The sheet menu's place (pure): along the bottom edge, never above the top one.
 * @param {{ h: number }} menu @param {{ h: number }} view @returns {{ top: number }}
 */
export function placeSheetMenu(menu, view) {
  const edge = 8;
  return { top: Math.max(edge, view.h - edge - menu.h) };
}

/** @param {Element} el @returns {string}  the element's first words (a row's title), for a sheet menu's head */
const firstText = el => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.textContent || '').trim() ? 1 : 3 });
  return (w.nextNode()?.textContent || '').trim();
};

/**
 * Starts hold menus for every [data-hold-menu] inside root (now or added later).
 * @param {ParentNode} [root]
 * @returns {{ open: (el: HTMLElement, at?: { x: number, y: number } | null, byKey?: boolean) => void, close: () => void, stop: () => void }}
 */
export function holdMenus(root = document) {
  const l = listeners();
  const html = document.documentElement;
  /** @type {HTMLDivElement | null} */
  let layer = null;
  /** @type {HTMLElement | null} */
  let menuFor = null;
  let swallowClick = false;

  /** @param {HTMLElement} el @returns {HTMLElement | null}  the select list a finger's hold starts select mode in */
  const selectsOnHold = el => /** @type {HTMLElement | null} */ (el.closest('.ui-list[data-select][data-hold-select]'));
  /** a finger's hold on el: select mode with el ticked, or el's menu @param {HTMLElement} el @param {{ x: number, y: number } | null} at */
  const held = (el, at) => {
    const list = selectsOnHold(el);
    if (list) list.dispatchEvent(new CustomEvent('ui-edit', { detail: { row: el } }));
    else open(el, at);
  };
  /** @param {EventTarget | null} t @returns {HTMLElement | null} */
  const holdable = t => {
    const el = t instanceof Element ? /** @type {HTMLElement | null} */ (t.closest('[data-hold-menu]')) : null;
    if (!el || !(root === document || /** @type {Node} */ (root).contains(el))) return null;
    if (noGesture(t) || el.closest('.is-editing')) return null;
    return el;
  };

  function build() {
    const box = document.createElement('div');
    box.className = 'ui-menu-layer';
    const veil = document.createElement('div');
    veil.className = 'ui-menu-veil';
    // as tall as the home indicator's inset (0 without one): the sheet menu sits above it
    const safe = document.createElement('div');
    safe.className = 'ui-menu-safe';
    box.append(veil, safe);
    document.body.append(box);
    box.addEventListener('click', e => { if (!(/** @type {Element} */ (e.target).closest('.ui-menu'))) close(); });
    box.addEventListener('keydown', e => {
      const items = /** @type {HTMLElement[]} */ ([...box.querySelectorAll('.ui-menu-item:not(:disabled)')]);
      let i = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
        e.preventDefault();
        if (i < 0) i = e.key === 'ArrowDown' ? -1 : 0;
        items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
      } else if (e.key === 'Home' && items.length) { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End' && items.length) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Tab') e.preventDefault();   // the menu keeps focus until it closes
    });
    return box;
  }

  /** @param {HTMLElement} el @param {{ x: number, y: number } | null} [at] @param {boolean} [byKey] @param {boolean} [mouse]  a mouse's right-click: the menu at the pointer, the row not lifted */
  function open(el, at = null, byKey = false, mouse = false) {
    const sel = el.getAttribute('data-hold-menu');
    const tpl = sel ? document.querySelector(sel) : null;
    if (!(tpl instanceof HTMLTemplateElement)) return;
    if (!layer) layer = build();
    close(true);
    menuFor = el;
    const r = el.getBoundingClientRect();
    const sheet = html.dataset.menu === 'sheet' && innerWidth < SHEET_BELOW && !mouse;
    const copy = /** @type {HTMLElement} */ (el.cloneNode(true));
    copy.removeAttribute('id');
    copy.classList.remove('is-holding');
    copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    const preview = document.createElement('div');
    preview.className = 'ui-menu-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.inert = true;
    preview.style.left = `${r.left}px`;
    preview.style.top = `${r.top}px`;
    preview.style.width = `${r.width}px`;
    preview.append(copy);
    const menu = document.createElement('div');
    menu.className = 'ui-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 60) || 'Actions');
    menu.append(tpl.content.cloneNode(true));
    menu.querySelectorAll('.ui-menu-item').forEach(b => { b.setAttribute('role', 'menuitem'); if (b instanceof HTMLButtonElement) b.type = 'button'; });
    if (sheet) {
      const head = document.createElement('p');
      head.className = 'ui-menu-head';
      head.setAttribute('aria-hidden', 'true');   // (the menu's label says it)
      head.textContent = firstText(el);
      if (head.textContent) menu.prepend(head);
      layer.append(menu);
    } else layer.append(preview, menu);
    document.querySelectorAll('.ui-menu-layer.is-leaving').forEach(g => g.remove());   // one menu on screen at a time
    layer.classList.add('is-open');   // before measuring: a closed layer is display:none, so the menu would measure 0
    menu.classList.toggle('is-sheet', sheet);   // (before measuring: the sheet is wider)
    const view = { w: innerWidth, h: innerHeight };
    const size = { w: menu.offsetWidth, h: menu.offsetHeight };
    const p = sheet ? placeSheetMenu({ h: menu.offsetHeight }, { h: view.h - (layer.querySelector('.ui-menu-safe')?.clientHeight || 0) })
      : mouse && at ? { ...placeAtPointer(size, view, at), previewTop: r.top }
      : placeMenu(r, size, view, at);
    if ('left' in p) menu.style.left = `${p.left}px`; else menu.style.removeProperty('left');
    menu.style.top = `${p.top}px`;
    menu.style.setProperty('--ui-menu-origin', 'below' in p && !p.below ? '50% 100%' : '50% 0');
    html.classList.add('ui-menu-open');
    if ('previewTop' in p) requestAnimationFrame(() => {
      preview.style.top = `${p.previewTop}px`;
      if (!still() && !mouse) preview.classList.add('is-lifted');
    });
    menu.addEventListener('click', e => {
      const b = /** @type {Element} */ (e.target).closest('.ui-menu-item');
      if (!b || !menuFor) return;
      const action = b.getAttribute('data-action'), target = menuFor;
      close();
      target.dispatchEvent(new CustomEvent('ui-menu', { bubbles: true, detail: { action } }));
    });
    // from the keyboard focus goes to the first item; from a finger or a mouse to the menu (no ring until a key)
    menu.tabIndex = -1;
    const first = /** @type {HTMLElement | null} */ (menu.querySelector('.ui-menu-item'));
    (byKey && first ? first : menu).focus({ preventScroll: true });
  }

  // the closed menu slides (a sheet) or fades away on a layer of its own that takes no input, then goes; the real
  // layer is already closed, so a new menu can open at once
  /** @param {Element[]} nodes */
  function leave(nodes) {
    const ghost = document.createElement('div');
    ghost.className = 'ui-menu-layer is-open is-leaving';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    const veil = document.createElement('div');
    veil.className = 'ui-menu-veil';
    ghost.append(veil, ...nodes);
    // the copy on its way out is no menu: no roles or ids left for a reader, a test or the next menu to find
    ghost.querySelectorAll('[role], [id]').forEach(n => { n.removeAttribute('role'); n.removeAttribute('id'); });
    document.body.append(ghost);
    const done = () => ghost.remove();
    ghost.addEventListener('animationend', e => { if (/** @type {Element} */ (e.target).classList.contains('ui-menu-veil')) done(); });
    // (no animationend when the page is hidden): the longest leaving animation, and a little over
    setTimeout(done, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--d-quick')) || 340) * .7 + 160);
  }

  /** @param {boolean} [quiet]  true: focus stays where it is (another menu is opening) */
  function close(quiet = false) {
    if (!layer || !layer.classList.contains('is-open')) return;
    layer.classList.remove('is-open');
    html.classList.remove('ui-menu-open');
    // the lifted copy goes at once (the row is under it); the menu itself fades or sinks away
    layer.querySelectorAll('.ui-menu-preview').forEach(n => n.remove());
    const gone = [...layer.querySelectorAll('.ui-menu')];
    if (quiet || still()) gone.forEach(n => n.remove());
    else leave(gone);
    if (menuFor && !quiet) menuFor.focus({ preventScroll: true });
    menuFor = null;
  }

  // touch and pen: the hold
  let timer = 0;
  /** @type {{ x: number, y: number } | null} */
  let start = null;
  /** @type {HTMLElement | null} */
  let holding = null;
  function cancel() {
    clearTimeout(timer);
    timer = 0;
    holding?.classList.remove('is-holding');
    holding = null;
    start = null;
  }
  l.on(document, 'pointerdown', (/** @type {PointerEvent} */ e) => {
    swallowClick = false;   // a new press: forget the last hold (iOS often sends no click after a long hold)
    if (e.pointerType === 'mouse' || e.button > 0 || !e.isPrimary) { cancel(); return; }
    const el = holdable(e.target);
    if (!el) return;
    holding = el;
    start = { x: e.clientX, y: e.clientY };
    el.classList.add('is-holding');
    timer = window.setTimeout(() => {
      const target = /** @type {HTMLElement} */ (holding), at = start;
      cancel();
      haptic();   // first: on iPhone it clicks a hidden label, which must not use up swallowClick
      swallowClick = true;
      held(target, at);
    }, HOLD_MS);
  }, { passive: true });
  l.on(document, 'pointermove', (/** @type {PointerEvent} */ e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) cancel();
  }, { passive: true });
  l.on(document, 'pointerup', () => { if (timer) cancel(); }, { passive: true });
  l.on(document, 'pointercancel', cancel, { passive: true });
  l.on(window, 'scroll', () => { if (timer) cancel(); }, { passive: true });
  // lifting the finger after a hold: no mouse events, so focus stays in the menu and the row doesn't open
  l.on(document, 'touchend', (/** @type {TouchEvent} */ e) => { if (swallowClick && e.cancelable) e.preventDefault(); }, { passive: false });
  l.on(document, 'click', (/** @type {MouseEvent} */ e) => {
    if ((/** @type {Element} */ (e.target)).closest?.('.ui-haptic')) return;   // haptic()'s own click, not the lift
    if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); }
  }, true);
  // Esc closes wherever focus went
  l.on(document, 'keydown', (/** @type {KeyboardEvent} */ e) => {
    if (e.key === 'Escape' && layer?.classList.contains('is-open') && !layer.contains(/** @type {Node} */ (e.target))) { e.preventDefault(); close(); }
  });
  // right-click, Android's own long press, the context-menu key: this menu instead of the browser's
  l.on(document, 'contextmenu', (/** @type {MouseEvent} */ e) => {
    // a mouse (not Android's long press, which also sends this): the menu at the pointer
    const mouse = 'pointerType' in e ? /** @type {PointerEvent} */ (e).pointerType === 'mouse' : matchMedia('(pointer: fine)').matches;
    const t = /** @type {Element | null} */ (e.target instanceof Element ? e.target : null);
    // Android's long press on a row the hold has already put in select mode: no browser menu either
    if (!mouse && t?.closest('.is-editing[data-hold-select] [data-hold-menu]')) { e.preventDefault(); return; }
    const el = holdable(e.target);
    if (!el) return;
    e.preventDefault();
    if (!mouse && e.clientX && selectsOnHold(el)) { if (!el.closest('.is-editing')) { cancel(); swallowClick = true; held(el, null); } return; }
    if (menuFor !== el) { cancel(); open(el, e.clientX ? { x: e.clientX, y: e.clientY } : null, !e.clientX, mouse && !!e.clientX); }
  });
  l.on(document, 'keydown', (/** @type {KeyboardEvent} */ e) => {
    if (!(e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) return;
    const el = holdable(document.activeElement);
    if (el) { e.preventDefault(); open(el, null, true); }
  });
  l.on(window, 'resize', () => close(true));
  return { open, close, stop() { cancel(); close(true); l.stop(); layer?.remove(); layer = null; } };
}
