// The iOS gallery: the iOS look on a made-up plant app. The segmented control filters the to-do rows; the switches
// and the sheet are the kit's own. window.kit is startGestures()'s, for the tests.
import { startGestures, icon } from '../../ui/index.js';
import { chevronRight } from '../../icons/lucide.js';
import { previewTheme } from '../../theme/index.js';
import { galleryPreview } from '../preview.js';

galleryPreview();
if (!new URLSearchParams(location.search).has('look')) previewTheme({ look: 'ios' });

// a few more of Lucide's icons, for the tiles (https://lucide.dev, ISC licence)
/** @type {import('../../icons/lucide.js').IconNodes} */
const droplet = [['path', { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 10.1 5 12 5 15a7 7 0 0 0 7 7z' }]];
/** @type {import('../../icons/lucide.js').IconNodes} */
const sun = [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2' }], ['path', { d: 'M12 20v2' }], ['path', { d: 'm4.93 4.93 1.41 1.41' }],
  ['path', { d: 'm17.66 17.66 1.41 1.41' }], ['path', { d: 'M2 12h2' }], ['path', { d: 'M20 12h2' }], ['path', { d: 'm6.34 17.66-1.41 1.41' }],
  ['path', { d: 'm19.07 4.93-1.41 1.41' }]];
/** @type {import('../../icons/lucide.js').IconNodes} */
const moon = [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]];

/** @param {string} tag @param {Record<string, string>} [attrs] @param {(Node | string)[]} [kids] */
function el(tag, attrs = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...kids);
  return e;
}

const reminders = /** @type {HTMLElement} */ (document.getElementById('reminders'));
/** @param {import('../../icons/lucide.js').IconNodes} nodes @param {string} tone @param {string} name */
const tile = (nodes, tone, name) => [el('span', { class: 'ui-row-lead', 'data-tone': tone, 'aria-hidden': 'true' }, [icon(nodes)]),
  el('span', { class: 'ui-row-main' }, [name])];
reminders.append(
  el('li', {}, [el('label', { class: 'ui-row' }, [...tile(droplet, 'teal', 'Watering'),
    el('input', { type: 'checkbox', role: 'switch', class: 'ui-switch', checked: '' })])]),
  el('li', {}, [el('label', { class: 'ui-row' }, [...tile(sun, 'orange', 'Feeding'),
    el('input', { type: 'checkbox', role: 'switch', class: 'ui-switch' })])]),
  el('li', {}, [el('a', { class: 'ui-row', href: '#show' }, [...tile(moon, 'indigo', 'Quiet hours'),
    el('span', { class: 'ui-row-value' }, ['22:00 to 07:00']), icon(chevronRight, { class: 'ui-row-chevron' })])]),
);

const PLANTS = [['Fern', 'Water: soil dry on top', 'Today', true, false], ['Monstera', 'Turn a quarter towards the light', 'Today', true, true],
  ['Basil', 'Pinch out the tops', 'Tomorrow', false, false], ['Orchid', 'Feed at half strength', 'Fri', false, true],
  ['Snake plant', 'Wipe the leaves', 'Sun', false, false]];
const todo = /** @type {HTMLElement} */ (document.getElementById('todo'));
for (const [name, what, when, due, flagged] of PLANTS) {
  todo.append(el('li', due ? { 'data-due': '' } : {}, [el('div', { class: 'ui-row', 'data-plant': String(name), ...flagged ? { 'data-flagged': '' } : {} }, [
    el('span', { class: 'ui-row-main' }, [String(name), el('span', { class: 'ui-row-sub' }, [String(what)])]),
    el('span', { class: 'ui-row-value' }, [String(when)])])]));
}

const show = /** @type {HTMLFieldSetElement} */ (document.getElementById('show'));
function filter() {
  const pick = /** @type {HTMLInputElement | null} */ (show.querySelector(':checked'))?.value ?? 'all';
  for (const li of todo.children) {
    const row = /** @type {HTMLElement} */ (li.firstElementChild);
    /** @type {HTMLElement} */ (li).hidden = pick === 'due' ? !li.hasAttribute('data-due') : pick === 'flagged' ? !row.hasAttribute('data-flagged') : false;
  }
}
show.addEventListener('change', filter);

const kit = startGestures();
/** @type {any} */ (window).kit = kit;
