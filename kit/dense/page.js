// The dense screens gallery: a timed readings screen and a case-entry screen, both extra-dense, on made-up data.
// ?screen=readings|log|grid picks the screen; ?look= and ?density= preview as on the other gallery pages (preview.js);
// the checkbox turns extra-dense off for this screen to compare. window.kit is the started parts, for the tests.
import { startGestures, startLayout, toaster, dataGrid } from '../../ui/index.js';
import { lookSwitch } from '../../theme/index.js';
import { galleryPreview } from '../preview.js';

galleryPreview();
const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
lookSwitch($('kit-looks'), () => {
  const url = new URL(location.href);
  url.searchParams.delete('look'); url.searchParams.delete('density');
  history.replaceState(history.state, '', url);
});

// ---------- made-up data ----------
const TIMES = [['In room', '07:42'], ['Warming on', '07:44'], ['Into theatre', '08:10'], ['Induction', '08:15'],
  ['Warming off', ''], ['Skin cut', ''], ['Gown on', ''], ['Gown off', ''], ['Closure', ''], ['Out of theatre', ''],
  ['Recovery in', ''], ['Recovery out', '']];
const POINTS = ['Base', '10', '20', '30', '40', '50', '60'];
/** label, unit, min, max, step, start, value */
const STEPS = /** @type {const} */ ([['Core', '°C', 30, 42, 0.1, 36.5, '36.6'], ['Skin', '°C', 25, 40, 0.1, 34, '34.2'],
  ['Room', '°C', 15, 30, 0.5, 21, ''], ['Heart rate', '/min', 20, 220, 1, 70, '72']]);
const COMFORT = [['-3', 'Cold'], ['-2', 'Cool'], ['-1', 'Slightly cool'], ['0', 'Neutral'], ['1', 'Slightly warm'],
  ['2', 'Warm'], ['3', 'Hot']];
const FORMS = ['Before', 'During', 'Recovery', 'Day 1', 'Day 2', 'Home'];
const TAGS = ['Spinal', 'GA', 'Nerve block', 'Day case', 'Airway', 'Paeds', 'Obstetric', 'Emergency'];
const RECENT = [['54m knee scope', 'Spinal, day case · 27 Oct'], ['8f tonsils', 'GA, paeds · 27 Oct'],
  ['31f caesarean', 'Spinal, obstetric · 26 Oct'], ['70m hip', 'Spinal, nerve block · 26 Oct'],
  ['45f lap gallbladder', 'GA · 23 Oct'], ['62m hernia', 'GA, day case · 23 Oct']];

/** @param {string} s */
const esc = s => s.replace(/[&<>"]/g, c => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
/** @param {string} name @param {string[][]} opts [value, label][] @param {string} [on] */
const radios = (name, opts, on) => opts.map(([v, l]) =>
  `<label><input type="radio" name="${name}" value="${v}"${v === on ? ' checked' : ''}>${esc(l)}</label>`).join('');

const UNSET = 'Not set';
$('times').innerHTML = TIMES.map(([l, t], i) => `<button type="button" class="kit-time${t ? ' is-set' : ''}" data-name="${l}">`
  + `<span><i>${i + 1}</i> ${l}</span><b>${t || UNSET}</b></button>`).join('');
$('points').insertAdjacentHTML('beforeend', radios('point', POINTS.map(p => [p, p]), '30'));
$('board').innerHTML = STEPS.map(([l, u, min, max, step, start, v], i) => `<div class="ui-field"><span id="f-${i}">${l} <small>${u}</small></span>`
  + `<div class="ui-stepper" data-start="${start}"><button type="button" data-step="-1" aria-label="${l} down">−</button>`
  + `<input type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${v}" placeholder="–" aria-labelledby="f-${i}">`
  + `<button type="button" data-step="1" aria-label="${l} up">+</button></div></div>`).join('')
  + `<div class="ui-field"><span>Shivering</span><fieldset class="ui-segmented" data-clearable><legend>Shivering</legend>${radios('shiver', [['1', 'Yes'], ['0', 'No']], '0')}</fieldset></div>`
  + `<div class="ui-field"><span>Gown on</span><fieldset class="ui-segmented" data-clearable><legend>Gown on</legend>${radios('gown', [['1', 'Yes'], ['0', 'No']])}</fieldset></div>`
  + `<div class="ui-field ui-span"><span>Comfort <small>−3 cold … +3 hot</small></span><fieldset class="ui-segmented" data-clearable><legend>Comfort, −3 cold to +3 hot</legend>${radios('comfort', COMFORT.map(([v]) => [v, v.replace('-', '−')]), '0')}</fieldset></div>`
  + `<div class="ui-field ui-span"><span>Gown set <small>°C</small></span><fieldset class="ui-segmented" data-clearable><legend>Gown set, °C</legend>${radios('set', ['38', '39', '40', '41', '42', '43', 'NA'].map(v => [v, v]), '42')}</fieldset></div>`;
$('scale').innerHTML = COMFORT.map(([v, l]) => `<tr data-score="${v}"><td>${v.replace('-', '−')}</td><td>${l}</td></tr>`).join('');
$('forms').innerHTML = FORMS.map(f => `<a class="kit-form" href="#${f.toLowerCase().replace(/\W+/g, '-')}">${f}</a>`).join('');
$('suggest').innerHTML = ['Spinal', 'Day case', 'Knee'].map(t => `<button type="button" class="kit-tag" aria-pressed="false">+ ${t}</button>`).join('');
$('common').innerHTML = TAGS.map(t => `<button type="button" class="kit-tag" aria-pressed="${t === 'Spinal'}">${t}</button>`).join('');
$('recent').innerHTML = RECENT.map(([t, s]) => `<li class="ui-row" tabindex="0"><span class="ui-row-main">${t}<span class="ui-row-sub">${s}</span></span></li>`).join('');

// the comfort pick is marked in the scale beside it
const markScale = () => {
  const v = /** @type {HTMLInputElement | null} */ (document.querySelector('input[name=comfort]:checked'))?.value;
  for (const tr of /** @type {NodeListOf<HTMLElement>} */ ($('scale').querySelectorAll('tr'))) tr.classList.toggle('is-on', tr.dataset.score === v);
};
$('board').addEventListener('change', markScale);
markScale();

// ---------- screens, extra-dense switch ----------
const TITLES = { readings: 'Readings', log: 'Log a case', grid: 'Watering rota' };
const asked = new URLSearchParams(location.search).get('screen') ?? '';
const screen = asked === 'log' || asked === 'grid' ? asked : 'readings';
const title = TITLES[screen];
$('page-title').textContent = title;
$('bar-title').textContent = title;
document.title = `${title} · dense screens gallery`;
$('readings').hidden = screen !== 'readings';
$('log').hidden = screen !== 'log';
$('grid').hidden = screen !== 'grid';
for (const a of /** @type {NodeListOf<HTMLAnchorElement>} */ (document.querySelectorAll('a.ui-tab'))) {
  // keep a previewed look or density when changing screen
  const url = new URL(location.href);
  url.searchParams.set('screen', a.dataset.screen || 'readings');
  a.href = url.search;
  if (a.dataset.screen === screen) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
}
const denseBox = /** @type {HTMLInputElement} */ ($('dense-on'));
denseBox.addEventListener('change', () => {
  for (const s of document.querySelectorAll('.kit-screen')) {
    if (denseBox.checked) s.setAttribute('data-dense', 'extra'); else s.removeAttribute('data-dense');
  }
});

// ---------- the parts, and what the buttons do ----------
// the data grid: made-up plants by day (two groups, the second foldable), a total per day in the footer
const PLANTS = [['Indoor', ['Fern', 'Fig', 'Peace lily', 'Pothos', 'Snake plant']], ['Balcony', ['Basil', 'Chilli', 'Mint', 'Rosemary', 'Tomato']]];
const DAYS = Array.from({ length: 14 }, (_, i) => ({ key: `d${i + 1}`, wd: 'MTWTFSS'[i % 7], n: i + 1 }));
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** @type {Record<string, string>} */
const marks = {};
PLANTS.flat(2).filter(p => typeof p === 'string').forEach((p, i) => DAYS.forEach((d, j) => { if ((i + j) % 3 === 0) marks[`${p}|${d.key}`] = (i + j) % 6 ? 'W' : 'F'; }));
const rota = /** @type {HTMLTableElement} */ ($('rota'));
const drawRota = () => {
  const head = `<thead><tr><th scope="col">Plant</th>${DAYS.map(d => `<th scope="col" data-key="${d.key}"><abbr title="${DAY_NAMES[(d.n - 1) % 7]} ${d.n}">${d.wd}<br>${d.n}</abbr></th>`).join('')}</tr></thead>`;
  const body = PLANTS.map(([g, ps]) => `<tbody><tr data-group><th colspan="${DAYS.length + 1}" scope="colgroup"><span>${g}</span></th></tr>`
    + /** @type {string[]} */ (ps).map(p => `<tr data-key="${esc(p)}"><th scope="row">${esc(p)}</th>${DAYS.map(d => `<td>${marks[`${p}|${d.key}`] ?? ''}</td>`).join('')}</tr>`).join('') + '</tbody>').join('');
  const foot = `<tfoot><tr><th scope="row">Watered</th>${DAYS.map(d => `<td>${Object.entries(marks).filter(([k, v]) => v && k.endsWith(`|${d.key}`)).length}</td>`).join('')}</tr></tfoot>`;
  rota.innerHTML = head + body + foot;
};
drawRota();
/** @type {import('../../ui/data-grid.js').GridPick | null} */
let picked = null;
const grid = dataGrid(rota, { onSelect: p => {
  picked = p.rowKey ? p : null;
  $('rota-picked').textContent = picked ? `${picked.rowKey}, day ${String(picked.colKey).slice(1)}` : 'Pick a plant\'s day.';
} });
$('grid').addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-mark]'));
  if (!b || !picked) return;
  const { rowKey, colKey } = picked;
  marks[`${rowKey}|${colKey}`] = b.dataset.mark ?? '';
  drawRota();   // a redraw, as an app's would be: the grid keeps working and the pick is put back by its keys
  const cell = /** @type {HTMLTableCellElement | null} */ (rota.querySelector(`tr[data-key="${rowKey}"]`)?.querySelectorAll('td')[Number(String(colKey).slice(1)) - 1] ?? null);
  grid.select(cell);
  if (cell) picked = { ...picked, cell };
});
$('grid-size').addEventListener('change', e => {
  const v = /** @type {HTMLInputElement} */ (e.target).value;
  if (v) rota.dataset.size = v; else delete rota.dataset.size;
});

const kit = { gestures: startGestures(), layout: startLayout(), grid };
/** @type {any} */ (window).kit = kit;
const toasts = toaster(document.body);
$('save-reading').addEventListener('click', () => toasts.show('Saved the 30 min reading'));
$('copy-last').addEventListener('click', () => toasts.show('Copied the 20 min reading into the boxes'));
$('clear-reading').addEventListener('click', () => {
  const fields = /** @type {HTMLInputElement[]} */ ([...$('board').querySelectorAll('input[type=number]')]);
  const was = fields.map(f => f.value);
  fields.forEach(f => { f.value = ''; });
  toasts.show('Boxes cleared', { ms: 6000, action: { label: 'Undo', run: () => fields.forEach((f, i) => { f.value = was[i]; }) } });
});
$('times').addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.kit-time'));
  if (!b || b.classList.contains('is-set')) return;
  const now = new Date(), t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  /** @type {HTMLElement} */ (b.querySelector('b')).textContent = t;
  b.classList.add('is-set');
  toasts.show(`${b.dataset.name} set to ${t}`, { ms: 6000, action: { label: 'Undo', run: () => {
    /** @type {HTMLElement} */ (b.querySelector('b')).textContent = UNSET; b.classList.remove('is-set'); } } });
});
for (const g of ['suggest', 'common']) $(g).addEventListener('click', e => {
  const b = /** @type {Element} */ (e.target).closest('button');
  if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
});
$('save-case').addEventListener('click', () => toasts.show('Case saved'));
$('save-keep').addEventListener('click', () => toasts.show('Case saved; the date stays for the next one'));
