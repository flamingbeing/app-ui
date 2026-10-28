// The reference parts gallery: the undo toast, the loading and error states and the About sheet, on made-up data.
// ?look= and ?density= preview as on the other gallery pages (preview.js). The fake update api and import map stand in for an app's.
import { toaster, undoToast, loadState, aboutSheet, draftSlot, gripDrag, moveIn, shareText, copyText, createTransients,
  applyHidden, cleanHideList, keptBecause, targetOf, entryFor, hideKey } from '../../ui/index.js';
import { icon, gripVertical } from '../../icons/lucide.js';
import { galleryPreview } from '../preview.js';

galleryPreview();
const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

// undo toast: delete a row, Undo puts it back where it was
const fruit = $('fruit');
for (const name of ['Apple', 'Pear', 'Plum', 'Fig']) {
  const row = document.createElement('li');
  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'Delete';
  row.dataset.name = name;
  row.append(name, del);
  fruit.append(row);
}
const undo = undoToast(toaster(document.body));
fruit.addEventListener('click', e => {
  const row = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('li:has(> button)'));
  if (!row || !/** @type {Element} */ (e.target).closest('button')) return;
  const next = row.nextElementSibling;
  row.remove();
  undo.show(`Deleted ${row.dataset.name}`, () => fruit.insertBefore(row, next && fruit.contains(next) ? next : null));
});

// loading and error: Load shows skeleton rows then the list; Fail shows the error and Retry loads again
const state = loadState($('load-host'), { rows: 3 });
const loaded = $('loaded');
let runs = 0;
/** @param {boolean} ok */
function run(ok) {
  loaded.hidden = true;
  state.loading();
  const mine = ++runs;
  setTimeout(() => {
    if (mine !== runs) return;   // a newer load has begun
    if (!ok) { state.failed('Could not load the list.', () => run(true)); return; }
    state.done();
    loaded.replaceChildren(...['Rose', 'Tulip'].map(n => Object.assign(document.createElement('li'), { textContent: n })));
    loaded.hidden = false;
  }, 600);
}
$('load-run').addEventListener('click', () => run(true));
$('load-fail').addEventListener('click', () => run(false));

// about: a fake update api
let checks = 0;
const update = { versionLabel: async () => '1.2.3', checkNow: async () => ++checks % 2 === 0, retryUpdate: () => {} };
const importMap = { imports: { 'demo-markdown': 'https://example.invalid/demo-markdown@4.2.1/index.js', 'demo-zip': 'https://example.invalid/demo-zip@1.0.0/zip.mjs', './own/': './own/' } };
$('about-open').addEventListener('click', () => { void aboutSheet({ name: 'Demo app', update, importMap, licences: { 'demo-markdown': 'MIT', 'demo-zip': 'MIT' } }); });

// drafts: what is typed is kept per document; a reload finds it again (the slot is taken over, not copied)
const draftText = /** @type {HTMLTextAreaElement} */ ($('draft-text'));
const slot = draftSlot('kit-parts', 'demo', { move: true });
if (typeof slot.initial === 'string') { draftText.value = slot.initial; $('draft-state').textContent = 'Draft restored.'; }
draftText.addEventListener('input', () => {
  try { slot.save(draftText.value); $('draft-state').textContent = 'Draft kept on this device.'; }
  catch { $('draft-state').textContent = 'Could not keep the draft: storage is blocked.'; }
});
$('draft-send').addEventListener('click', () => { slot.clear(); draftText.value = ''; $('draft-state').textContent = 'Sent. Draft cleared.'; });

// drag to reorder: grab the grip; moveIn gives the new order
let order = ['Apple', 'Pear', 'Plum', 'Fig'];
const dragList = $('drag-list');
function drawOrder() {
  dragList.replaceChildren(...order.map(name => {
    const row = document.createElement('li');
    const grip = document.createElement('span');
    grip.className = 'ui-grip';
    grip.setAttribute('role', 'img');
    grip.setAttribute('aria-label', `Move ${name}`);
    grip.append(icon(gripVertical));
    grip.addEventListener('pointerdown', e => gripDrag(e, dragList, (from, to) => { order = moveIn(order, from, to); drawOrder(); }));
    row.append(name, grip);
    return row;
  }));
  $('drag-order').textContent = `Order: ${order.join(', ')}`;
}
drawOrder();

// share out: the system sheet where there is one, else the clipboard
const notes = toaster(document.body);
$('share-send').addEventListener('click', () => { void shareText('Fruit list: Apple, Pear, Plum, Fig', { title: 'Fruit', toasts: notes }); });
$('share-copy').addEventListener('click', () => { void copyText('Fruit list: Apple, Pear, Plum, Fig', { toasts: notes }); });

// Back closes the top dialog: each dialog takes one history entry
const transients = createTransients({ history, location, events: window });
const backState = $('back-state');
/** @type {Record<string, import('../../ui/transients.js').Transient | undefined>} */
const open = {};
/** @param {string} id */
function openDialog(id) {
  const dialog = /** @type {HTMLDialogElement} */ ($(id));
  open[id] = transients.open(() => { dialog.close(); backState.textContent = 'Dialog closed.'; });
  dialog.showModal();
  backState.textContent = 'Dialog open.';
  dialog.addEventListener('close', () => { void open[id]?.close(); }, { once: true });
}
$('back-open').addEventListener('click', () => openDialog('back-dialog'));
$('back-second').addEventListener('click', () => openDialog('back-dialog-2'));
$('back-close').addEventListener('click', () => { void open['back-dialog']?.close(); });
$('back-close-2').addEventListener('click', () => { void open['back-dialog-2']?.close(); });

// hide mode: with it on, a tap on a button or card hides it (unless it must stay); Show all brings them back
const KEY = 'kit-parts-hidden';
const hidePage = $('hide-page');
const hideOn = /** @type {HTMLInputElement} */ ($('hide-on'));
/** @type {unknown} */
let hidden = [];
try { hidden = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { /* starts empty */ }
function drawHidden() {
  applyHidden(hidePage, 'gallery', hidden, { marking: hideOn.checked, keepOut: '#hide-on' });
  const list = cleanHideList(hidden);
  $('hide-list').textContent = list.length ? `Hidden: ${list.map(x => x.name).join(', ')}` : 'Nothing hidden.';
  try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch { /* kept for this page only */ }
}
hidePage.addEventListener('click', e => {
  if (!hideOn.checked) return;
  const el = targetOf(/** @type {Element} */ (e.target));
  if (!el || keptBecause(el)) return;
  e.preventDefault();
  e.stopPropagation();   // the tapped button's own action must not run
  const entry = entryFor(el, 'gallery');
  hidden = [...cleanHideList(hidden).filter(x => hideKey(x) !== hideKey(entry)), entry];
  drawHidden();
}, true);
hideOn.addEventListener('change', drawHidden);
$('hide-all').addEventListener('click', () => { hidden = []; drawHidden(); });
drawHidden();
