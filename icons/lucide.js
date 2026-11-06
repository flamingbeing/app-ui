// Icons from Lucide (https://lucide.dev, ISC licence), drawn as SVG on a 24-grid with the text colour. Only the icons
// below ship: each is its own named export, so an app that imports `icon` and `check` carries just those two. Add one
// by copying its nodes from lucide.dev: [tag, attributes] pairs, nothing else. No emoji or text glyphs as icons
// anywhere in the core (tools/check.mjs fails on them).
const NS = 'http://www.w3.org/2000/svg';

/** @typedef {readonly (readonly [string, Readonly<Record<string, string | number>>])[]} IconNodes */

/** @type {IconNodes} */ export const check = [['path', { d: 'M20 6 9 17l-5-5' }]];
/** @type {IconNodes} */ export const x = [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]];
/** @type {IconNodes} */ export const chevronLeft = [['path', { d: 'm15 18-6-6 6-6' }]];
/** @type {IconNodes} */ export const chevronUp = [['path', { d: 'm18 15-6-6-6 6' }]];
/** @type {IconNodes} */ export const chevronDown = [['path', { d: 'm6 9 6 6 6-6' }]];
/** @type {IconNodes} */ export const chevronRight = [['path', { d: 'm9 18 6-6-6-6' }]];
/** @type {IconNodes} */ export const menu = [['path', { d: 'M4 6h16' }], ['path', { d: 'M4 12h16' }], ['path', { d: 'M4 18h16' }]];
/** @type {IconNodes} */ export const info = [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 16v-4' }], ['path', { d: 'M12 8h.01' }]];
/** @type {IconNodes} */ export const refreshCw = [['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }], ['path', { d: 'M21 3v5h-5' }],
  ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }], ['path', { d: 'M8 16H3v5' }]];
/** @type {IconNodes} */ export const cloudOff = [['path', { d: 'm2 2 20 20' }], ['path', { d: 'M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193' }],
  ['path', { d: 'M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07' }]];
/** @type {IconNodes} */ export const cloud = [['path', { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' }]];
/** @type {IconNodes} */ export const cloudCheck = [['path', { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' }], ['path', { d: 'm8 13 3 3 5-5' }]];   // (not lucide's: its tick hangs below the cloud and doesn't read as one)
/** @type {IconNodes} */ export const cloudUpload = [['path', { d: 'M12 13v8' }], ['path', { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' }], ['path', { d: 'm8 17 4-4 4 4' }]];
/** @type {IconNodes} */ export const cloudAlert = [['path', { d: 'M12 12v4' }], ['path', { d: 'M12 20h.01' }], ['path', { d: 'M8.128 16.949A7 7 0 1 1 15.71 8h1.79a1 1 0 0 1 0 9h-1.642' }]];
/** @type {IconNodes} */ export const triangleAlert = [['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
  ['path', { d: 'M12 9v4' }], ['path', { d: 'M12 17h.01' }]];
/** @type {IconNodes} */ export const loaderCircle = [['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }]];
/** @type {IconNodes} */ export const trash2 = [['path', { d: 'M3 6h18' }], ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
  ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }], ['path', { d: 'M10 11v6' }], ['path', { d: 'M14 11v6' }]];
/** @type {IconNodes} */ export const gripVertical = [['circle', { cx: 9, cy: 12, r: 1 }], ['circle', { cx: 9, cy: 5, r: 1 }], ['circle', { cx: 9, cy: 19, r: 1 }],
  ['circle', { cx: 15, cy: 12, r: 1 }], ['circle', { cx: 15, cy: 5, r: 1 }], ['circle', { cx: 15, cy: 19, r: 1 }]];
/** @type {IconNodes} */ export const slidersHorizontal = [['path', { d: 'M21 4h-7' }], ['path', { d: 'M10 4H3' }], ['path', { d: 'M21 12h-9' }],
  ['path', { d: 'M8 12H3' }], ['path', { d: 'M21 20h-5' }], ['path', { d: 'M12 20H3' }], ['path', { d: 'M14 2v4' }], ['path', { d: 'M8 10v4' }],
  ['path', { d: 'M16 18v4' }]];

/** @type {IconNodes} */ export const copy = [['rect', { width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 }], ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }]];
/** @type {IconNodes} */ export const qrCode = [['rect', { width: 5, height: 5, x: 3, y: 3, rx: 1 }], ['rect', { width: 5, height: 5, x: 16, y: 3, rx: 1 }],
  ['rect', { width: 5, height: 5, x: 3, y: 16, rx: 1 }], ['path', { d: 'M21 16h-3a2 2 0 0 0-2 2v3' }], ['path', { d: 'M21 21v.01' }], ['path', { d: 'M12 7v3a2 2 0 0 1-2 2H7' }],
  ['path', { d: 'M3 12h.01' }], ['path', { d: 'M12 3h.01' }], ['path', { d: 'M12 16v.01' }], ['path', { d: 'M16 12h1' }], ['path', { d: 'M21 12v.01' }], ['path', { d: 'M12 21v-1' }]];
/** @type {IconNodes} */ export const share2 = [['circle', { cx: 18, cy: 5, r: 3 }], ['circle', { cx: 6, cy: 12, r: 3 }], ['circle', { cx: 18, cy: 19, r: 3 }],
  ['line', { x1: 8.59, x2: 15.42, y1: 13.51, y2: 17.49 }], ['line', { x1: 15.41, x2: 8.59, y1: 6.51, y2: 10.49 }]];
/** @type {IconNodes} */ export const bell = [['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }],
  ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }]];
/** @type {IconNodes} */ export const mapPin = [['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }],
  ['circle', { cx: 12, cy: 10, r: 3 }]];
/** @type {IconNodes} */ export const camera = [['path', { d: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z' }],
  ['circle', { cx: 12, cy: 13, r: 3 }]];
/** @type {IconNodes} */ export const mic = [['path', { d: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' }], ['path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }],
  ['line', { x1: 12, x2: 12, y1: 19, y2: 22 }]];

/** @type {IconNodes} */ export const search = [['circle', { cx: 11, cy: 11, r: 8 }], ['path', { d: 'm21 21-4.3-4.3' }]];
/** @type {IconNodes} */ export const plus = [['path', { d: 'M5 12h14' }], ['path', { d: 'M12 5v14' }]];
/** @type {IconNodes} */ export const circle = [['circle', { cx: 12, cy: 12, r: 10 }]];
/** @type {IconNodes} */ export const circleDot = [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 1 }]];
/** @type {IconNodes} */ export const chevronsUpDown = [['path', { d: 'm7 15 5 5 5-5' }], ['path', { d: 'm7 9 5-5 5 5' }]];
/** @type {IconNodes} */ export const arrowLeft = [['path', { d: 'm12 19-7-7 7-7' }], ['path', { d: 'M19 12H5' }]];
/** @type {IconNodes} */ export const settings = [['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }],
  ['circle', { cx: 12, cy: 12, r: 3 }]];

/**
 * An icon as an <svg class="ui-icon"> (hidden from screen readers: the button or chip around it carries the name).
 * Sized by `.ui-icon` in ui.css (1.25em); stroke and fill come from the text colour.
 * @param {IconNodes} nodes  one of the exports above
 * @param {{ class?: string }} [o]  class: added after ui-icon
 * @returns {SVGSVGElement}
 */
export function icon(nodes, o = {}) {
  const svg = /** @type {SVGSVGElement} */ (document.createElementNS(NS, 'svg'));
  const set = /** @type {(e: Element, a: Record<string, string | number>) => void} */ ((e, a) => { for (const k in a) e.setAttribute(k, String(a[k])); });
  set(svg, { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false', class: o.class ? `ui-icon ${o.class}` : 'ui-icon' });
  for (const [tag, attrs] of nodes) { const n = document.createElementNS(NS, tag); set(n, attrs); svg.append(n); }
  return svg;
}
