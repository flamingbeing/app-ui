// The vault shell's full-screen settings: a grey sheet nearly the screen's height that rises over the app. Each page
// has a header (a Back arrow, its title in the middle, a close X, in white circles) over white cards of rows that scroll
// under it. The root has a search across every row, then the app's cards: an "Options" card of rows with icons that
// open pages, and (say) a card of the optional modules' own pages; a page of toggles for the optional modules is an
// ordinary page whose rows have a title, a description, a gear (a sub-page of its options, shown while it is on) and a
// switch. The app supplies the pages and their rows; a row is a link to a page, a switch, the app's own control, a pill
// button or a value.
// A page slides in from the right over the one before (a history step each, given `steps`, the page's
// createTransients). Its Back (the arrow, the phone's Back, a swipe right anywhere on it) slides it away; the X, Esc
// or a drag down on the root's header closes the whole sheet. The scroll area keeps touch-action: pan-y, so a sideways
// finger stays the page's swipe, not the browser's. Moves only by transform and opacity, on the kit's spring (glide)
// and drag; with less motion it shows and goes. Styles: ui/vault/vault.css. Nothing runs on import.
import { drag, glide } from '../motion.js';
import { still } from '../gesture.js';
import { arrowLeft, chevronRight, chevronsUpDown, search as searchIcon, settings as gearIcon, x } from '../../icons/lucide.js';
import { vaultIcon } from './icons.js';
import { shadeEl } from './shade.js';

/**
 * @typedef {import('../../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ id?: string, label: string, sub?: string, keywords?: string, shown?: () => boolean }} RowBase
 *   id: the control's (a link's button, a switch's input; default made from the sheet's id); sub: a second line;
 *   keywords: more words the search finds it by; shown: read each time the page is drawn (default shown)
 * @typedef {RowBase & { go: string, icon?: IconNodes, hint?: string }} GoRow  opens page `go` (its icon, else the page's)
 * @typedef {RowBase & { toggle: { get: () => boolean, set: (on: boolean) => unknown }, gear?: string }} ToggleRow
 *   a switch; set may throw or reject (the switch shows get() again, the words say why); gear: a page of its options,
 *   its gear shown while the switch is on
 * @typedef {RowBase & { choice: { options: [string, string][], get: () => string, set: (value: string) => unknown } }} ChoiceRow
 *   one of a few (a pill with chevrons under the words: the browser's own picker); options: [value, words]; set as a
 *   switch's
 * @typedef {RowBase & { control: () => HTMLElement, under?: boolean }} ControlRow  the app's own control, at the end
 *   of the row or under its words
 * @typedef {RowBase & { button: { text: string, run: () => unknown, danger?: boolean } }} ButtonRow  a pill button under the words
 * @typedef {RowBase & { value: string | (() => string) }} ValueRow  words at the end (read only)
 * @typedef {GoRow | ToggleRow | ChoiceRow | ControlRow | ButtonRow | ValueRow} SettingsRow
 * @typedef {{ title?: string, sub?: string, rows: SettingsRow[] }} SettingsCard  title: a heading over the card
 * @typedef {{ id: string, title: string, icon?: IconNodes, cards: SettingsCard[] | (() => SettingsCard[]), shown?: () => boolean }} SettingsPage
 *   cards: read each time the page is drawn; shown: whether its rows are found by the search (default yes)
 * @typedef {{ el: HTMLDialogElement, open: () => void, close: () => Promise<void>, go: (page: string) => Promise<void>,
 *   back: () => Promise<void>, refresh: () => void, isOpen: () => boolean, top: () => string,
 *   say: (text: string, bad?: boolean) => void, destroy: () => void }} SettingsSheet
 * @typedef {{ id: string, el: HTMLElement, x: number, v: number, step: { readonly active: boolean, close: () => Promise<void> } | null, from: string }} Shown
 */

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag @param {Record<string, unknown>} [props] @param {...(Node | string | null | undefined | false)} kids
 * @returns {HTMLElementTagNameMap[K]}
 */
const el = (tag, props = {}, ...kids) => {
  const e = /** @type {HTMLElementTagNameMap[K]} */ (Object.assign(document.createElement(tag), props));
  e.append(.../** @type {(Node | string)[]} */ (kids.filter(k => k !== null && k !== undefined && k !== false)));
  return e;
};
const PARALLAX = 0.3;   // how far the page under moves while one slides over it (of the width)
const ROOT = 'root';

/**
 * @param {{ id?: string, title?: string, root: SettingsCard[] | (() => SettingsCard[]), pages: SettingsPage[],
 *   steps?: import('./side-drawer.js').Steps, search?: boolean | { placeholder?: string, none?: string },
 *   closeLabel?: string, onClose?: () => void }} o
 *   id: the dialog's (default ui-vault-settings; the parts' ids start with it); title: the root's (default
 *   Settings); root: the root's cards, under the search; pages: every page a row can open; steps: the page's
 *   createTransients() (without it, Back leaves it be); search: the root's search box (default on), its words;
 *   closeLabel: the X's name; onClose: it has closed
 * @returns {SettingsSheet}
 */
export function settingsSheet(o) {
  const sid = o.id || 'ui-vault-settings';
  const rootTitle = o.title || 'Settings';
  const words = typeof o.search === 'object' ? o.search : {};
  const byId = new Map(o.pages.map(p => [p.id, p]));
  const d = /** @type {HTMLDialogElement} */ (el('dialog', { id: sid, className: 'ui-vault-set' }));
  const status = el('p', { className: 'ui-vault-set-status', id: `${sid}-status` });
  status.setAttribute('role', 'status');
  document.body.append(d);
  /** @type {(() => void)[]} the drags' stops */
  const stops = [];

  let said = 0;
  /** words at the foot for a moment (a change refused, say) @param {string} text @param {boolean} [bad] */
  const say = (text, bad = false) => {
    status.textContent = text;
    status.classList.toggle('is-bad', bad);
    clearTimeout(said);
    if (text) said = window.setTimeout(() => { status.textContent = ''; }, 4000);
  };

  // ---- the rows
  /** @param {string} pageId @param {string} at */
  const autoId = (pageId, at) => `${sid}-${pageId}-${at}`;
  /** @param {string} label @param {string | undefined} sub @param {string} [forId] */
  const text = (label, sub, forId) => {
    const name = forId ? el('label', { className: 'ui-vault-set-name', htmlFor: forId, textContent: label }) : el('span', { className: 'ui-vault-set-name', textContent: label });
    return el('div', { className: 'ui-vault-set-text' }, name, sub ? el('div', { className: 'ui-vault-set-sub', textContent: sub }) : null);
  };
  /** @param {Node} words @param {Node | null} control @param {boolean} [under] */
  const line = (words, control, under = false) => el('div', { className: `ui-vault-set-row${under ? ' is-under' : ''}` }, words, control);
  /** @param {SettingsRow} r @param {string} pageId @param {string} at @returns {HTMLElement} */
  const rowEl = (r, pageId, at) => {
    const cid = r.id || autoId(pageId, at);
    if ('go' in r) {
      const icon = r.icon || byId.get(r.go)?.icon;
      const b = el('button', { type: 'button', className: 'ui-vault-set-nav', id: r.id || `${sid}-go-${r.go}` },
        icon ? vaultIcon(icon) : null,
        r.sub ? el('span', { className: 'ui-vault-set-nav-two' }, el('span', { className: 'ui-vault-set-nav-label', textContent: r.label }), el('span', { className: 'ui-vault-set-sub', textContent: r.sub }))
          : el('span', { className: 'ui-vault-set-nav-label', textContent: r.label }),
        r.hint ? el('span', { className: 'ui-vault-set-hint', textContent: r.hint }) : null,
        vaultIcon(chevronRight, 'ui-vault-set-more'));
      b.addEventListener('click', () => void push(r.go, b.id));
      return b;
    }
    if ('toggle' in r) {
      const t = r.toggle;
      const sw = /** @type {HTMLInputElement} */ (el('input', { type: 'checkbox', id: cid, className: 'ui-vault-toggle', checked: t.get() }));
      sw.setAttribute('role', 'switch');
      const row = line(text(r.label, r.sub, cid), null);
      /** @type {HTMLButtonElement | null} */
      let gear = null;
      if (r.gear && byId.has(r.gear)) {
        const to = r.gear;
        gear = el('button', { type: 'button', className: 'ui-vault-set-gear', id: `${sid}-gear-${to}`, hidden: !t.get() }, vaultIcon(gearIcon));
        gear.setAttribute('aria-label', `${r.label} options`);
        gear.addEventListener('click', () => void push(to, /** @type {HTMLButtonElement} */ (gear).id));
        row.append(gear);
      }
      row.append(sw);
      sw.addEventListener('change', async () => {
        try { await t.set(sw.checked); say(''); }
        catch (e) { say(e instanceof Error ? e.message : String(e), true); }
        sw.checked = t.get();
        if (gear) gear.hidden = !sw.checked;
      });
      return row;
    }
    if ('choice' in r) {
      const c = r.choice;
      const pick = /** @type {HTMLSelectElement} */ (el('select', { id: cid, className: 'ui-vault-set-select' }));
      for (const [v, w] of c.options) pick.add(new Option(w, v));
      pick.value = c.get();
      pick.addEventListener('change', async () => {
        try { await c.set(pick.value); say(''); }
        catch (e) { say(e instanceof Error ? e.message : String(e), true); }
        pick.value = c.get();
      });
      return line(text(r.label, r.sub, cid), el('div', { className: 'ui-vault-set-drop' }, pick, vaultIcon(chevronsUpDown, 'ui-vault-set-chev')), true);
    }
    if ('control' in r) {
      const c = r.control();
      return line(text(r.label, r.sub, c.id && /^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) ? c.id : undefined), c, !!r.under);
    }
    if ('button' in r) {
      const bt = r.button;
      const b = el('button', { type: 'button', id: cid, className: `ui-vault-set-pill${bt.danger ? ' is-danger' : ''}`, textContent: bt.text });
      b.setAttribute('aria-label', `${bt.text}: ${r.label}`);
      b.addEventListener('click', () => void bt.run());
      return line(text(r.label, r.sub), b, true);
    }
    const v = typeof r.value === 'function' ? r.value() : r.value;
    return line(text(r.label, r.sub), el('span', { className: 'ui-vault-set-value', textContent: v }));
  };
  /** @param {SettingsRow} r */
  const isShown = r => !r.shown || r.shown();
  /** a page's cards, drawn into its scroll area @param {HTMLElement} scroll @param {SettingsCard[]} cards @param {string} pageId */
  const fill = (scroll, cards, pageId) => {
    scroll.replaceChildren(...cards.map((c, ci) => {
      const rows = c.rows.map((r, ri) => ({ r, at: `${ci}-${ri}` })).filter(({ r }) => isShown(r));
      if (!rows.length) return null;
      const card = el('div', { className: 'ui-vault-set-card' }, ...rows.map(({ r, at }) => { const n = rowEl(r, pageId, at); n.dataset.row = at; return n; }));
      if (c.title) card.setAttribute('aria-label', c.title);
      card.setAttribute('role', 'group');
      return el('section', { className: 'ui-vault-set-group' },
        c.title ? el('h3', { className: 'ui-vault-set-h', textContent: c.title }) : null,
        c.sub ? el('p', { className: 'ui-vault-set-h-sub', textContent: c.sub }) : null, card);
    }).filter(/** @returns {n is HTMLElement} */ n => !!n));
  };

  // ---- the pages: a header over a scroll area
  /** @param {string} id @param {string} title @param {boolean} isRoot */
  const frame = (id, title, isRoot) => {
    const heading = el('h2', { className: 'ui-vault-set-title', id: `${sid}-title-${id}`, textContent: title, tabIndex: -1 });
    const shut = el('button', { type: 'button', className: 'ui-vault-set-circle', id: isRoot ? `${sid}-close` : '' }, vaultIcon(x));
    shut.setAttribute('aria-label', o.closeLabel || 'Close settings');
    shut.addEventListener('click', () => void close());
    let backBtn = null;
    if (!isRoot) {
      backBtn = el('button', { type: 'button', className: 'ui-vault-set-circle ui-vault-set-back' }, vaultIcon(arrowLeft));
      backBtn.setAttribute('aria-label', 'Back');
      backBtn.addEventListener('click', () => void back());
    }
    const head = el('div', { className: 'ui-vault-set-head' }, backBtn || el('span'), heading, shut);
    const scroll = el('div', { className: 'ui-vault-set-scroll' });
    const pageEl = el('section', { className: 'ui-vault-set-page', hidden: !isRoot }, head, scroll);
    pageEl.dataset.page = id;
    pageEl.setAttribute('aria-labelledby', heading.id);
    d.append(pageEl);
    return { pageEl, head, scroll };
  };
  /** @type {Map<string, { pageEl: HTMLElement, scroll: HTMLElement, draw: () => void }>} */
  const made = new Map();
  /** a page, made the first time it opens @param {string} id */
  const pageOf = id => {
    let p = made.get(id);
    const def = byId.get(id);
    if (!p && def) {
      const f = frame(id, def.title, false);
      const draw = () => fill(f.scroll, typeof def.cards === 'function' ? def.cards() : def.cards, id);
      p = { pageEl: f.pageEl, scroll: f.scroll, draw };
      made.set(id, p);
      swipeBack(f.pageEl);
    }
    return p;
  };

  // ---- the root: the search, then the app's cards
  const root = frame(ROOT, rootTitle, true);
  const q = /** @type {HTMLInputElement} */ (el('input', { type: 'search', id: `${sid}-q`, className: 'ui-vault-set-q', placeholder: words.placeholder || 'Search settings…', autocomplete: 'off', spellcheck: false }));
  q.setAttribute('aria-label', 'Search settings');
  const searchBox = el('label', { className: 'ui-vault-set-search', hidden: o.search === false }, vaultIcon(searchIcon), q);
  const results = el('div', { className: 'ui-vault-set-card ui-vault-set-results', id: `${sid}-results`, hidden: true });
  results.setAttribute('role', 'group');
  results.setAttribute('aria-label', 'Settings found');
  const none = el('p', { className: 'ui-vault-set-none', textContent: words.none || 'No setting matches', hidden: true });
  const menu = el('div', { className: 'ui-vault-set-menu' });
  root.scroll.append(searchBox, results, none, menu);
  const drawRoot = () => fill(menu, typeof o.root === 'function' ? o.root() : o.root, ROOT);
  made.set(ROOT, { pageEl: root.pageEl, scroll: root.scroll, draw: drawRoot });

  /** every row a search can find, with its page @returns {{ page: SettingsPage | null, row: SettingsRow, at: string }[]} */
  const allRows = () => {
    /** @type {{ page: SettingsPage | null, row: SettingsRow, at: string }[]} */
    const out = [];
    /** @param {SettingsPage | null} page @param {SettingsCard[]} cards */
    const add = (page, cards) => cards.forEach((c, ci) => c.rows.forEach((row, ri) => { if (isShown(row)) out.push({ page, row, at: `${ci}-${ri}` }); }));
    add(null, typeof o.root === 'function' ? o.root() : o.root);
    for (const p of o.pages) if (!p.shown || p.shown()) add(p, typeof p.cards === 'function' ? p.cards() : p.cards);
    return out;
  };
  /** a row a search found: its page opened at the row, which flashes @param {string} pageId @param {string} at @param {string} from */
  const jump = async (pageId, at, from) => {
    if (pageId !== ROOT) await push(pageId, from);
    const hit = /** @type {HTMLElement | null} */ (made.get(pageId)?.scroll.querySelector(`[data-row="${at}"]`) || null);
    if (!hit) return;
    hit.scrollIntoView({ block: 'center' });
    hit.classList.add('is-flash');
    setTimeout(() => hit.classList.remove('is-flash'), 1200);
  };
  const find = () => {
    const want = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    menu.hidden = !!want.length;
    if (!want.length) { results.hidden = true; none.hidden = true; results.replaceChildren(); return; }
    const hits = allRows().filter(({ row }) => { const hay = `${row.label} ${row.sub || ''} ${row.keywords || ''}`.toLowerCase(); return want.every(w => hay.includes(w)); });
    results.replaceChildren(...hits.map(({ page, row, at }, i) => {
      const icon = page?.icon || ('go' in row ? row.icon || byId.get(row.go)?.icon : undefined);
      const b = el('button', { type: 'button', className: 'ui-vault-set-nav is-hit', id: `${sid}-hit-${i}` }, icon ? vaultIcon(icon) : null,
        el('span', { className: 'ui-vault-set-nav-two' }, el('span', { className: 'ui-vault-set-nav-label', textContent: row.label }),
          el('span', { className: 'ui-vault-set-sub', textContent: page ? page.title : rootTitle })),
        vaultIcon(chevronRight, 'ui-vault-set-more'));
      b.addEventListener('click', () => {
        if (!page && 'go' in row) void push(row.go, b.id);
        else void jump(page ? page.id : ROOT, at, b.id);
      });
      return b;
    }));
    results.hidden = !hits.length;
    none.hidden = !!hits.length;
  };
  q.addEventListener('input', find);
  d.append(status);

  // ---- the stack of pages: the root, then each page over the one before
  /** @type {Shown[]} */
  const stack = [{ id: ROOT, el: root.pageEl, x: 0, v: 0, step: null, from: '' }];
  const width = () => d.getBoundingClientRect().width || innerWidth;
  /** @type {ReturnType<typeof glide> | null} */
  let slideRun = null;
  /** the top page `x` px from its place, the page under it moved a little the other way @param {Shown} top @param {Shown | undefined} under @param {number} at */
  const place = (top, under, at) => {
    top.x = at;
    top.el.style.transform = at > 0.5 ? `translateX(${at}px)` : '';
    if (under) under.el.style.transform = at < width() - 0.5 ? `translateX(${-PARALLAX * (width() - at)}px)` : '';
  };
  /** @param {Shown} top @param {Shown | undefined} under @param {number} to @param {number} [v] */
  const slide = async (top, under, to, v = 0) => {
    slideRun?.stop();
    slideRun = null;
    if (still()) { place(top, under, to); return; }
    const w = width();
    /** @type {[Element, (at: number) => Keyframe][]} */
    const parts = [[top.el, at => ({ transform: `translateX(${at}px)` })]];
    if (under) parts.push([under.el, at => ({ transform: `translateX(${-PARALLAX * (w - at)}px)` })]);
    const g = glide(parts, top.x, to, v);
    slideRun = g;
    await g.done;
    if (slideRun === g) { slideRun = null; place(top, under, to); g.stop(); }
  };
  const named = () => d.setAttribute('aria-labelledby', `${sid}-title-${stack[stack.length - 1].id}`);
  /** a page over the one showing (a history step: Back takes it away) @param {string} id @param {string} [from]  the id of what opened it */
  async function push(id, from = '') {
    const p = pageOf(id);
    if (!p || !d.open || closing || stack.some(s => s.id === id)) return;
    const under = stack[stack.length - 1];
    /** @type {Shown} */
    const top = { id, el: p.pageEl, x: width(), v: 0, step: null, from };
    stack.push(top);
    p.draw();
    p.pageEl.hidden = false;
    p.pageEl.inert = false;
    p.scroll.scrollTop = 0;
    place(top, under, top.x);
    named();
    if (o.steps) top.step = o.steps.open(() => { top.step = null; void pop(top); });
    /** @type {HTMLElement} */ (p.pageEl.querySelector('.ui-vault-set-title')).focus({ preventScroll: true });
    await slide(top, under, 0);
    if (stack[stack.length - 1] === top) { under.el.inert = true; under.el.hidden = true; }
  }
  /** a page away (its history step already gone: Back, the arrow, a swipe) @param {Shown} top */
  async function pop(top) {
    const i = stack.indexOf(top);
    if (i < 1) return;
    stack.splice(i, 1);
    const under = stack[i - 1];
    // (drawn again: a switch on the page above may have brought a row in or taken one away)
    if (!closing) made.get(under.id)?.draw();
    if (under.id === ROOT && q.value.trim()) find();
    under.el.hidden = false;
    under.el.inert = false;
    named();
    if (!closing && d.open) { place(top, under, top.x); await slide(top, under, width(), top.v); }
    top.el.hidden = true;
    top.el.style.transform = '';
    top.v = 0;
    under.el.style.transform = '';
    if (!closing && top.from) document.getElementById(top.from)?.focus({ preventScroll: true });
  }
  /** Back from the page on top: its history step taken back (which slides it away) */
  const back = async () => {
    const top = stack[stack.length - 1];
    if (stack.length < 2) return;
    if (top.step?.active) await top.step.close(); else await pop(top);
  };
  /** a swipe right on a page: it follows the finger, and past a third (or flicked) it goes Back @param {HTMLElement} pageEl */
  function swipeBack(pageEl) {
    stops.push(drag(pageEl, {
      axis: 'x', name: 'back',
      filter: e => !(/** @type {Element} */ (e.target).closest?.('input, select, textarea, [data-no-swipe]')),
      start: () => {
        const top = stack[stack.length - 1], under = stack[stack.length - 2];
        if (top.el !== pageEl || !under) return 0;
        slideRun?.stop();
        slideRun = null;
        under.el.hidden = false;
        return top.x;
      },
      move: at => { const top = stack[stack.length - 1]; if (top.el === pageEl) place(top, stack[stack.length - 2], Math.max(0, at)); },
      end: (at, v) => {
        const top = stack[stack.length - 1], under = stack[stack.length - 2];
        if (top.el !== pageEl || !under) return;
        if (at > width() / 3 || v > 0.5) { top.v = v; void back(); }
        else void slide(top, under, 0, v).then(() => { if (stack[stack.length - 1] === top) under.el.hidden = true; });
      },
      bounds: () => [0, width()],
    }));
  }

  // ---- the sheet: up from the bottom, down to close (the shade behind it fades with it)
  let sy = 0;
  /** @type {ReturnType<typeof glide> | null} */
  let sheetRun = null;
  const height = () => d.getBoundingClientRect().height || innerHeight;
  /** @param {number} at */
  const sheetPut = at => {
    sy = at;
    d.style.transform = at > 0.5 ? `translateY(${at}px)` : '';
    shadeEl().style.opacity = String(Math.max(0, 1 - at / height()));
  };
  /** @param {number} to @param {number} [v] */
  const sheetMove = async (to, v = 0) => {
    const from = sheetRun ? sheetRun.stop() : sy;
    sheetRun = null;
    if (still()) { sheetPut(to); return; }
    const hh = height();
    const g = glide([[d, at => ({ transform: `translateY(${Math.max(0, at)}px)` })], [shadeEl(), at => ({ opacity: String(Math.max(0, 1 - at / hh)) })]], from, to, v);
    sheetRun = g;
    await g.done;
    if (sheetRun === g) { sheetRun = null; sheetPut(to); g.stop(); }
  };
  stops.push(drag(root.head, {
    axis: 'y', mouse: true, name: 'sheet',
    start: () => { const at = sheetRun ? sheetRun.stop() : sy; sheetRun = null; sheetPut(at); return at; },
    move: at => sheetPut(Math.max(0, at)),
    end: (at, v) => { if (at > height() / 3 || v > 0.5) void close(v); else void sheetMove(0, v); },
    bounds: () => [0, height()],
  }));

  /** @type {{ readonly active: boolean, close: () => Promise<void> } | null} */
  let rootStep = null;
  let closing = false;
  /** @type {Promise<void> | null} */
  let shut = null;
  /** every page off the stack, the root alone */
  const restack = () => {
    for (const s of stack.splice(1)) { s.el.hidden = true; s.el.style.transform = ''; s.step = null; }
    root.pageEl.hidden = false;
    root.pageEl.inert = false;
    root.pageEl.style.transform = '';
    named();
  };
  /** down and closed (the steps already gone) @param {number} [v] */
  const hide = (v = 0) => (shut ||= (async () => {
    closing = true;
    if (d.open) await sheetMove(height(), v);
    if (d.open) d.close();
    shadeEl().classList.remove('is-on');
    restack();
    closing = false;
    shut = null;
    o.onClose?.();
  })());
  /** closed: the pages' steps and the sheet's taken back, newest first, then down it goes @param {number} [v] */
  async function close(v = 0) {
    if (!d.open) return;
    if (shut) return shut;
    closing = true;
    for (const s of [...stack.slice(1).reverse().map(t => t.step), rootStep]) if (s?.active) await s.close();
    rootStep = null;
    await hide(v);
  }
  const open = () => {
    if (d.open && !shut) return;
    closing = false;
    restack();
    q.value = '';
    find();
    say('');
    drawRoot();
    shadeEl().classList.add('is-on');
    if (!d.open) d.showModal();
    sheetPut(height());
    rootStep = o.steps ? o.steps.open(() => { rootStep = null; void hide(); }) : null;
    root.scroll.scrollTop = 0;
    /** @type {HTMLElement} */ (root.pageEl.querySelector('.ui-vault-set-title')).focus({ preventScroll: true });
    void sheetMove(0);
  };
  d.addEventListener('cancel', e => { e.preventDefault(); void close(); });
  // closed from outside (another screen taking over): its steps go too, nothing moves
  d.addEventListener('close', () => {
    if (shut) return;
    closing = true;
    void (async () => {
      for (const s of [...stack.slice(1).reverse().map(t => t.step), rootStep]) if (s?.active) await s.close();
      rootStep = null;
      shadeEl().classList.remove('is-on');
      sheetPut(0);
      restack();
      closing = false;
      o.onClose?.();
    })();
  });
  /** every page on the stack drawn again, the focus kept on the same control */
  const refresh = () => {
    if (!d.open) return;
    const at = /** @type {HTMLElement | null} */ (document.activeElement)?.id;
    for (const s of stack) made.get(s.id)?.draw();
    if (q.value.trim()) find();
    if (at) document.getElementById(at)?.focus({ preventScroll: true });
  };
  const destroy = () => { stops.splice(0).forEach(s => s()); if (d.open) d.close(); d.remove(); };
  return {
    el: d, open, close, back, refresh, say, destroy,
    go: async id => { if (!d.open) open(); await push(id); },
    isOpen: () => d.open && !shut,
    top: () => stack[stack.length - 1].id,
  };
}
