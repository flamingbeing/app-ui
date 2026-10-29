// Material 3 colour for the Android look (looks/m.js): the tonal palettes and colour roles Android 16 works out from
// one seed colour (its default "tonal spot" scheme), light and dark. Pure, no DOM.
//
// Tone is Material's own measure: CIELAB L* (0 black, 100 white), so tone 40 on tone 90 always reads the same
// whatever the hue. Hue and chroma are OKLCH's (Material uses CAM16; OKLCH is close, and keeps blues from going
// purple as they lighten). A tone's colour is found by search: the OKLab lightness that lands on that L*, the chroma
// brought down until the colour fits in sRGB. The roles then go through colour.js floor() like every other palette.
/** @param {string} h @returns {number[]} */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
/** @param {number} v */
const toLin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
/** @param {number} v */
const fromLin = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
/** @param {number[]} a @returns {string} */
const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

/** @param {number} L @param {number} C @param {number} h  OKLCH -> linear sRGB (may be out of 0..1) */
function linFromOklch(L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/** @param {string} h @returns {[number, number, number]}  OKLCH of a hex colour: lightness, chroma, hue (degrees) */
export function oklch(h) {
  const [r, g, b] = rgb(h).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363015887 * g + 0.0514770710 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}

/** @param {number[]} lin @returns {number}  relative luminance (CIE Y) of linear sRGB */
const yOf = lin => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
/** @param {number} t  tone (L*) -> Y */
const yOfTone = t => { const f = (t + 16) / 116; return f > 6 / 29 ? f ** 3 : 3 * (6 / 29) ** 2 * (f - 4 / 29); };
/** @param {string} h @returns {number}  a colour's tone: its CIELAB L* */
export function toneOf(h) {
  const y = yOf(rgb(h).map(toLin));
  return y > (6 / 29) ** 3 ? 116 * Math.cbrt(y) - 16 : y * (29 / 3) ** 3;
}

/** @param {number} C @param {number} h @param {number} y  the OKLab lightness that lands on luminance y at this chroma */
function lightnessFor(C, h, y) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (yOf(linFromOklch(mid, C, h)) < y) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** @param {number[]} lin */
const fits = lin => lin.every(v => v >= -1e-4 && v <= 1 + 1e-4);

/**
 * The colour of a hue and chroma at a tone: chroma brought down (never the tone) until it fits in sRGB.
 * @param {number} hue  OKLCH degrees @param {number} chroma  OKLCH chroma @param {number} tone  0 to 100 @returns {string}
 */
export function toneColour(hue, chroma, tone) {
  if (tone <= 0) return '#000000';
  if (tone >= 100) return '#ffffff';
  const y = yOfTone(tone);
  const at = (/** @type {number} */ c) => linFromOklch(lightnessFor(c, hue, y), c, hue);
  let lin = at(chroma);
  if (!fits(lin)) {
    let lo = 0, hi = chroma;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (fits(at(mid))) lo = mid; else hi = mid; }
    lin = at(lo);
  }
  return hex(lin.map(v => fromLin(Math.max(0, Math.min(1, v)))));
}

/** @typedef {(tone: number) => string} TonalPalette */
/** @param {number} hue @param {number} chroma @returns {TonalPalette} */
export const tonal = (hue, chroma) => tone => toneColour(hue, chroma, tone);

// Tonal spot, Android's default scheme, in OKLCH chroma (Material's CAM16 chroma 36 / 16 / 24 / 6 / 8, scaled): the
// seed's hue at a set chroma for primary, a quieter secondary, tertiary turned 60 degrees, near-grey neutrals with a
// hint of the hue. Error is Material's fixed red.
const CHROMA = { primary: 0.105, secondary: 0.045, tertiary: 0.07, neutral: 0.012, variant: 0.022, error: 0.2 };
const ERROR_HUE = 27;

/** @param {string} seed @returns {Record<'primary' | 'secondary' | 'tertiary' | 'neutral' | 'variant' | 'error', TonalPalette>} */
export function tonalPalettes(seed) {
  const [, c, h] = oklch(seed);
  const hue = c < 0.01 ? 265 : h;   // (a grey seed has no hue: Material's default blue-violet)
  return {
    primary: tonal(hue, CHROMA.primary), secondary: tonal(hue, CHROMA.secondary), tertiary: tonal((hue + 60) % 360, CHROMA.tertiary),
    neutral: tonal(hue, CHROMA.neutral), variant: tonal(hue, CHROMA.variant), error: tonal(ERROR_HUE, CHROMA.error),
  };
}

// Each role's tone [light, dark] (Material 3, 2025: an on-container colour is tone 30 in light, 90 in dark)
const ACCENTED = /** @type {const} */ (['primary', 'secondary', 'tertiary', 'error']);
const NEUTRAL = /** @type {const} */ ({
  surface: [98, 6], 'surface-dim': [87, 6], 'surface-bright': [98, 24], 'surface-container-lowest': [100, 4],
  'surface-container-low': [96, 10], 'surface-container': [94, 12], 'surface-container-high': [92, 17],
  'surface-container-highest': [90, 22], 'on-surface': [10, 90], 'inverse-surface': [20, 90], 'inverse-on-surface': [95, 20],
});
const VARIANT = /** @type {const} */ ({ 'surface-variant': [90, 30], 'on-surface-variant': [30, 80], outline: [50, 60], 'outline-variant': [80, 30] });

/**
 * Every Material 3 colour role for a seed, as a map role -> hex (primary, on-primary, primary-container,
 * on-primary-container and the same for secondary, tertiary and error; the surfaces and their containers; outline;
 * the inverse colours).
 * @param {string} seed @param {boolean} dark @returns {Record<string, string>}
 */
export function roles(seed, dark) {
  const p = tonalPalettes(seed), i = dark ? 1 : 0;
  /** @type {Record<string, string>} */
  const out = {};
  for (const k of ACCENTED) {
    out[k] = p[k](dark ? 80 : 40);
    out[`on-${k}`] = p[k](dark ? 20 : 100);
    out[`${k}-container`] = p[k](dark ? 30 : 90);
    out[`on-${k}-container`] = p[k](dark ? 90 : 30);
  }
  for (const [k, t] of Object.entries(NEUTRAL)) out[k] = p.neutral(t[i]);
  for (const [k, t] of Object.entries(VARIANT)) out[k] = p.variant(t[i]);
  out['inverse-primary'] = p.primary(dark ? 40 : 80);
  return out;
}

/**
 * The page palette (colour.js's tokens) in Material's roles, plus every role as an m3-* token for android.css: the page
 * is a surface container with lists and cards on the lightest surface (light) or a raised one (dark), text on-surface,
 * the accent primary, selection the secondary container. OLED: black page, the lowest container for cards.
 * Status colours ok / warn stay the kit's (Material has none).
 * @param {string} seed @param {{ dark?: boolean, oled?: boolean, status: Record<string, string> }} opts
 * @returns {Record<string, string>}
 */
export function m3Palette(seed, { dark = false, oled = false, status }) {
  const r = roles(seed, dark);
  const bg = dark ? (oled ? '#000000' : r.surface) : r['surface-container'];
  const surface = dark ? (oled ? r['surface-container-low'] : r['surface-container-high']) : r['surface-container-lowest'];
  return {
    bg, surface, text: r['on-surface'], muted: r['on-surface-variant'], line: r.outline,
    accent: r.primary, 'on-accent': r['on-primary'], ...status, danger: r.error,
    selection: r['secondary-container'], band: r['primary-container'], 'on-band': r['on-primary-container'],
    fill: r.primary, 'on-fill': r['on-primary'],
    ...Object.fromEntries(Object.entries(r).map(([k, v]) => [`m3-${k}`, v])),
    'm3-bar': dark && oled ? '#000000' : r['surface-container'],
  };
}
