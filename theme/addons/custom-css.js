// Add-on: custom CSS (ported from the logbook engine; per device, off by default). Styling can't run code, but it can
// leak what's on screen to another site (a url() that carries text from the page) and it can hide or fake things. So:
// anything that loads from elsewhere is refused (url(), @import, image-set(), @font-face, @namespace, old script hooks,
// and backslash escapes that could spell those), it is capped in size, the app leaves it off on its own theme pages
// (applyCustomCss' off, so a bad rule can always be fixed there), and ?nocss in the address turns it off for that visit.
//
// Settings inside custom CSS: a `/* @settings ... */` comment lists CSS variables the person can then change with
// sliders, colours and switches, without editing the CSS. One setting a line:
//
//   /* @settings
//   slider --card-gap 0 24 2 8px  Space between cards
//   colour --mark #ffcc00  Highlight colour
//   switch --chip-round 4px 999px  Round chips
//   */
//
// slider: lowest, highest, step, default (its unit is the slider's: px, em, rem, %, deg, ms, s, vh, vw or none);
// colour (or color): the default #rrggbb; switch: the value when off (the default), then when on. The rest of the line
// is the label (quotes optional). settingsCss writes the chosen values as `:root { --name: value }` after the CSS.
// Values are only numbers with a unit, #rrggbb or a plain word, so nothing a setting holds can break out of its
// declaration. Pure apart from applyCustomCss; unit-tested.

/** @typedef {{ kind: 'slider', name: string, label: string, min: number, max: number, step: number, def: number, unit: string }
 *   | { kind: 'colour', name: string, label: string, def: string }
 *   | { kind: 'switch', name: string, label: string, off: string, on: string }} CssSetting */

export const MAX_CSS = 10 * 1024;
/** @type {[RegExp, string][]} */
const BLOCKED = [
  [/url\s*\(/i, 'url() (loading anything from another address)'],
  [/@import/i, '@import'],
  [/image-set\s*\(/i, 'image-set()'],
  [/@font-face/i, '@font-face (use Your own font file in Themes instead)'],
  [/@namespace/i, '@namespace'],
  [/expression\s*\(|javascript:|behaviou?r\s*:|-moz-binding/i, 'script hooks'],
  [/\\/, 'backslash escapes'],
  [/<\/?\s*style|<!--|-->/i, 'HTML'],
];

// { ok, css, problems: [why] }. css is trimmed; refused CSS is never applied, nothing is silently rewritten.
/** @param {unknown} text @returns {{ ok: boolean, css: string, problems: string[] }} */
export function checkCss(text) {
  const css = String(text || '').replace(/\r\n?/g, '\n').trim();
  /** @type {string[]} */
  const problems = [];
  if (css.length > MAX_CSS) problems.push(`over ${MAX_CSS / 1024} KB`);
  for (const [re, why] of BLOCKED) if (re.test(css)) problems.push(why);
  // braces must balance, or one rule could swallow the app's own styles after it
  let depth = 0;
  for (const ch of css.replace(/"[^"\n]*"|'[^'\n]*'/g, '')) { if (ch === '{') depth++; else if (ch === '}' && --depth < 0) break; }
  if (depth !== 0) problems.push('unbalanced { }');
  return { ok: !problems.length, css, problems };
}

export const MAX_SETTINGS = 24;
const UNITS = ['', 'px', 'em', 'rem', '%', 'deg', 'ms', 's', 'vh', 'vw'];
const NAME = /^--[a-z][a-z0-9-]{0,39}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const WORD = /^[a-z][a-z-]{0,23}$/i;

// '8px' -> { n: 8, unit: 'px' }, or null
/** @param {unknown} s @returns {{ n: number, unit: string } | null} */
function amount(s) {
  const m = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i.exec(String(s || ''));
  if (!m || !UNITS.includes(m[2].toLowerCase())) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && Math.abs(n) <= 10000 ? { n, unit: m[2].toLowerCase() } : null;
}
/** @param {string | undefined} s */
const switchValue = s => (s != null && (amount(s) || HEX.test(s) || WORD.test(s)) ? String(s) : null);
/** @param {string[]} rest @param {string} name */
const labelOf = (rest, name) => (rest.join(' ').replace(/^["“']|["”']$/g, '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60) || name);
/** @param {number} x */
const round4 = x => Number(x.toFixed(4));

// css -> { settings: [{ kind, name, label, … }], problems: ['line 2: …'] }. Only the first @settings comment counts.
/** @param {unknown} css @returns {{ settings: CssSetting[], problems: string[] }} */
export function parseSettings(css) {
  const block = /\/\*\s*@settings\b([\s\S]*?)\*\//.exec(String(css || ''));
  /** @type {CssSetting[]} */
  const settings = [];
  /** @type {string[]} */
  const problems = [], seen = new Set();
  if (!block) return { settings, problems };
  block[1].split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    /** @param {string} why */
    const bad = why => problems.push(`line ${i + 1}: ${why}`);
    const [kind0, name, ...rest] = line.split(/\s+/);
    const kind = kind0.toLowerCase() === 'color' ? 'colour' : kind0.toLowerCase();
    if (!['slider', 'colour', 'switch'].includes(kind)) return bad(`“${kind0.slice(0, 20)}” isn’t slider, colour or switch`);
    if (!NAME.test(name || '')) return bad('the name must be like --my-gap (small letters, digits and -)');
    if (seen.has(name)) return bad(`${name} is there twice`);
    if (settings.length >= MAX_SETTINGS) return bad(`at most ${MAX_SETTINGS} settings`);
    if (kind === 'slider') {
      const [lo, hi, st, def] = rest.slice(0, 4).map(amount);
      if (!lo || !hi || !st || !def) return bad('a slider needs lowest, highest, step and default, like 0 24 2 8px');
      const unit = def.unit || lo.unit;
      if (!(lo.n < hi.n) || !(st.n > 0) || (hi.n - lo.n) / st.n > 1000 || def.n < lo.n || def.n > hi.n) return bad('lowest < highest, a step above 0 and the default between them');
      settings.push({ kind, name, label: labelOf(rest.slice(4), name), min: lo.n, max: hi.n, step: st.n, def: def.n, unit });
    } else if (kind === 'colour') {
      if (!HEX.test(rest[0] || '')) return bad('a colour needs its default, like #ffcc00');
      settings.push({ kind, name, label: labelOf(rest.slice(1), name), def: rest[0].toLowerCase() });
    } else {
      const off = switchValue(rest[0]), on = switchValue(rest[1]);
      if (off == null || on == null) return bad('a switch needs its off and on values, like 4px 999px or none block');
      settings.push({ kind: 'switch', name, label: labelOf(rest.slice(2), name), off, on });
    }
    seen.add(name);
  });
  return { settings, problems };
}

// a chosen value as the setting allows it, or null (= its default)
/** @param {CssSetting} s @param {unknown} v @returns {number | string | boolean | null} */
export function cleanValue(s, v) {
  if (v == null) return null;
  if (s.kind === 'slider') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(s.max, Math.max(s.min, round4(s.min + Math.round((n - s.min) / s.step) * s.step))) : null;
  }
  if (s.kind === 'colour') return HEX.test(String(v)) ? String(v).toLowerCase() : null;
  return typeof v === 'boolean' ? v : null;
}
// the device's chosen values, only for settings the CSS still has
/** @param {CssSetting[]} settings @param {unknown} vals @returns {Record<string, number | string | boolean>} */
export function cleanValues(settings, vals) {
  /** @type {Record<string, number | string | boolean>} */
  const out = {};
  if (!vals || typeof vals !== 'object' || Array.isArray(vals)) return out;
  for (const s of settings) { const v = cleanValue(s, /** @type {Record<string, unknown>} */ (vals)[s.name]); if (v != null) out[s.name] = v; }
  return out;
}
/** @param {CssSetting} s @param {any} vals */
export const valueOf = (s, vals) => { const v = cleanValue(s, (vals || {})[s.name]); return v == null ? (s.kind === 'switch' ? false : s.def) : v; };
/** @param {CssSetting} s @param {any} v @returns {string} */
export const cssValue = (s, v) => (s.kind === 'slider' ? v + s.unit : s.kind === 'switch' ? (v ? s.on : s.off) : v);
// ':root { --a: 8px; … }', or '' when the CSS has no settings
/** @param {CssSetting[]} settings @param {unknown} vals */
export function settingsCss(settings, vals) {
  if (!settings.length) return '';
  return ':root { ' + settings.map(s => `${s.name}: ${cssValue(s, valueOf(s, vals))};`).join(' ') + ' }';
}

// ---- browser side ----

/** @type {CSSStyleSheet | null} */
let sheet = null;
/**
 * Shows custom CSS (with its settings' values) in one constructed stylesheet after the app's own, or takes it off.
 * Refused CSS is never shown; ?nocss in the address keeps it off for that visit.
 * @param {{ css?: unknown, values?: unknown }} [d]  css: the person's CSS; values: their settings' values
 * @param {{ off?: boolean }} [o]  off: leave it off here (the app's theme pages, so a bad rule can always be fixed)
 * @returns {boolean} shown
 */
export function applyCustomCss(d = {}, o = {}) {
  if (typeof document === 'undefined' || typeof CSSStyleSheet !== 'function' || !('adoptedStyleSheets' in document)) return false;
  const nocss = typeof location !== 'undefined' && new URLSearchParams(location.search).has('nocss');
  const c = checkCss(d.css);
  const text = o.off || nocss || !c.ok || !c.css ? '' : c.css + '\n' + settingsCss(parseSettings(c.css).settings, d.values);
  if (!sheet) { if (!text) return false; sheet = new CSSStyleSheet(); }
  sheet.replaceSync(text);
  // (last, so it wins over the theme's sheets)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets.filter(x => x !== sheet), sheet];
  return !!text;
}
