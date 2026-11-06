// The vault shell gallery: a made-up field journal on ui/vault/ (imported here and nowhere else in the kit, as an app
// opts in). The pill's Back and Forward walk the pages seen (this page's own list, not the browser's), Search picks a
// page (a picker: radio rows), + opens a new tab, the count box lists the open tabs (each with its own close button),
// Menu is the app's menu (ticks, a chevron, a disabled row with a hint); the dots are the page's menu (a Close row at
// the start, ticks, a red Delete). The page's first Back says "Press Back again to close" (tabBack's guard, as an
// app's first tab has it); a sheet closed by Back, Esc or a tap never does. window.kit holds the parts, for the tests.
import { startGestures, createTransients, tabBack, toaster, CLOSE_MS, LABELS } from '../../ui/index.js';
import { navPill, menuSheet, vaultIcon, vaultStyles } from '../../ui/vault/index.js';
import { plus, trash2, x } from '../../icons/lucide.js';
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
let bookmarked = false;
let sort = 'Name';

const show = () => {
  const name = seen[at];
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
      { id: 'pm-bookmark', icon: I.bookmark, label: 'Bookmark', ticked: bookmarked, run: () => { bookmarked = !bookmarked; } },
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
    { rows: [{ id: 'am-settings', icon: I.settings, label: 'Settings', run: () => toasts.show('Settings (made up)') }] },
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
$('more').append(vaultIcon(I.ellipsisVertical));
$('more').addEventListener('click', () => pageMenu.open());

await vaultStyles();
show();
document.documentElement.dataset.vaultReady = '';
Object.assign(window, { kit: { gestures: kit, steps, guard, pill, sheets: { pageMenu, appMenu, sortSheet, pick, tabsSheet } } });
