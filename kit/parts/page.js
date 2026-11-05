// The reference parts gallery: the undo toast, the loading and error states and the About sheet, on made-up data.
// ?look= and ?density= preview as on the other gallery pages (preview.js). The fake update api and import map stand in for an app's.
import { toaster, undoToast, loadState, aboutSheet, draftSlot, gripDrag, moveIn, shareText, copyText, shareLink, qrSheet, askFirst, ASK_LATER_KEY, createTransients,
  applyHidden, cleanHideList, keptBecause, targetOf, entryFor, hideKey, hoverCard, drag, glide, afterGesture } from '../../ui/index.js';
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

// share this screen: the link, or a QR code of it (the encoder loads at the first QR sheet)
$('link-share').addEventListener('click', async () => {
  $('link-state').textContent = `Share link: ${await shareLink({ url: location.href, title: 'Parts gallery', toasts: notes })}.`;
});
$('link-qr').addEventListener('click', async () => {
  await qrSheet({ url: location.href, title: 'Parts gallery' });
  $('link-state').textContent = 'QR sheet closed.';
});

// ask first: each kind with its own reason
/** @type {Record<string, string>} */
const why = {
  notifications: 'To tell you when a plant is due for water.',
  location: 'To show the garden centres near you.',
  camera: 'To take a photo of a plant for its page.',
  microphone: 'To add a spoken note to a plant.',
};
for (const b of document.querySelectorAll('[data-ask]')) {
  const kind = /** @type {import('../../ui/ask-first.js').AskKind} */ (/** @type {HTMLElement} */ (b).dataset.ask);
  b.addEventListener('click', async () => {
    $('ask-state').textContent = `${kind}: ${await askFirst(kind, { why: why[kind] })}.`;
  });
}
$('ask-reset').addEventListener('click', () => {
  try { localStorage.removeItem(ASK_LATER_KEY); } catch { /* none */ }
  $('ask-state').textContent = 'Not now forgotten: each kind asks again.';
});

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

// hover cards: rest the mouse on the prose sample's link for a preview of the note it points to
hoverCard($('prose'), 'a.note-link', a => {
  const card = document.createElement('div');
  card.className = 'ui-prose';
  card.innerHTML = `<h3>${a.dataset.note}</h3><p>Morning, before the heat. Tomatoes and peppers daily; herbs every other day.</p>`;
  return card;
});

// follow the finger (motion.js): the knob moves with the finger (stretching past the ends), and let go it glides to
// the nearer end, or the way it was thrown; a finger on the gliding knob stops it there. The save waits for the lift.
const knob = $('motion-knob'), track = $('motion-track');
const far = () => track.clientWidth - knob.offsetWidth - 8;
let knobAt = 0, saves = 0;
/** @type {import('../../ui/motion.js').Glide | null} */
let knobGlide = null;
const show = (/** @type {number} */ x) => { knob.style.transform = `translateX(${x}px)`; };
drag(knob, {
  mouse: true,
  bounds: () => [0, far()],
  start: () => { if (knobGlide) { knobAt = knobGlide.stop(); knobGlide = null; show(knobAt); } return knobAt; },
  move: x => show(x),
  end: (x, v) => {
    const to = Math.abs(v) > 0.3 ? (v > 0 ? far() : 0) : x > far() / 2 ? far() : 0;
    const g = knobGlide = glide([[knob, x => ({ transform: `translateX(${x}px)` })]], x, to, v);
    knobAt = to;
    void g.done.then(landed => {
      if (!landed || knobGlide !== g) return;
      show(to); g.stop(); knobGlide = null;
      $('motion-state').textContent = to ? 'At the right.' : 'At the left.';
    });
    afterGesture(() => { $('motion-saved').textContent = `Saved ${++saves} ${saves === 1 ? 'time' : 'times'}.`; });
  },
});
