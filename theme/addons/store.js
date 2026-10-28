// The add-ons this device chose (wallpaper, fonts, custom CSS, icon set), kept in localStorage 'core-addons' (an app
// may name its own key) and shown by applyAddons: <html> marks (wall, wall-frost, data-icons), the wallpaper's custom
// properties in one constructed stylesheet (no inline style, for the Content-Security-Policy), the fonts' --font and
// --font-editor, and the custom CSS last. Nothing chosen, an unknown value or no storage: every add-on off.

import { cleanWall, cleanDim, cleanInk, dimOf, inkOf, patternCss, patternSamples, minDim, scrimFor, frostAlpha, cssHex } from './wallpaper.js';
import { applyFonts, cleanFontName } from './fonts.js';
import { applyCustomCss, checkCss } from './custom-css.js';
import { cleanIconSet } from './icon-sets.js';

/**
 * @typedef {object} Addons
 * @property {string} [wallpaper]  a pattern or 'photo'
 * @property {number} [wallDim]  0 to 90, in 5s
 * @property {number} [wallInk]  a pattern's strength
 * @property {boolean} [wallFrost]  see-through cards (.ui-card)
 * @property {string} [fontUi] @property {string} [fontUiName] @property {string} [fontLog] @property {string} [fontLogName]
 * @property {string} [css]  custom CSS @property {Record<string, unknown>} [cssValues]  its settings' values
 * @property {string} [icons]  an icon set other than the default
 */

export const ADDONS_KEY = 'core-addons';
const FONT_CHOICE = /^[a-z0-9-]{1,24}$/;

/** only the add-ons that are on and well-formed @param {unknown} v @returns {Addons} */
export function cleanAddons(v) {
  const d = /** @type {Record<string, unknown>} */ (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  /** @type {Record<string, unknown>} */
  const out = {};
  const wall = cleanWall(d.wallpaper);
  if (wall) {
    out.wallpaper = wall;
    if (cleanDim(d.wallDim) != null) out.wallDim = cleanDim(d.wallDim);
    if (wall !== 'photo' && cleanInk(d.wallInk) != null) out.wallInk = cleanInk(d.wallInk);
    if (d.wallFrost === true) out.wallFrost = true;
  }
  for (const k of ['fontUi', 'fontLog']) {
    const c = d[k];
    if (typeof c !== 'string' || !FONT_CHOICE.test(c) || c === 'default' || (k === 'fontLog' && c === 'same')) continue;
    if (c === 'named' && !cleanFontName(d[k + 'Name'])) continue;
    out[k] = c;
    if (c === 'named') out[k + 'Name'] = cleanFontName(d[k + 'Name']);
  }
  const c = checkCss(d.css);
  if (c.ok && c.css) {
    out.css = c.css;
    if (d.cssValues && typeof d.cssValues === 'object' && !Array.isArray(d.cssValues)) out.cssValues = d.cssValues;
  }
  const icons = cleanIconSet(d.icons);
  if (icons) out.icons = icons;
  return out;
}

/** this device's add-ons @param {string} [key] @returns {Addons} */
export function addonChoice(key = ADDONS_KEY) {
  try { return cleanAddons(JSON.parse(localStorage.getItem(key) || '{}')); } catch { return {}; }
}
/** change some add-ons (null or undefined turns one off) and keep them; returns what is kept now
 *  @param {Record<string, unknown>} patch @param {string} [key] @returns {Addons} */
export function chooseAddons(patch, key = ADDONS_KEY) {
  const next = cleanAddons(Object.fromEntries(Object.entries({ ...addonChoice(key), ...patch }).filter(([, v]) => v != null)));
  try { if (Object.keys(next).length) localStorage.setItem(key, JSON.stringify(next)); else localStorage.removeItem(key); } catch { /* storage blocked */ }
  return next;
}

/**
 * What to paint (0 to 1): dim (the page colour over the picture), floor (what text on the bare page needs), scrim (the
 * backing that text gets), frost (the card colour over the picture; 1 when off).
 * @param {Addons} d @param {import('./wallpaper.js').WallPalette | null} pal  the colours in use now (null: unknown) @param {string[]} [photoSamples]
 */
export function wallPaint(d, pal, photoSamples = []) {
  const w = cleanWall(d.wallpaper);
  const samples = w === 'photo' ? photoSamples : w ? patternSamples(w, pal || { bg: '' }, inkOf(d)) : [];
  const floor = pal && samples.length ? minDim(samples, pal) : 0;
  const dim = dimOf(d) / 100;
  const frost = d.wallFrost ? (pal ? frostAlpha(samples, dim, pal) : 1) : 1;
  return { dim, floor, scrim: scrimFor(floor, dim), frost };
}
/** the kit's colours in use now, as #rrggbb, or null if one can't be read @returns {import('./wallpaper.js').WallPalette | null} */
export function pagePalette() {
  const cs = getComputedStyle(document.documentElement);
  const pal = Object.fromEntries(['bg', 'surface', 'text', 'muted', 'accent'].map(k => [k, cssHex(cs.getPropertyValue('--' + k))]));
  return Object.values(pal).every(Boolean) ? /** @type {import('./wallpaper.js').WallPalette} */ (pal) : null;
}

/** @type {CSSStyleSheet | null} */
let sheet = null;
/** @type {{ rec: import('./wallpaper.js').WallPhoto | null, url: string }} */
let photo = { rec: null, url: '' };
const pct = (/** @type {number} */ v) => `${Math.round(v * 100)}%`;

/**
 * Shows this device's add-ons (or the ones passed). Call again after light/dark or the palette changes, so the dim
 * and backing are worked out for the colours in use.
 * @param {Addons} [d]
 * @param {{ photos?: ReturnType<typeof import('./wallpaper.js').photoStore>, fonts?: ReturnType<typeof import('./fonts.js').fontStore>,
 *   stacks?: Record<string, string>, off?: boolean }} [o]  photos / fonts: the app's stores (photoStore, fontStore);
 *   stacks: the app's font stacks; off: leave custom CSS off here (the app's theme pages)
 * @returns {Promise<void>}
 */
export async function applyAddons(d = addonChoice(), o = {}) {
  if (typeof document === 'undefined') return;
  d = cleanAddons(d);
  const root = document.documentElement, w = d.wallpaper;
  if (w === 'photo' && !photo.rec && o.photos) photo = { rec: await o.photos.get(), url: '' };
  if (w !== 'photo' && photo.url) { URL.revokeObjectURL(photo.url); photo = { rec: null, url: '' }; }
  const shown = w === 'photo' ? !!photo.rec?.blob : !!w;
  root.classList.toggle('wall', shown);
  let css = '';
  if (shown) {
    const { dim, scrim, frost } = wallPaint(d, pagePalette(), photo.rec?.samples);
    if (w === 'photo' && photo.rec) {
      if (!photo.url) photo.url = URL.createObjectURL(photo.rec.blob);
      css += `:root { --wall: url("${photo.url}"); --wall-size: cover; --wall-repeat: no-repeat; }\n`;
    } else css += patternCss(d) + '\n';
    css += `:root { --wall-dim: ${dim}; --wall-scrim: ${pct(scrim)}; --card-alpha: ${pct(frost)}; }`;
    root.classList.toggle('wall-frost', frost < 1);
  } else root.classList.remove('wall-frost');
  if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in document && (sheet || css)) {
    if (!sheet) { sheet = new CSSStyleSheet(); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]; }
    sheet.replaceSync(css);
  }
  if (d.icons) root.dataset.icons = d.icons; else delete root.dataset.icons;
  applyFonts(d, { stacks: o.stacks, store: o.fonts });
  applyCustomCss({ css: d.css, values: d.cssValues }, { off: o.off });
}
/** a new photo kept (or none): forget the one shown, then show again */
export function photoChanged() {
  if (photo.url) URL.revokeObjectURL(photo.url);
  photo = { rec: null, url: '' };
}
