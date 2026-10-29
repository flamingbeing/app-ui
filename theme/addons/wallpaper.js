// Add-on: wallpaper (ported from the logbook engine). A built-in pattern or the person's own photo behind every page,
// with a dim. Off by default: nothing shows until a device picks one (addons/store.js). Text on the bare page keeps
// 4.5:1 on its own soft backing (scrimFor), so the picture is dimmed only as much as chosen; the floor is what minDim
// works out from the wallpaper's colours and the palette in use. The photo is kept on this device only (IndexedDB),
// made smaller first, and never uploaded or synced; a saved theme or a theme link may carry a pattern, never a photo.
// addons.css draws the layers (html.wall::before the picture, ::after the dim). The pure part is unit-tested.

import { contrast, mix, cleanHex } from '../colour.js';

/** @typedef {{ label: string, ink: [string, number], css: (p: string) => string }} Pattern */
/** @typedef {{ wallpaper?: unknown, wallDim?: unknown, wallInk?: unknown }} WallChoice */
/** @typedef {{ bg: string, ink?: string, text?: string, muted?: string, accent?: string, panel?: string, surface?: string }} WallPalette
 *  logbook names (ink, panel) or the kit's (text, surface) */
/** @typedef {{ name: string, blob: Blob, samples: string[] }} WallPhoto */

// pattern: CSS custom properties for html.wall::before; ink: [token, % of it over the page colour at the faintest
// strength], so minDim can check text on it; wallInk sets the % (INK_MIN to INK_MAX)
/** @type {Readonly<Record<string, Pattern>>} */
export const PATTERNS = Object.freeze({
  dots: { label: 'Dots', ink: ['ink', 6], css: p => `--wall: radial-gradient(${p} 1.2px, transparent 1.7px); --wall-size: 18px 18px; --wall-repeat: repeat;` },
  grid: { label: 'Grid', ink: ['ink', 6], css: p => `--wall: linear-gradient(${p} 1px, transparent 1px), linear-gradient(90deg, ${p} 1px, transparent 1px); --wall-size: 24px 24px; --wall-repeat: repeat;` },
  paper: { label: 'Paper lines', ink: ['accent', 6], css: p => `--wall: repeating-linear-gradient(transparent 0 27px, ${p} 27px 28px); --wall-size: auto; --wall-repeat: repeat;` },
  gradient: { label: 'Soft gradient', ink: ['accent', 6], css: p => `--wall: linear-gradient(160deg, ${p}, transparent 55%, ${p});--wall-size: cover; --wall-repeat: no-repeat;` },
});
/** @type {[string, string][]}  the choices, in order: none, the patterns, a photo */
export const WALLPAPERS = [['none', 'None (default)'], ...Object.entries(PATTERNS).map(([k, p]) => /** @type {[string, string]} */ ([k, p.label])), ['photo', 'Your own photo']];
/** @param {unknown} v @returns {string | null} */
export const cleanPattern = v => (typeof v === 'string' && Object.hasOwn(PATTERNS, v) ? v : null);
/** @param {unknown} v @returns {string | null}  a pattern id or 'photo' */
export const cleanWall = v => (v === 'photo' ? 'photo' : cleanPattern(v));
// pattern strength: the % of its ink colour (6, the faintest, unless set; steps of 6)
export const INK_MIN = 6, INK_MAX = 36, INK_STEP = 6;
/** @param {unknown} v @returns {number | null} */
export const cleanInk = v => (Number.isInteger(v) && /** @type {number} */ (v) >= INK_MIN && /** @type {number} */ (v) <= INK_MAX && /** @type {number} */ (v) % INK_STEP === 0 ? /** @type {number} */ (v) : null);
/** @param {WallChoice | undefined} d */
export const inkOf = d => cleanInk(d?.wallInk) ?? INK_MIN;
// the dim: the page colour laid over the wallpaper, in % (0 to 90, steps of 5); unset: 40 for a photo, none for a pattern
export const DIM_MAX = 90;
/** @param {unknown} v @returns {number | null} */
export const cleanDim = v => (Number.isInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) <= DIM_MAX && /** @type {number} */ (v) % 5 === 0 ? /** @type {number} */ (v) : null);
/** @param {WallChoice} d */
export const dimOf = d => cleanDim(d.wallDim) ?? (cleanWall(d.wallpaper) === 'photo' ? 40 : 0);

/** @param {WallPalette} pal @param {string} k  'ink' (the text colour) or another token */
const tok = (pal, k) => /** @type {Record<string, string | undefined>} */ (pal)[k] ?? (k === 'ink' ? pal.text : k === 'panel' ? pal.surface : undefined);
/** the kit's token for a pattern's ink ('ink' is the kit's --text) @param {string} k */
const cssVar = k => (k === 'ink' ? 'text' : k);

/** @param {WallChoice} [d] @returns {string}  the CSS for a pattern (after the palette, so it follows light and dark), or '' */
export function patternCss(d = {}) {
  const k = cleanPattern(d.wallpaper);
  if (!k) return '';
  return `:root { ${PATTERNS[k].css(`color-mix(in srgb, var(--${cssVar(PATTERNS[k].ink[0])}) ${inkOf(d)}%, transparent)`)} }`;
}
/** a pattern's colours over a palette, at its strongest: what text on the page may sit on
 *  @param {string} k @param {WallPalette} pal @param {unknown} [pct]  its strength @returns {string[]} */
export const patternSamples = (k, pal, pct) => {
  const p = PATTERNS[k], ink = p && tok(pal, p.ink[0]);
  return p && ink ? [pal.bg, mix(pal.bg, ink, (cleanInk(pct) ?? p.ink[1]) / 100)] : [pal.bg];
};

// The lowest dim (0 to 1, in 0.05 steps) at which every text colour on the page (ink, muted, accent) reaches 4.5:1 on
// every wallpaper colour once the page colour is laid over it at that strength; a text colour already under 4.5:1 on
// the plain page may lose no more than 5% of what it has. samples: #rrggbb colours.
export const TEXT_RATIO = 4.5;
/** @param {number} plain */
export const textNeed = plain => (plain >= TEXT_RATIO ? TEXT_RATIO : plain * 0.95);
/** @param {string[]} samples @param {WallPalette} pal @returns {number} */
export function minDim(samples, pal) {
  const texts = /** @type {string[]} */ (['ink', 'muted', 'accent'].map(k => tok(pal, k)).filter(c => cleanHex(c)));
  if (!cleanHex(pal.bg) || !texts.length) return 0;
  const need = texts.map(t => textNeed(contrast(t, pal.bg)));
  /** @param {number} dim */
  const ok = dim => samples.every(s => { const under = mix(s, pal.bg, dim); return texts.every((t, i) => contrast(t, under) >= need[i] - 1e-9); });
  for (let i = 0; i <= 20; i++) if (ok(i / 20)) return i / 20;
  return 1;
}

/** The backing for text on the bare page (0 to 1, in 0.05 steps, rounded up): enough that dim and backing together
 *  reach the floor (1 - (1 - dim)(1 - scrim) >= floor) @param {number} floor @param {number} dim */
export const scrimFor = (floor, dim) => (dim >= floor || dim >= 1 ? 0 : Math.min(1, Math.ceil(((floor - dim) / (1 - dim)) * 20 - 1e-9) / 20));
// See-through cards: how much of the card colour covers the wallpaper (FROST, more if that's what keeps every text
// colour on a card at 4.5:1 over every wallpaper colour once dimmed). dim: 0 to 1.
export const FROST = 0.8;
/** @param {string[]} samples @param {number} dim @param {WallPalette} pal */
export function frostAlpha(samples, dim, pal) {
  const panel = tok(pal, 'panel');
  if (!cleanHex(panel) || !cleanHex(pal.bg) || !samples.length) return FROST;
  return Math.max(FROST, minDim(samples.map(s => mix(s, pal.bg, dim)), { ...pal, bg: /** @type {string} */ (panel) }));
}

/** The photo's main colour: the hue that covers most of it among colours with some colour in them (greys, near-black
 *  and near-white don't count), as the average of that hue's samples; null for a grey photo
 *  @param {string[]} samples @returns {string | null} */
export function mainColour(samples) {
  /** @type {Map<number, { n: number, w: number, rgb: number[] }>} */
  const bins = new Map();
  for (const s of samples) {
    if (!cleanHex(s)) continue;
    const [r, g, b] = [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (sat < 0.25 || l < 0.12 || l > 0.9) continue;
    const hue = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const bin = Math.floor(hue * 2) % 12;   // twelve 30° hues
    const e = bins.get(bin) || { n: 0, w: 0, rgb: [0, 0, 0] };
    const w = sat;   // more colourful samples count for more
    e.n++; e.w += w; e.rgb = e.rgb.map((v, i) => v + [r, g, b][i] * w);
    bins.set(bin, e);
  }
  const best = [...bins.values()].sort((a, b) => b.w - a.w)[0];
  if (!best || best.n < Math.max(2, samples.length * 0.03)) return null;
  return '#' + best.rgb.map(v => Math.round((v / best.w) * 255).toString(16).padStart(2, '0')).join('');
}
/** @param {number} r @param {number} g @param {number} b  0 to 255 @returns {string}  #rrggbb */
export const hexOf = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
/** a colour from the page's computed style (#rgb, #rrggbb or rgb()) as #rrggbb, or null @param {unknown} v */
export function cssHex(v) {
  const s = String(v || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return '#' + [...s.slice(1)].map(c => c + c).join('');
  const m = s.match(/^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return m ? hexOf(+m[1], +m[2], +m[3]) : null;
}

// ---- browser side ----

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;   // what can be picked; it is kept much smaller
const LONG_SIDE = 1600, GRID = 32;

/**
 * The photo's keeper on this device: IndexedDB `db` (the app names it, so two apps on one address keep their own),
 * store 'files', key 'photo' -> { name, blob (JPEG), samples (#rrggbb, 32 x 32) }.
 * @param {string} db
 */
export function photoStore(db) {
  /** @returns {Promise<IDBDatabase>} */
  const open = () => new Promise((resolve, reject) => {
    const r = indexedDB.open(db, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  /** @param {IDBTransactionMode} mode @param {(s: IDBObjectStore) => IDBRequest} fn @returns {Promise<any>} */
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise((resolve, reject) => {
      const t = d.transaction('files', mode); const req = fn(t.objectStore('files'));
      t.oncomplete = () => { d.close(); resolve(req && req.result); };
      t.onerror = () => { d.close(); reject(t.error); };
    });
  };
  /** @returns {Promise<WallPhoto | null>} */
  const get = () => tx('readonly', s => s.get('photo')).then(r => r ?? null, () => null);
  /** @param {WallPhoto} rec */
  const put = rec => tx('readwrite', s => s.put(rec, 'photo'));
  const remove = () => tx('readwrite', s => s.delete('photo')).catch(() => {});
  /** a picked image file: made at most 1600 px on its long side (JPEG), its colours sampled, then kept; throws a
   *  message for the person @param {File} file @returns {Promise<WallPhoto>} */
  async function save(file) {
    if (!/^image\//.test(file.type || '') && !/\.(jpe?g|png|webp|gif|heic|avif)$/i.test(file.name || '')) throw new Error('Choose a picture (a photo or an image file)');
    if (file.size > MAX_PHOTO_BYTES) throw new Error('That picture is over 25 MB');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url;
      try { await img.decode(); } catch { throw new Error('That file could not be read as a picture'); }
      const k = Math.min(1, LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(img, 0, 0, c.width, c.height);
      /** @type {Blob | null} */
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
      if (!blob) throw new Error('That picture could not be made smaller');
      const rec = { name: String(file.name || 'photo').slice(0, 80), blob, samples: samplesOf(c) };
      await put(rec);
      return rec;
    } finally { URL.revokeObjectURL(url); }
  }
  return { get, put, remove, save };
}

/** the colours of a 32 x 32 version of a picture (each one the average of its patch) @param {CanvasImageSource} source */
export function samplesOf(source) {
  const c = document.createElement('canvas'); c.width = GRID; c.height = GRID;
  const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d', { willReadFrequently: true })); x.drawImage(source, 0, 0, GRID, GRID);
  const px = x.getImageData(0, 0, GRID, GRID).data, out = [];
  for (let i = 0; i < px.length; i += 4) out.push(hexOf(px[i], px[i + 1], px[i + 2]));
  return out;
}
/** the colour around a point of an <img> (a 5 x 5 average at its own resolution), for tap-to-pick
 *  @param {HTMLImageElement} img @param {number} fx @param {number} fy  0 to 1 */
export function colourAt(img, fx, fy) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d', { willReadFrequently: true })); x.drawImage(img, 0, 0);
  const px = Math.round(fx * (c.width - 1)), py = Math.round(fy * (c.height - 1));
  const d = x.getImageData(Math.max(0, px - 2), Math.max(0, py - 2), 5, 5).data, sum = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; }
  const n = d.length / 4;
  return hexOf(sum[0] / n, sum[1] / n, sum[2] / n);
}
