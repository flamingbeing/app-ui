// Arrange tabs (from the logbook's Layout and More → Edit): the person's own order of the tab bar and which tabs sit
// off it, kept by the app (one option holding { order, hidden }, usually per device). arrangeTabs is the rule (pure);
// setTabOn shows or hides one tab within it (a full bar asks which tab it replaces: replaceTab); applyTabs puts the
// bar's buttons in that order and marks the ones off it (data-off-bar: not drawn and no swipe stop, while the app's
// own hidden, such as signed out, stays the app's); tabArranger is the editor: a switch per tab, a grip to drag, Up
// and Down. Styles: ui/ui.css, "arrange tabs". Nothing runs on import.
import { el } from './dom.js';
import { LABELS } from './labels.js';
import { gripDrag, moveIn } from './drag-list.js';
import { icon, gripVertical, chevronUp, chevronDown } from '../icons/lucide.js';

/** How many tabs a phone's tab bar holds unless the app says otherwise. */
export const MAX_TABS = 5;

/**
 * @typedef {{ order: string[], hidden: string[] }} TabState  order: the tabs as the person put them (a tab it leaves
 *   out keeps its default place); hidden: the tabs off the bar
 * @typedef {{ max?: number, min?: number, fixed?: string[], offByDefault?: string[] }} TabRules  max: tabs the bar
 *   holds (default MAX_TABS); min: tabs it keeps (default 2); fixed: always on the bar and last unless moved (such as
 *   Settings, where the tabs off the bar are listed); offByDefault: off the bar until someone puts them there
 */

const ids = (/** @type {unknown} */ v) => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && /^[\w-]{1,40}$/.test(x)))].slice(0, 40) : []);

/** a saved value -> a TabState (anything else: the defaults); an option's clean @param {unknown} v @returns {TabState} */
export function cleanTabs(v) {
  const o = /** @type {any} */ (v && typeof v === 'object' ? v : {});
  return { order: ids(o.order), hidden: ids(o.hidden) };
}

/**
 * The bar as the person arranged it (pure).
 * @param {string[]} all  the tabs the app has now, in its default order
 * @param {Partial<TabState> | null | undefined} state
 * @param {TabRules} [rules]
 * @returns {{ order: string[], shown: string[], hidden: string[] }}  order: every tab; shown: on the bar; hidden: off it
 */
export function arrangeTabs(all, state, { max = MAX_TABS, min = 2, fixed = [], offByDefault = [] } = {}) {
  const s = cleanTabs(state);
  const saved = s.order.filter(id => all.includes(id));
  // a tab the saved order leaves out goes in after the saved tabs that come before it by default (a fixed one stays last)
  const at = (/** @type {string} */ id) => {
    const i = saved.indexOf(id);
    if (i >= 0) return i;
    if (fixed.includes(id)) return 1e6 + all.indexOf(id);
    const after = Math.max(-1, ...all.slice(0, all.indexOf(id)).map(x => saved.indexOf(x)));
    return after + 0.5 + all.indexOf(id) / 1e3;
  };
  const order = [...all].sort((a, b) => at(a) - at(b));
  const off = new Set([...s.hidden, ...offByDefault.filter(id => !s.order.includes(id))].filter(id => all.includes(id) && !fixed.includes(id)));
  // over the limit (an old saved value, or a new tab): the last ones in the order go off
  for (const id of [...order].reverse()) if (order.filter(k => !off.has(k)).length > max && !fixed.includes(id)) off.add(id);
  const shown = order.filter(id => !off.has(id));
  if (shown.length < Math.min(min, order.length)) return { order, shown: order.slice(0, max), hidden: order.slice(max) };
  return { order, shown, hidden: order.filter(id => off.has(id)) };
}

/**
 * Show or hide one tab (pure): the new state, or why not (too few: the bar keeps min; full: it holds max, so the
 * person picks which shown tab it replaces, then replaceTab).
 * @param {string[]} all @param {Partial<TabState> | null | undefined} state @param {string} id @param {boolean} show @param {TabRules} [rules]
 * @returns {{ state: TabState } | { tooFew: true } | { full: string[] }}  full: the tabs it could replace
 */
export function setTabOn(all, state, id, show, rules = {}) {
  const { max = MAX_TABS, min = 2, fixed = [] } = rules;
  const { order, shown, hidden } = arrangeTabs(all, state, rules);
  if (fixed.includes(id) || shown.includes(id) === show) return { state: { order, hidden } };
  if (!show) return shown.length - 1 < Math.min(min, all.length) ? { tooFew: true } : { state: { order, hidden: [...hidden, id] } };
  if (shown.length + 1 > max) return { full: shown.filter(k => !fixed.includes(k)) };
  return { state: { order, hidden: hidden.filter(k => k !== id) } };
}

/** id goes on the bar in the place of instead, which goes off it (pure). @param {string[]} all
 * @param {Partial<TabState> | null | undefined} state @param {string} id @param {string} instead @param {TabRules} [rules] @returns {TabState} */
export function replaceTab(all, state, id, instead, rules = {}) {
  const { order, hidden } = arrangeTabs(all, state, rules);
  const next = order.filter(k => k !== id);
  next.splice(next.indexOf(instead), 0, id);
  return { order: next, hidden: [...hidden.filter(k => k !== id), instead] };
}

/** One tab moved in the order (pure). @param {string[]} all @param {Partial<TabState> | null | undefined} state
 * @param {number} from @param {number} to  indexes in arrangeTabs' order @param {TabRules} [rules] @returns {TabState} */
export function moveTab(all, state, from, to, rules = {}) {
  const { order, hidden } = arrangeTabs(all, state, rules);
  return { order: moveIn(order, from, to), hidden };
}

/**
 * Put the bar's tabs in the person's order and mark the ones off it. Each tab is the bar's child with data-tab-id.
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ order: string[], shown: string[] }} arranged  from arrangeTabs
 */
export function applyTabs(bar, { order, shown }) {
  const tabs = /** @type {HTMLElement[]} */ ([...bar.querySelectorAll(':scope > [data-tab-id]')]);
  const byId = new Map(tabs.map(t => [t.dataset.tabId, t]));
  // only the ones out of place move (a moved button keeps its listeners)
  /** @type {HTMLElement | null} */
  let prev = null;
  for (const id of order) {
    const t = byId.get(id);
    if (!t) continue;
    if (prev) { if (prev.nextElementSibling !== t) prev.after(t); }
    else { const first = bar.querySelector(':scope > [data-tab-id]'); if (first && first !== t) first.before(t); }
    prev = t;
  }
  for (const [id, t] of byId) t.toggleAttribute('data-off-bar', !shown.includes(/** @type {string} */ (id)));
}

/**
 * The editor: the tabs in the bar's order, each with a grip to drag, a switch for on the bar or off it, and Up and
 * Down. A full bar asks, in place, which tab this one replaces.
 * @param {HTMLElement} host
 * @param {{ tabs: { id: string, label: string }[], get: () => Partial<TabState> | null | undefined,
 *   set: (s: TabState) => unknown, watch?: (fn: () => void) => () => void, rules?: TabRules,
 *   labels?: Record<string, string> }} o  tabs: the app's tabs now, in its default order; get and set: the saved
 *   state; watch: calls fn on a change made elsewhere (another device, Reset); labels: words over LABELS
 * @returns {() => void} stop
 */
export function tabArranger(host, { tabs, get, set, watch, rules = {}, labels = {} }) {
  const words = { ...LABELS, ...labels };
  const { max = MAX_TABS, fixed = [] } = rules;
  const all = tabs.map(t => t.id);
  const name = (/** @type {string} */ id) => tabs.find(t => t.id === id)?.label || id;
  const list = el('ul', { class: 'ui-list ui-tab-arranger', 'aria-label': words.tabsOnBar });
  const note = el('p', { class: 'ui-tab-arranger-note ui-small small', role: 'status', 'aria-live': 'polite' });
  const box = el('div', { class: 'ui-tab-arrange' }, list, note);
  /** @type {string | null} */
  let asking = null;
  const save = async (/** @type {TabState} */ s) => { asking = null; await set(s); paint(); };

  function paint() {
    const { order, shown } = arrangeTabs(all, get(), rules);
    list.replaceChildren(...order.map((id, i) => {
      const sw = el('input', { type: 'checkbox', role: 'switch', class: 'ui-switch', 'aria-label': `${words.onBar}: ${name(id)}` });
      sw.checked = shown.includes(id);
      sw.disabled = fixed.includes(id);
      sw.addEventListener('change', () => {
        const r = setTabOn(all, get(), id, sw.checked, rules);
        if ('state' in r) void save(r.state);
        else if ('tooFew' in r) { sw.checked = true; note.textContent = words.keepTabs.replace('{n}', String(rules.min ?? 2)); }
        else { asking = id; paint(); }
      });
      const grip = el('button', { type: 'button', class: 'ui-grip', 'aria-label': `${words.dragTab} ${name(id)}` }, icon(gripVertical));
      grip.addEventListener('pointerdown', e => gripDrag(e, list, (from, to) => void save(moveTab(all, get(), from, to, rules))));
      const step = (/** @type {number} */ by, /** @type {import('../icons/lucide.js').IconNodes} */ nodes, /** @type {string} */ word) => {
        const b = el('button', { type: 'button', class: 'ui-tab-step', 'aria-label': `${word}: ${name(id)}` }, icon(nodes));
        /** @type {HTMLButtonElement} */ (b).disabled = i + by < 0 || i + by >= order.length;
        b.addEventListener('click', () => void save(moveTab(all, get(), i, i + by, rules)));
        return b;
      };
      const main = el('span', { class: 'ui-row-main' }, name(id));
      if (fixed.includes(id)) main.append(el('span', { class: 'ui-row-sub' }, words.alwaysOnBar));
      const li = el('li', { class: 'ui-row ui-tab-row', 'data-tab-id': id }, grip, main, step(-1, chevronUp, words.moveUp), step(1, chevronDown, words.moveDown), sw);
      if (asking === id) {
        const r = setTabOn(all, get(), id, true, rules);
        const ask = el('div', { class: 'ui-tab-replace', role: 'group', 'aria-label': words.barFull.replace('{n}', String(max)) },
          el('span', { class: 'ui-row-sub' }, `${words.barFull.replace('{n}', String(max))} ${words.putInPlace.replace('{tab}', name(id))}`));
        for (const k of 'full' in r ? r.full : []) {
          const b = el('button', { type: 'button' }, name(k));
          b.addEventListener('click', () => void save(replaceTab(all, get(), id, k, rules)));
          ask.append(b);
        }
        const cancel = el('button', { type: 'button' }, words.cancel);
        cancel.addEventListener('click', () => { asking = null; paint(); });
        ask.append(cancel);
        li.append(ask);
      }
      return li;
    }));
    note.textContent = words.tabsHint.replace('{n}', String(max));
  }
  paint();
  const off = watch?.(paint);
  host.append(box);
  return () => { off?.(); box.remove(); };
}
