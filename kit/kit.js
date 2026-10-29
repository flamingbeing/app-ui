// The gallery: starts every gesture part on the page's made-up plants, signed out. Relative imports, so the page needs
// no import map. ?edge=always turns the edge swipe on outside the iPhone home-screen app (for tests and desktops);
// ?look= and ?density= preview without keeping (preview.js; the switcher on the page keeps a pick on this device),
// ?guard=again reruns the glass guard. window.kit is the started parts, for the tests.
import { startGestures, toaster, syncChip, syncButton, LABELS } from '../ui/index.js';
import { chooseTheme, themeChoice, lookSwitch } from '../theme/index.js';
import { galleryPreview } from './preview.js';

const shown = galleryPreview();
lookSwitch(/** @type {HTMLElement} */ (document.getElementById('kit-looks')), () => {
  // a pick is kept and replaces the link's preview: the address loses ?look= and ?density=
  const url = new URL(location.href);
  url.searchParams.delete('look'); url.searchParams.delete('density');
  history.replaceState(history.state, '', url);
});
for (const k of /** @type {const} */ (['look', 'density'])) {
  const pick = /** @type {HTMLSelectElement | null} */ (document.getElementById(`${k}-pick`));
  if (pick) pick.value = shown[k];
}

// the other tabs are the same page (the gallery has one list); the tab bar shows which was picked
const tab = new URLSearchParams(location.search).get('tab');
for (const a of /** @type {NodeListOf<HTMLAnchorElement>} */ (document.querySelectorAll('a.ui-tab'))) {
  const t = a.dataset.tab;
  if (t) a.href = `?tab=${t}`;
  if ((t || null) === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
}

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const kit = startGestures();
/** @type {any} */ (window).kit = kit;
const toasts = toaster(document.body);
const list = $('plants');

// the sync chip on a made-up sync: the picker plays each state an app's sync module reports (a count where it has one)
/** @type {Set<(st: { state: string, count: number }) => void>} */
const listeners = new Set();
const COUNTS = /** @type {Record<string, number>} */ ({ pending: 3, offline: 2, 'at-risk': 1 });
const fakeSync = { status$(/** @type {(st: { state: string, count: number }) => void} */ cb) {
  listeners.add(cb); cb({ state: 'synced', count: 0 }); return () => listeners.delete(cb);
} };
const syncPick = /** @type {HTMLSelectElement} */ ($('sync-pick'));
for (const state of ['synced', 'pending', 'offline', 'attention', 'unknown', 'at-risk']) syncPick.add(new Option(LABELS[state], state));
syncPick.addEventListener('change', () => { for (const cb of listeners) cb({ state: syncPick.value, count: COUNTS[syncPick.value] || 0 }); });
syncChip($('sync-host'), { sync: /** @type {any} */ (fakeSync) });
// its tappable twin for a header bar: a tap here only counts (window.syncTaps); an app's default is nudge then flush
/** @type {any} */ (window).syncTaps = 0;
syncButton($('sync-host'), { sync: /** @type {any} */ (fakeSync), syncNow: () => { /** @type {any} */ (window).syncTaps++; } });

// Still: this device only, off until picked
const stillBox = /** @type {HTMLInputElement} */ ($('still'));
stillBox.checked = themeChoice().motion === 'still';
stillBox.addEventListener('change', () => chooseTheme({ motion: stillBox.checked ? 'still' : 'auto' }));
// Haptics: this device only, on until turned off
const hapticsBox = /** @type {HTMLInputElement} */ ($('haptics'));
hapticsBox.checked = themeChoice().haptics !== 'off';
hapticsBox.addEventListener('change', () => chooseTheme({ haptics: hapticsBox.checked ? 'on' : 'off' }));

/** @param {HTMLElement} row */
function openRow(row) {
  $('detail-title').textContent = row.dataset.name || 'Details';
  $('detail-text').textContent = row.querySelector('.ui-row-sub')?.textContent || '';
  kit.screens?.push('#detail', row);
}
/** Delete with Undo (no "are you sure?" for something that can be put back) @param {HTMLElement[]} rows */
function remove(rows) {
  const kept = rows.map(r => ({ r, next: r.nextElementSibling }));
  rows.forEach(r => r.remove());
  toasts.show(rows.length === 1 ? `Deleted ${rows[0].dataset.name}` : `Deleted ${rows.length} plants`, {
    ms: 6000,
    action: { label: 'Undo', run: () => { for (const { r, next } of kept.reverse()) list.insertBefore(r, next && list.contains(next) ? next : null); } },
  });
}

list.addEventListener('click', e => {
  const row = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.ui-row'));
  if (row) openRow(row);
});
list.addEventListener('keydown', e => {
  const row = /** @type {Element} */ (e.target).closest('.ui-row');
  if (e.key === 'Enter' && row && !list.classList.contains('is-editing')) openRow(/** @type {HTMLElement} */ (row));
});
list.addEventListener('ui-menu', e => {
  const row = /** @type {HTMLElement} */ (e.target), { action } = /** @type {CustomEvent} */ (e).detail;
  if (action === 'open') openRow(row);
  else if (action === 'select') list.dispatchEvent(new CustomEvent('ui-edit', { detail: { row } }));
  else if (action === 'delete') remove([row]);
});
$('delete-selected').addEventListener('click', () => {
  const rows = kit.selects.get('plants')?.selected() || [];
  kit.selects.get('plants')?.setEditing(false);
  if (rows.length) remove(rows);
});
$('compare').addEventListener('click', () => {
  const names = (kit.selects.get('plants')?.selected() || []).map(r => r.dataset.name);
  toasts.show(`Comparing ${names.join(' and ')}`);
});
// the bar's Select only on the list's screen
document.addEventListener('ui-screen', e => {
  const home = /** @type {CustomEvent} */ (e).detail.top.id === 'home';
  $('select').hidden = !home;
  if (!home) kit.selects.get('plants')?.setEditing(false);
});
