// The vault shell's sidebar: a side drawer (side-drawer.js) holding one of the app's views at a time, and at its foot
// the view's own tools, the view picker (a pill naming the view shown; a tap raises a card of the views from it, the
// one shown marked) and the app's footer (a slot: a name and counts, a settings gear, a sync state). The app registers
// the views (id, label, Lucide icon, render); a view is drawn the first time it shows (render may be async, so a
// view's code can be an import()), and once the drawer has opened the rest are drawn while the page is idle, so a
// switch is at once. The view shown is the app's to keep (onView).
// The picker's card closes on Back (given `steps`), Esc, a pick or a tap elsewhere in the drawer. It moves only by
// transform and opacity (the kit's glide); with less motion it fades. Styles: ui/vault/vault.css. Nothing runs on import.
import { glide } from '../motion.js';
import { still } from '../gesture.js';
import { chevronsUpDown } from '../../icons/lucide.js';
import { vaultIcon } from './icons.js';
import { sideDrawer } from './side-drawer.js';

/**
 * @typedef {import('../../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ el: HTMLElement, tools?: HTMLElement[], shown?: () => void }} SidebarView
 *   el: the view; tools: buttons in the row over the picker while it shows; shown: it has just come into sight
 * @typedef {{ id: string, label: string, icon: IconNodes, render: () => SidebarView | HTMLElement | Promise<SidebarView | HTMLElement> }} SidebarViewDef
 * @typedef {import('./side-drawer.js').SideDrawer & { drawer: import('./side-drawer.js').SideDrawer, show: (id: string) => Promise<SidebarView | null>,
 *   current: () => string, foot: HTMLElement, refresh: () => void, view: (id: string) => SidebarView | undefined }} Sidebar
 */

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag @param {Record<string, unknown>} [props] @param {...(Node | string)} kids @returns {HTMLElementTagNameMap[K]}
 */
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };

/**
 * @param {{ id: string, label: string, side?: 'left' | 'right', views: SidebarViewDef[] | (() => SidebarViewDef[]), view?: string,
 *   onView?: (id: string) => void, footer?: Node | (() => Node), steps?: import('./side-drawer.js').Steps,
 *   pushed?: () => (HTMLElement | null | undefined)[], onChange?: (open: boolean) => void, warm?: boolean, none?: string }} o
 *   id: the drawer's (the parts' ids start with it: `<id>-pill`, `<id>-views`, `<id>-view-<view id>`); views: the views
 *   on now (read each time, so a view can come and go); view: the one to show first; onView: one was picked (keep it);
 *   footer: what sits under the picker; steps: the page's createTransients(); pushed: what slides aside (the content,
 *   the pill); warm: draw the other views while idle once it opens (default true); none: the pill's words with no views
 * @returns {Sidebar}
 */
export function sidebar(o) {
  const viewsNow = () => (typeof o.views === 'function' ? o.views() : o.views);
  let want = o.view || '';
  const drawer = sideDrawer({
    id: o.id, label: o.label, side: o.side, steps: o.steps, pushed: o.pushed,
    onOpen: () => shown(),
    onChange: open => { if (!open) void closeCard(); o.onChange?.(open); },
  });
  const d = drawer.el;
  const box = el('div', { className: 'ui-vault-side-views', id: `${o.id}-views` });
  const tools = el('div', { className: 'ui-vault-side-tools', hidden: true });
  tools.setAttribute('role', 'toolbar');
  const foot = el('div', { className: 'ui-vault-side-footer' });
  if (o.footer) foot.append(typeof o.footer === 'function' ? o.footer() : o.footer);

  // ---- the picker: the pill, and the card of views that rises from it (covering it; the pill shows faint at its foot)
  const pillIcon = el('span', { className: 'ui-vault-pill-icon' });
  const pillLabel = el('span', { className: 'ui-vault-pill-label' });
  const pill = el('button', { type: 'button', id: `${o.id}-pill`, className: 'ui-vault-view-pill' }, pillIcon, pillLabel, vaultIcon(chevronsUpDown, 'ui-vault-pill-chev'));
  pill.setAttribute('aria-haspopup', 'menu');
  pill.setAttribute('aria-expanded', 'false');
  const card = el('div', { id: `${o.id}-menu`, className: 'ui-vault-view-card', hidden: true });
  card.setAttribute('role', 'menu');
  card.setAttribute('aria-label', 'Views');
  const pick = el('div', { className: 'ui-vault-pill-wrap' }, pill, card);
  d.append(el('div', { className: 'ui-vault-side-in' }, box, el('div', { className: 'ui-vault-side-foot' }, tools, pick, foot)));

  /** @type {{ readonly active: boolean, close: () => Promise<void> } | null} */
  let cardStep = null;
  const fillCard = () => {
    const now = current();
    card.replaceChildren(...viewsNow().map(def => {
      const b = el('button', { type: 'button', className: 'ui-vault-view-row', id: `${o.id}-pick-${def.id}` }, vaultIcon(def.icon), el('span', { textContent: def.label }));
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(def.id === now?.id));
      b.addEventListener('click', () => { void closeCard().then(() => { o.onView?.(def.id); return show(def.id); }); });
      return b;
    }));
    // (the pill shows faint under the list, as it stays in place)
    const ghost = el('div', { className: 'ui-vault-view-ghost' }, ...(now ? [vaultIcon(now.icon)] : []), el('span', { textContent: now?.label || '' }), vaultIcon(chevronsUpDown, 'ui-vault-pill-chev'));
    ghost.setAttribute('aria-hidden', 'true');
    card.append(ghost);
  };
  const openCard = () => {
    fillCard();
    card.hidden = false;
    pill.setAttribute('aria-expanded', 'true');
    // (it rises from the pill: a short spring, scale and fade; a fade only with less motion)
    const calm = still();
    const g = glide([[card, k => ({ opacity: String(k), transform: calm ? 'none' : `translateY(${(1 - k) * 12}px) scale(${0.96 + 0.04 * k})` })]], 0, 1, 0, { response: 0.12 });
    void g.done.then(() => { card.style.opacity = ''; card.style.transform = ''; g.stop(); });
    cardStep = o.steps ? o.steps.open(() => { cardStep = null; hideCard(); }) : null;
    /** @type {HTMLElement | null} */ (card.querySelector('[aria-checked=true]') || card.querySelector('button'))?.focus({ preventScroll: true });
  };
  const hideCard = () => { card.hidden = true; pill.setAttribute('aria-expanded', 'false'); };
  const closeCard = async () => {
    const s = cardStep;
    cardStep = null;
    hideCard();
    await s?.close();
  };
  pill.addEventListener('click', () => { if (card.hidden) openCard(); else void closeCard(); });
  d.addEventListener('pointerdown', e => {
    if (!card.hidden && !card.contains(/** @type {Node} */ (e.target)) && !pill.contains(/** @type {Node} */ (e.target))) void closeCard();
  }, true);
  card.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); void closeCard().then(() => pill.focus()); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = [...card.querySelectorAll('button')];
      const i = rows.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
      rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length]?.focus();
    }
  });
  /** the pill names this view @param {SidebarViewDef | null} def */
  const paint = def => {
    pillIcon.replaceChildren(...(def ? [vaultIcon(def.icon)] : []));
    pillLabel.textContent = def ? def.label : (o.none || 'No views');
    pill.setAttribute('aria-label', def ? `View: ${def.label}. Change view` : (o.none || 'No views'));
    pill.disabled = !def;
  };

  // ---- the views: each drawn the first time it shows
  /** @type {Map<string, Promise<SidebarView>>} */
  const made = new Map();
  /** @type {Map<string, SidebarView>} */
  const ready = new Map();
  /** the view to show: the one wanted, if it is on, else the first that is */
  const current = () => { const on = viewsNow(); return on.find(v => v.id === want) || on[0] || null; };
  /** @param {SidebarViewDef} def @returns {Promise<SidebarView>} */
  const make = def => {
    let p = made.get(def.id);
    if (!p) {
      p = Promise.resolve(def.render()).then(r => {
        const v = r instanceof HTMLElement ? { el: r } : r;
        v.el.classList.add('ui-vault-side-view');
        v.el.id ||= `${o.id}-view-${def.id}`;
        v.el.hidden = true;
        box.append(v.el);
        ready.set(def.id, v);
        return v;
      });
      made.set(def.id, p);
      p.catch(() => made.delete(def.id));
    }
    return p;
  };
  let showing = '';
  /** a view shown (it becomes the one wanted) @param {string} id */
  const show = async id => {
    const def = viewsNow().find(v => v.id === id);
    if (!def) return null;
    want = id;
    paint(def);
    const v = await make(def);
    if (current()?.id !== id) return v;   // (another was picked while it loaded)
    showing = id;
    for (const [k, other] of ready) other.el.hidden = k !== id;
    tools.replaceChildren(...(v.tools || []));
    tools.hidden = !v.tools?.length;
    tools.setAttribute('aria-label', `${def.label} tools`);
    v.shown?.();
    return v;
  };
  /** the views again (one came or went, or what they show changed): the one to show, the pill; the view shown is told
   * (its shown()) so it can draw itself again */
  const refresh = () => {
    const def = current();
    if (!def) { paint(null); tools.replaceChildren(); tools.hidden = true; for (const v of ready.values()) v.el.hidden = true; showing = ''; return; }
    if (def.id !== showing) void show(def.id); else { paint(def); ready.get(showing)?.shown?.(); }
    if (!card.hidden) fillCard();
  };
  const shown = () => {
    refresh();
    if (o.warm === false) return;
    const idle = window.requestIdleCallback || (/** @type {(f: () => void) => number} */ f => setTimeout(f, 200));
    idle(() => { for (const def of viewsNow()) void make(def); });
  };
  paint(current());

  return {
    ...drawer,
    drawer,
    show,
    current: () => current()?.id || '',
    foot,
    refresh,
    view: id => ready.get(id),
  };
}
