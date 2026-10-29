// The shell gallery: the plants list in the adaptive shell. window.kit (the started parts) and window.shell are for the tests.
import { startGestures, adaptiveShell, toaster, cardPager } from '../../ui/index.js';
import { galleryPreview } from '../preview.js';

galleryPreview();   // ?look=, ?density=, ?edge= as on the other gallery pages

// the tabs are pages of this one (ui/tab-pages.js); ?tab=rooms opens on another one (for the tests and screenshots)
const tab = new URLSearchParams(location.search).get('tab');
if (tab && document.getElementById(tab)?.classList.contains('ui-tab-page')) {
  for (const t of document.querySelectorAll('[data-tab-page]')) {
    if (t.getAttribute('data-tab-page') === `#${tab}`) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
}

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
let prevMissing = 0;   // the swipe hook without a drawer (?drawer=off): an app would do something of its own here
// a right swipe on the first tab pulls the side bar out as a drawer, with the finger
const pulls = new URLSearchParams(location.search).get('drawer') !== 'off';
const kit = startGestures(document, {
  drawer: pulls ? () => shell.drawer : undefined,
  onPrevMissing: () => { prevMissing++; document.documentElement.dataset.prevMissing = String(prevMissing); },
});
const toasts = toaster(document.body);
const list = $('plants');
const shell = adaptiveShell(/** @type {HTMLElement} */ (document.querySelector('.ui-shell')), { screens: kit.screens });
Object.assign(window, { kit, shell });

const count = () => { $('count-side').textContent = String(list.querySelectorAll('.ui-row').length); };
/** Delete with Undo (no "are you sure?" for something that can be put back) @param {HTMLElement[]} rows */
function remove(rows) {
  const kept = rows.map(r => ({ r, next: r.nextElementSibling }));
  rows.forEach(r => r.remove());
  count();
  toasts.show(rows.length === 1 ? `Deleted ${rows[0].dataset.name}` : `Deleted ${rows.length} plants`, {
    ms: 6000,
    action: { label: 'Undo', run: () => { for (const { r, next } of kept.reverse()) list.insertBefore(r, next && list.contains(next) ? next : null); count(); } },
  });
}
list.addEventListener('ui-menu', e => {
  const row = /** @type {HTMLElement} */ (e.target), { action } = /** @type {CustomEvent} */ (e).detail;
  if (action === 'select') list.dispatchEvent(new CustomEvent('ui-edit', { detail: { row } }));
  else if (action === 'delete') remove([row]);
});
$('delete-selected').addEventListener('click', () => {
  const rows = kit.selects.get('plants')?.selected() || [];
  kit.selects.get('plants')?.setEditing(false);
  if (rows.length) remove(rows);
});
$('compare').addEventListener('click', () => {
  toasts.show(`Comparing ${(kit.selects.get('plants')?.selected() || []).map(r => r.dataset.name).join(' and ')}`);
});
// the detail repeats the row's actions as buttons
$('delete-one').addEventListener('click', () => {
  const row = shell.current();
  if (!row) return;
  const was = shell.size() === 'phone';
  remove([row]);
  if (was) kit.screens?.pop();
});
$('water').addEventListener('click', () => toasts.show(`Watered ${shell.current()?.dataset.name ?? ''}`));
// the bar's Select only on the list's screen (phone)
document.addEventListener('ui-screen', e => {
  const home = /** @type {CustomEvent} */ (e).detail.top.id === 'home';
  document.querySelectorAll('.ui-bar [data-edit-for]').forEach(b => { /** @type {HTMLElement} */ (b).hidden = !home; });
  if (!home) kit.selects.get('plants')?.setEditing(false);
});

// a deck of five cards on the Jobs page (ui/card-pager.js): a sideways swipe for the next or the previous; it fills
// the page down to the tab bar
const TIPS = ['Water the basil from below', 'Mist the orchid, never soak its crown', 'Turn the fig a quarter each week',
  'Feed the lavender in spring only', 'Prune the rosemary after it flowers'];
const cards = cardPager($('job-cards'), {
  card: i => {
    if (i < 0 || i >= TIPS.length) return null;
    const c = document.createElement('article');
    c.className = 'ui-card kit-card';
    c.innerHTML = `<h3 class="ui-card-title">Tip ${i + 1} of ${TIPS.length}</h3><p class="ui-card-text"></p>`;
    /** @type {HTMLElement} */ (c.querySelector('p')).textContent = TIPS[i];
    return c;
  },
  onShow: i => { $('job-cards').dataset.shown = String(i); },
  fill: true,
});
Object.assign(window, { cards });
