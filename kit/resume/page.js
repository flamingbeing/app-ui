// The warm start gallery: three tab pages of made-up reading, started with startGestures(document, { resume: true }).
// The status line says how this start went (warm, from the kept place, or as usual). The Done list is drawn a moment
// late, as an app's rows from its store are, so the kept scroll is held until it is there. window.kit is
// startGestures()'s, for the tests.
import { startGestures, placeToOpen, qrSheet, icon, RESUME_KEY, RESUME_MINUTES } from '../../ui/index.js';
import { check, share2 } from '../../icons/lucide.js';
import { galleryPreview } from '../preview.js';

galleryPreview();

// two more of Lucide's icons, for the tabs (https://lucide.dev, ISC licence)
/** @type {import('../../icons/lucide.js').IconNodes} */
const inbox = [['polyline', { points: '22 12 16 12 14 15 10 15 8 12 2 12' }],
  ['path', { d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }]];
/** @type {import('../../icons/lucide.js').IconNodes} */
const clock = [['circle', { cx: 12, cy: 12, r: 10 }], ['polyline', { points: '12 6 12 12 16 14' }]];
const tabIcons = { inbox, later: clock, done: check };
for (const slot of document.querySelectorAll('[data-icon]')) slot.append(icon(tabIcons[/** @type {keyof typeof tabIcons} */ (/** @type {HTMLElement} */ (slot).dataset.icon)]));

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const topics = ['Rivers', 'Bread', 'Comets', 'Bees', 'Tides', 'Maps', 'Clocks', 'Moss', 'Kites', 'Salt', 'Owls', 'Glass'];
/** @param {HTMLElement} list @param {string} kind @param {number} n */
function draw(list, kind, n) {
  list.append(...Array.from({ length: n }, (_, i) => {
    const li = document.createElement('li');
    li.className = 'ui-row';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kit-go';
    b.dataset.push = '#item';
    b.dataset.name = `${kind} ${i + 1}`;
    b.textContent = `${kind} ${i + 1}: ${topics[i % topics.length]}, part ${Math.floor(i / topics.length) + 1}`;
    li.append(b);
    return li;
  }));
}

// how this start went, read before the shell takes the mark off
let raw = null;
try { raw = localStorage.getItem(RESUME_KEY); } catch { /* no storage: a normal start */ }
const marked = document.documentElement.getAttribute('data-resuming');
const place = placeToOpen(raw, { path: location.pathname, hash: location.hash, search: location.search, now: Date.now() });
$('how').textContent = place
  ? `Warm start: opened ${place.tab} at ${place.y} px, where it was left${marked ? ' (marked before the first paint)' : ''}.`
  : `A normal start. Pick a tab and scroll, then reload or leave and come back within ${RESUME_MINUTES} minutes.`;

draw($('inbox-list'), 'Note', 40);
draw($('later-list'), 'Saved', 60);
setTimeout(() => draw($('done-list'), 'Read', 80), 400);

const kit = startGestures(document, { resume: true });
document.addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-push]'));
  if (b?.dataset.name) $('item-title').textContent = b.dataset.name;
});
$('forget').addEventListener('click', () => {
  try { localStorage.removeItem(RESUME_KEY); } catch { /* none */ }
  $('how').textContent = 'Forgotten: the next start is a normal one (until this page is left again).';
});
const share = $('share');
share.append(icon(share2));
share.addEventListener('click', () => { void qrSheet({ url: location.href, title: 'Reading' }); });
/** @type {any} */ (window).kit = kit;
