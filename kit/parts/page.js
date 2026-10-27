// The reference parts gallery: the undo toast, the loading and error states and the About sheet, on made-up data.
// ?look= and ?density= preview as on the other gallery pages (preview.js). The fake update api and import map stand in for an app's.
import { toaster, undoToast, loadState, aboutSheet } from '../../ui/index.js';
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
  const row = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('li'));
  if (!row) return;
  const next = row.nextElementSibling;
  row.remove();
  undo.show(`Deleted ${row.dataset.name}`, () => fruit.insertBefore(row, next && fruit.contains(next) ? next : null));
});

// loading and error: Load shows skeleton rows then the list; Fail shows the error and Retry loads again
const state = loadState($('load-host'), { rows: 3 });
const loaded = $('loaded');
/** @param {boolean} ok */
function run(ok) {
  loaded.hidden = true;
  state.loading();
  setTimeout(() => {
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
