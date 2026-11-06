// The vault shell gallery: a made-up field journal on ui/vault/ (imported here and nowhere else in the kit, as an app
// opts in). The pill's Back and Forward walk the pages seen (this page's own list, not the browser's), Search picks a
// page (a picker: radio rows), + opens a new tab, the count box lists the open tabs (each with its own close button),
// Menu is the app's menu (ticks, a chevron, a disabled row with a hint); the dots are the page's menu (a Close row at
// the start, ticks, a red Delete). The left sidebar (its button, or a swipe right on the page) shows Pages, Search and
// (with the Bookmarks module on) Bookmarks, the journal's name and a Settings gear at its foot; the right one (a swipe
// left) the page's Outline and (with Page info on) its counts. Settings: General, Appearance, Modules (a switch per
// module, a gear for its options) and About, with a search over every row. The page's first Back says "Press Back
// again to close" (tabBack's guard, as an app's first tab has it); a sheet, sidebar or the settings closed by Back,
// Esc or a tap never does. window.kit holds the parts, for the tests.
import { startGestures, createTransients, tabBack, toaster, CLOSE_MS, LABELS } from '../../ui/index.js';
import { navPill, menuSheet, sidebar, loadSettingsSheet, vaultIcon, vaultStyles } from '../../ui/vault/index.js';
import { info, plus, search, settings as gear, trash2, x } from '../../icons/lucide.js';
import { galleryPreview } from '../preview.js';
import { PAGE_ICONS as I } from './icons.js';

galleryPreview();

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const PAGES = {
  'Fern walk': 'Hart’s-tongue along the wall, lady fern by the stream, and a clump of royal fern past the bridge.',
  'Moss garden': 'Cushion moss on the north stones; the haircap is browning in the dry corner.',
  'Oak grove': 'Acorns early this year. Jays busy in the canopy; oak apples on the low branches.',
  'Pond edge': 'Flag iris in flower, water mint by the steps, and the first damselflies.',
  'Heather hill': 'Bell heather out before the ling; bilberry thick under the birches.',
};
const NAMES = /** @type {(keyof typeof PAGES)[]} */ (Object.keys(PAGES));

const kit = startGestures(document);
const steps = createTransients({ history, location, events: window });
const toasts = toaster(document.body);
// the page's first Back stays and says so, as an app's first tab does (tabBack's guard)
const guard = tabBack({ history, events: window, onFirst: () => {}, onClose: () => toasts.show(LABELS.backAgain, { ms: CLOSE_MS }) });

// ---- state: the pages seen (Back and Forward), the open tabs, the page's views
/** @type {string[]} */
let seen = ['Fern walk'];
let at = 0;
/** @type {string[]} */
let tabs = ['Fern walk'];
let active = 0;
let reading = false;
/** @type {Set<string>} the pages bookmarked */
const marks = new Set();
let sort = 'Name';
// the made-up settings: the optional modules, and a few options
const modules = { bookmarks: true, daily: false, info: true };
const prefs = { openLast: true, textSize: 'regular', dateFormat: 'iso', dailyOnStart: false };

const show = () => {
  const name = seen[at];
  if (right.isOpen()) right.refresh();
  tabs[active] = name;
  $('page-title').textContent = name;
  $('page-body').textContent = PAGES[/** @type {keyof typeof PAGES} */ (name)] ?? '';
  pill.can('back', at > 0);
  pill.can('forward', at < seen.length - 1);
  pill.count(tabs.length);
  document.documentElement.toggleAttribute('data-reading', reading);
};
/** a page opened from the picker or a tab: a new step (the steps after it are gone) @param {string} name */
const go = name => { if (seen[at] === name) return; seen = [...seen.slice(0, at + 1), name]; at++; show(); };

// ---- the sheets
const pageMenu = menuSheet({
  id: 'page-menu', label: 'More options', steps, close: { at: 'start' },
  cards: () => [
    { title: 'Views', rows: [
      { id: 'pm-read', icon: I.bookOpen, label: 'Reading view', ticked: reading, run: () => { reading = !reading; show(); } },
      { id: 'pm-bookmark', icon: I.bookmark, label: 'Bookmark', ticked: marks.has(seen[at]), run: () => { if (!marks.delete(seen[at])) marks.add(seen[at]); left.refresh(); } },
    ] },
    { title: 'File', rows: [
      { id: 'pm-rename', icon: I.pencilLine, label: 'Rename…', run: () => toasts.show('Rename asked (made up)') },
      { id: 'pm-move', icon: I.folderInput, label: 'Move to…', run: () => toasts.show('Move asked (made up)') },
      { id: 'pm-copy', icon: I.link, label: 'Copy link', run: () => toasts.show('Link copied (made up)') },
      { id: 'pm-share', icon: I.arrowUpRight, label: 'Share', run: () => toasts.show('Shared (made up)') },
    ] },
    { rows: [{ id: 'pm-delete', icon: trash2, label: 'Delete page', danger: true, run: () => toasts.show('Deleted (made up)') }] },
  ],
});
const appMenu = menuSheet({
  id: 'app-menu', label: 'Menu', steps, close: true,
  cards: () => [
    { rows: [
      { id: 'am-search', icon: I.file, label: 'Go to page', run: () => pick.open() },
      { id: 'am-random', icon: I.dices, label: 'Open a random page', run: () => go(NAMES[Math.floor(Math.random() * NAMES.length)]) },
      { id: 'am-sort', icon: I.bookmark, label: 'Sort pages', hint: sort, next: true, run: () => sortSheet.open() },
    ] },
    { title: 'Extras', rows: [
      { id: 'am-sync', icon: I.link, label: 'Sync now', disabled: true, hint: 'Offline' },
    ] },
    { rows: [{ id: 'am-settings', icon: I.settings, label: 'Settings', run: () => openSettings() }] },
  ],
});
const sortSheet = menuSheet({
  id: 'sort-sheet', label: 'Sort pages', heading: 'Sort pages', steps,
  cards: () => [{ title: 'Sort by', rows: ['Name', 'Last changed', 'Created'].map((s, i) => ({ id: `sort-${i}`, label: s, radio: sort === s, run: () => { sort = s; } })) }],
});
const pick = menuSheet({
  id: 'go-sheet', label: 'Go to page', heading: 'Go to page', steps,
  cards: () => [{ title: 'Pages', rows: NAMES.map((n, i) => ({ id: `go-${i}`, icon: I.file, label: n, radio: seen[at] === n, run: () => go(n) })) }],
});
const tabsSheet = menuSheet({
  id: 'tabs-sheet', label: () => `${tabs.length} open tabs`, heading: () => (tabs.length === 1 ? '1 tab' : `${tabs.length} tabs`), steps,
  cards: () => [
    { title: 'Tabs', rows: tabs.map((n, i) => ({ id: `tab-${i}`, icon: I.file, label: n, sub: 'Field journal', ticked: i === active,
      run: () => { active = i; go(n); show(); },
      aside: { id: `tab-close-${i}`, icon: x, label: `Close ${n}`, run: () => closeTab(i) } })) },
    { rows: [
      { id: 'tabs-new', icon: plus, label: 'New tab', run: () => newTab() },
      { id: 'tabs-close-all', icon: x, label: 'Close all', run: () => { tabs = [seen[at]]; active = 0; show(); } },
    ] },
  ],
});
/** a tab closed (never the last): the tab beside it shows @param {number} i */
const closeTab = i => {
  if (tabs.length === 1) return;
  tabs.splice(i, 1);
  if (i < active || active >= tabs.length) active = Math.max(0, active - 1);
  const now = tabs[active];
  if (seen[at] !== now) go(now); else show();
};

/** a new tab beside this one, showing the same page */
const newTab = () => { tabs.splice(active + 1, 0, seen[at]); active++; show(); };

// ---- the pill
const pill = navPill({
  id: 'vault-nav',
  buttons: [
    { slot: 'back', run: () => { if (at > 0) { at--; show(); } } },
    { slot: 'forward', run: () => { if (at < seen.length - 1) { at++; show(); } } },
    { slot: 'search', label: 'Go to page', run: () => pick.open() },
    { slot: 'add', run: () => newTab() },
    { slot: 'tabs', run: () => tabsSheet.open() },
    { slot: 'menu', run: () => appMenu.open() },
  ],
});
// ---- the sidebars: the app's views, drawn the first time each shows
/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag @param {Record<string, unknown>} [props] @param {...(Node | string)} kids @returns {HTMLElementTagNameMap[K]}
 */
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
const pushed = () => [$('head'), $('page'), pill.el];
/** a row that opens a page (and shuts the sidebar first, its Back step with it) @param {string} n @param {string} id */
const pageRow = (n, id) => {
  const b = el('button', { type: 'button', className: `kit-vault-row${n === seen[at] ? ' is-on' : ''}`, id }, vaultIcon(I.file), el('span', { textContent: n }));
  b.addEventListener('click', async () => { await left.leave(); go(n); });
  return b;
};
const pagesView = () => {
  const box = el('div', { className: 'kit-vault-list' });
  let reversed = false;
  const order = el('button', { type: 'button', id: 'left-order' }, vaultIcon(I.arrowUpDown));
  order.setAttribute('aria-label', 'Reverse the order');
  order.setAttribute('aria-pressed', 'false');
  const draw = () => box.replaceChildren(...(reversed ? [...NAMES].reverse() : NAMES).map((n, i) => pageRow(n, `left-page-${i}`)));
  order.addEventListener('click', () => { reversed = !reversed; order.setAttribute('aria-pressed', String(reversed)); draw(); });
  draw();
  return { el: box, tools: [order], shown: draw };
};
const searchView = () => {
  const q = /** @type {HTMLInputElement} */ (el('input', { type: 'search', id: 'left-q', className: 'kit-vault-filter', placeholder: 'Search pages', autocomplete: 'off' }));
  q.setAttribute('aria-label', 'Search pages');
  const found = el('div', { className: 'kit-vault-list', id: 'left-found' });
  const draw = () => {
    const w = q.value.trim().toLowerCase();
    const hits = NAMES.filter(n => !w || `${n} ${PAGES[n]}`.toLowerCase().includes(w));
    found.replaceChildren(...(hits.length ? hits.map((n, i) => pageRow(n, `left-hit-${i}`)) : [el('p', { className: 'kit-vault-none', textContent: 'No pages match' })]));
  };
  q.addEventListener('input', draw);
  draw();
  return { el: el('div', {}, q, found), shown: draw };
};
const marksView = () => {
  const box = el('div', { className: 'kit-vault-list' });
  const draw = () => box.replaceChildren(...(marks.size ? [...marks].map((n, i) => pageRow(n, `left-mark-${i}`)) : [el('p', { className: 'kit-vault-none', textContent: 'No bookmarks yet' })]));
  draw();
  return { el: box, shown: draw };
};
const footName = el('span', {});
const leftGear = el('button', { type: 'button', id: 'left-gear', className: 'kit-vault-gear' }, vaultIcon(gear));
leftGear.setAttribute('aria-label', 'Settings');
leftGear.addEventListener('click', async () => { await left.leave(); await openSettings(); });
const left = sidebar({
  id: 'left', label: 'Left sidebar', steps, pushed, view: 'pages',
  views: () => [
    { id: 'pages', label: 'Pages', icon: I.folder, render: pagesView },
    { id: 'search', label: 'Search', icon: search, render: searchView },
    ...(modules.bookmarks ? [{ id: 'bookmarks', label: 'Bookmarks', icon: I.bookmark, render: marksView }] : []),
  ],
  footer: el('div', { className: 'kit-vault-foot' }, el('div', { className: 'kit-vault-foot-name' }, el('strong', { textContent: 'Field journal' }), footName), leftGear),
  onChange: open => {
    const b = $('side-left');
    b.setAttribute('aria-expanded', String(open));
    b.setAttribute('aria-label', open ? 'Close the left sidebar' : 'Open the left sidebar');
    footName.textContent = `${NAMES.length} pages, ${marks.size} bookmarked`;
  },
});
const outlineView = () => {
  const box = el('ul', { className: 'kit-vault-list', id: 'right-outline' });
  box.setAttribute('aria-label', 'Outline');
  const draw = () => box.replaceChildren(...(PAGES[/** @type {keyof typeof PAGES} */ (seen[at])] || '').split(/[,;.] ?(?:and )?/).filter(Boolean)
    .map(t => el('li', { className: 'kit-vault-row' }, vaultIcon(I.listTree), el('span', { textContent: t }))));
  draw();
  return { el: box, shown: draw };
};
const infoView = () => {
  const box = el('div', { id: 'right-info' });
  const draw = () => {
    const t = PAGES[/** @type {keyof typeof PAGES} */ (seen[at])] || '';
    box.replaceChildren(el('h3', { className: 'kit-vault-view-title', textContent: seen[at] }),
      el('p', { className: 'kit-vault-stat' }, el('span', { textContent: 'Words' }), el('span', { textContent: String(t.split(/\s+/).filter(Boolean).length) })),
      el('p', { className: 'kit-vault-stat' }, el('span', { textContent: 'Characters' }), el('span', { textContent: String(t.length) })));
  };
  draw();
  return { el: box, shown: draw };
};
const right = sidebar({
  id: 'right', label: 'Right sidebar', side: 'right', steps, pushed, view: 'outline',
  views: () => [
    { id: 'outline', label: 'Outline', icon: I.listTree, render: outlineView },
    ...(modules.info ? [{ id: 'info', label: 'Page info', icon: info, render: infoView }] : []),
  ],
  onChange: open => {
    const b = $('side-right');
    b.setAttribute('aria-expanded', String(open));
    b.setAttribute('aria-label', open ? 'Close the right sidebar' : 'Open the right sidebar');
  },
});
// a swipe on the page opens one (not from the screen's edges: those are the phone's Back)
const free = () => !document.querySelector('dialog:modal');
left.swipeFrom($('page'), { can: free });
right.swipeFrom($('page'), { can: free });
$('side-left').append(vaultIcon(I.panelLeft));
$('side-left').addEventListener('click', () => void left.toggle());
$('side-right').append(vaultIcon(I.panelRight));
$('side-right').addEventListener('click', () => void right.toggle());

// ---- the settings: loaded the first time they open
/** @type {Promise<import('../../ui/vault/settings-sheet.js').SettingsSheet> | null} */
let settingsMade = null;
/** a module switched on or off: the sidebars' views follow @param {keyof typeof modules} k */
const moduleSwitch = k => ({ get: () => modules[k], set: (/** @type {boolean} */ on) => { modules[k] = on; left.refresh(); right.refresh(); } });
const openSettings = async () => {
  settingsMade ||= loadSettingsSheet().then(settingsSheet => settingsSheet({
    id: 'settings', steps,
    root: () => [
      { title: 'Options', rows: [
        { go: 'general', label: 'General' },
        { go: 'appearance', label: 'Appearance' },
        { go: 'modules', label: 'Modules' },
        { go: 'about', label: 'About' },
      ] },
      { title: 'Module options', rows: [{ go: 'daily', label: 'Daily pages', shown: () => modules.daily }] },
    ],
    pages: [
      { id: 'general', title: 'General', icon: I.wrench, cards: [
        { rows: [
          { id: 'opt-open-last', label: 'Open the last page', sub: 'At the start, the page that was open when you left.', toggle: { get: () => prefs.openLast, set: on => { prefs.openLast = on; } } },
          { id: 'opt-sync', label: 'Sync with the cloud', sub: 'Keeps the journal the same on every device.', keywords: 'account', toggle: { get: () => false, set: () => { throw new Error('Sign in first to sync (made up)'); } } },
          { label: 'Journal', value: 'Field journal', sub: () => `${NAMES.length} pages, counted as it is drawn` },
          // (a second copy of a module's switch: the search finds only the one on Modules)
          { id: 'opt-info-2', label: 'Page info', sub: 'Also on Modules.', find: false, toggle: moduleSwitch('info') },
        ] },
        { title: 'Your pages', rows: [
          { id: 'opt-export', label: 'Export', sub: 'Every page as a Markdown file.', button: { text: 'Export pages', run: () => toasts.show('Exported (made up)') } },
          { id: 'opt-clear', label: 'Clear the journal', sub: 'Moves every page to the bin.', button: { text: 'Clear', danger: true, run: () => toasts.show('Cleared (made up)') } },
        ] },
      ] },
      { id: 'appearance', title: 'Appearance', icon: I.palette, cards: [
        { rows: [
          { id: 'opt-text-size', label: 'Text size', keywords: 'font', choice: { options: [['regular', 'Regular'], ['large', 'Large']], get: () => prefs.textSize,
            set: v => { prefs.textSize = v; document.documentElement.dataset.textSize = v; } } },
          { id: 'opt-reading', label: 'Open pages in reading view', toggle: { get: () => reading, set: on => { reading = on; show(); } } },
        ] },
      ] },
      { id: 'modules', title: 'Modules', icon: I.toyBrick, cards: [
        { title: 'Optional modules', sub: 'Parts of the journal you can turn off.', rows: [
          { id: 'opt-bookmarks', label: 'Bookmarks', sub: 'Pages you keep at hand, in the left sidebar.', toggle: moduleSwitch('bookmarks') },
          { id: 'opt-daily', label: 'Daily pages', sub: 'A page for each day.', gear: 'daily', toggle: moduleSwitch('daily') },
          { id: 'opt-info', label: 'Page info', sub: 'Words and characters, in the right sidebar.', keywords: 'count', toggle: moduleSwitch('info') },
        ] },
      ] },
      { id: 'daily', title: 'Daily pages', icon: I.calendar, shown: () => modules.daily, cards: [
        { rows: [
          { id: 'opt-date-format', label: 'Date format', choice: { options: [['iso', '2026-11-06'], ['long', '6 November 2026']], get: () => prefs.dateFormat, set: v => { prefs.dateFormat = v; } } },
          { id: 'opt-daily-start', label: 'Open today\u2019s page at the start', toggle: { get: () => prefs.dailyOnStart, set: on => { prefs.dailyOnStart = on; } } },
        ] },
      ] },
      { id: 'about', title: 'About', icon: info, cards: [
        { rows: [{ label: 'Version', value: '1.0 (made up)' }, { label: 'Pages', value: () => String(NAMES.length) }] },
        // (a bare row: the app's control is the whole row; drawn: called once it is on the page)
        { title: 'Made with', rows: [{ label: 'Made with', keywords: 'credits', bare: true,
          control: () => Object.assign(document.createElement('p'), { id: 'about-credits', className: 'kit-credits', textContent: 'The kit, Lucide icons and a lot of tea.' }),
          drawn: row => { row.dataset.drawn = String(row.isConnected); } }] },
      ] },
    ],
  }));
  (await settingsMade).open();
};

$('more').append(vaultIcon(I.ellipsisVertical));
$('more').addEventListener('click', () => pageMenu.open());

await vaultStyles();
show();
document.documentElement.dataset.vaultReady = '';
Object.assign(window, { kit: { gestures: kit, steps, guard, pill, sheets: { pageMenu, appMenu, sortSheet, pick, tabsSheet }, left, right,
  settings: () => settingsMade, openSettings, modules } });
