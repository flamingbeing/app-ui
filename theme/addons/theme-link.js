// Add-on: theme links (ported from the logbook engine, link formats 2 and 3, byte for byte). A look as a link to send
// in a chat (…/app/#t=…); whoever opens it sees it at once, with Use / Cancel (the app's dialog). The link is input from
// anyone, so it goes through the app's own checks (lookOf, then safe): each setting they reject is dropped. Light or
// dark travels as a label only.
//
// The format: a preset unchanged is just its id. Any other look is written out in full, each setting as its place in
// the app's `keys` and its value as its place in that setting's list, its step from the lowest (numbers), or a colour.
// Nothing depends on what the presets look like now, so adding or changing presets never breaks a link. `keys` and
// each setting's list only ever grow at the end; every value says its kind, so a setting or value from a newer app is
// skipped and the rest kept. Format 3 writes each setting as its step on from the one before; a colour from the grid
// (colour-grid.js) as its place in it, one snapped to 6 bits a channel in 18 bits, any other in 24, so every colour
// still arrives exactly as sent; per-tab icons as places in two lists. Settings below `known` skip their 2-bit kind.
// Format 2 links keep opening; format 1 and `#theme=` links ask for a new one. Pure; unit-tested.

import { GRID, gridIndex, isSnapped, bits18, fromBits18 } from './colour-grid.js';
import { MODES, cleanName } from './saved-themes.js';

/** @typedef {import('./saved-themes.js').Look} LinkLook */
/** @typedef {{ kind: 'enum', values: readonly unknown[] } | { kind: 'int' | 'tune', min: number, step: number }
 *   | { kind: 'bool' | 'off' | 'colour' | 'icons' }} LinkField */
/**
 * @typedef {object} ThemeLinkOptions
 * @property {readonly string[]} keys  every setting a link may carry, in a fixed order that only grows at the end;
 *   a colour is 'light.<token>' / 'dark.<token>' (look.colours.light.<token>)
 * @property {(key: string) => LinkField | undefined} field  what a (non-colour) setting may hold
 * @property {(look: LinkLook) => LinkLook} lookOf  the app's look cleaner (only known settings and values)
 * @property {(look: LinkLook) => LinkLook} [safe]  drops what the app won't take from a link (colours that clash, fonts that
 *   aren't bundled); after lookOf
 * @property {{ id: string, name: string, look: LinkLook }[]} [presets]  the app's bundled themes (a link to one is its id)
 * @property {number} [known]  (format 3) how many of `keys` every format 3 reader knows: their values skip the kind
 * @property {readonly string[]} [tabs]  (format 3) the tab ids a per-tab icon is written with (only grows at the end)
 * @property {readonly string[]} [icons]  (format 3) the icon names, likewise
 * @property {string} [hashKey]  the address's key ('t')
 * @property {Partial<Record<'older' | 'newer' | 'missing' | 'broken', string>>} [messages]  what the person is told
 */

const MAX_LINK = 2000;
/** @param {string} str */
const bytesOf = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
/** @param {Uint8Array} bytes */
const b64uOf = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const SIDES = ['light', 'dark'];
// (format 3) white and black count as already sent (panels and button text often are), so each costs a few bits
const POOL3 = ['#ffffff', '#000000'];
// (format 3) a name of letters, digits, spaces and hyphens in 6 bits a letter
const NAME_CHARS = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
const MESSAGES = {
  older: 'That theme link is from an older version of the app: ask for a new one',
  newer: 'That theme link is from a newer version of the app: update it and open the link again',
  missing: 'That theme isn’t in this version of the app: update it and open the link again',
  broken: 'That theme link is broken or cut short: ask for it again',
};

class Bits {
  /** @param {Uint8Array} [bytes] */
  constructor(bytes, broken = () => { throw new Error(MESSAGES.broken); }) {
    /** @type {number[]} */
    this.b = bytes ? [...bytes].flatMap(x => [7, 6, 5, 4, 3, 2, 1, 0].map(i => (x >> i) & 1)) : [];
    this.i = 0; this.broken = broken;
  }
  /** @param {number} v @param {number} n */
  put(v, n) { for (let i = n - 1; i >= 0; i--) this.b.push(Math.floor(v / 2 ** i) % 2); }
  /** @param {number} n @returns {number} */
  get(n) { let v = 0; for (let k = 0; k < n; k++) { if (this.i >= this.b.length) this.broken(); v = v * 2 + this.b[this.i++]; } return v; }
  /** @param {number} v  4 bits at a time */
  num(v) { do { this.put(v > 15 ? 1 : 0, 1); this.put(v % 16, 4); v = Math.floor(v / 16); } while (v > 0); }
  getNum() { let v = 0, f = 1, more; do { more = this.get(1); v += this.get(4) * f; f *= 16; if (f > 2 ** 32) this.broken(); } while (more); return v; }
  /** @param {string} s */
  text(s) { const u = new TextEncoder().encode(s); this.num(u.length); for (const x of u) this.put(x, 8); }
  getText() { const n = this.getNum(); if (n > 400) this.broken(); return new TextDecoder().decode(Uint8Array.from({ length: n }, () => this.get(8))); }
  bytes() { const o = new Uint8Array(Math.ceil(this.b.length / 8)); this.b.forEach((x, i) => { o[i >> 3] |= x << (7 - (i & 7)); }); return o; }
}

/** a look with its colours as flat keys ('light.bg'), and back @param {LinkLook} look */
const flatLook = look => {
  const { colours, ...rest } = look;
  for (const s of SIDES) for (const [k, v] of Object.entries(colours?.[s] ?? {})) if (v) rest[`${s}.${k}`] = v;
  return rest;
};
/** @param {Record<string, any>} flat @returns {LinkLook} */
const unflatLook = flat => {
  /** @type {LinkLook} */
  const look = {};
  /** @type {Record<string, Record<string, string>>} */
  const colours = {};
  for (const [k, v] of Object.entries(flat)) { const [s, t] = k.split('.'); if (t) (colours[s] ||= {})[t] = v; else look[k] = v; }
  return Object.keys(colours).length ? { ...look, colours } : look;
};

/** @param {ThemeLinkOptions} o */
export function themeLinks(o) {
  const msg = { ...MESSAGES, ...o.messages }, KEY = o.hashKey ?? 't', OLD = 'theme';
  const keys = o.keys, known = o.known ?? 0, tabs = o.tabs ?? [], icons = o.icons ?? [], presets = o.presets ?? [];
  const safe = o.safe ?? (l => l);
  /** @returns {never} */
  const broken = () => { throw new Error(msg.broken); };
  /** @param {string} key @returns {LinkField | undefined} */
  const fieldOf = key => (key.includes('.') ? { kind: 'colour' } : o.field(key));

  /** @param {Bits} w @param {string} v @param {boolean} v3 */
  function putColour(w, v, v3) {
    if (!v3) return w.put(parseInt(v.slice(1), 16), 24);
    const g = gridIndex(v);
    return g >= 0 ? (w.put(2, 2), w.num(g)) : isSnapped(v) ? (w.put(0, 1), w.put(bits18(v), 18)) : (w.put(3, 2), w.put(parseInt(v.slice(1), 16), 24));
  }
  /** @param {Bits} r @param {boolean} v3 @returns {string} */
  const readColour = (r, v3) => {
    if (!v3) return '#' + r.get(24).toString(16).padStart(6, '0');
    if (r.get(1) === 0) return fromBits18(r.get(18));
    return r.get(1) === 0 ? (GRID[r.getNum()] ?? broken()).c : '#' + r.get(24).toString(16).padStart(6, '0');
  };
  /** @param {Bits} w @param {Record<string, string>} v @param {boolean} v3 */
  function putIcons(w, v, v3) {
    const pairs = Object.entries(v);
    if (!v3) return w.text(JSON.stringify(v));
    if (!pairs.every(([t, i]) => tabs.includes(t) && icons.includes(i))) return w.put(0, 1), w.text(JSON.stringify(v));
    w.put(1, 1); w.num(pairs.length);
    for (const [t, i] of pairs) { w.num(tabs.indexOf(t)); w.num(icons.indexOf(i)); }
  }
  /** @param {Bits} r @param {boolean} v3 */
  function readIcons(r, v3) {
    if (!v3 || r.get(1) === 0) { const t = r.getText(); try { return JSON.parse(t); } catch { return null; } }
    const n = r.getNum();
    /** @type {Record<string, string>} */
    const out = {};
    if (n > 50) broken();
    for (let j = 0; j < n; j++) { const t = tabs[r.getNum()], i = icons[r.getNum()]; if (t && i) out[t] = i; }
    return out;
  }
  /** @param {LinkField | undefined} f @param {any} v */
  const numOf = (f, v) => (f?.kind === 'enum' ? f.values.indexOf(v) : f?.kind === 'int' || f?.kind === 'tune' ? Math.round((v - f.min) / f.step) : 1);
  /** @param {Bits} w @param {string} key @param {any} v @param {string[]} pool @param {boolean} v3 @param {boolean} kn */
  function putValue(w, key, v, pool, v3, kn) {
    const f = fieldOf(key);
    if (f?.kind === 'colour') {
      const i = pool.indexOf(v);
      if (kn) { w.put(i >= 0 ? 1 : 0, 1); if (i >= 0) return w.num(i); pool.push(v); return putColour(w, v, true); }
      if (i >= 0) return w.put(2, 2), w.num(i);
      pool.push(v);
      return w.put(1, 2), putColour(w, v, v3);
    }
    if (f?.kind === 'icons') { if (!kn) w.put(3, 2); return putIcons(w, v, v3); }
    if (!kn) w.put(0, 2);
    w.num(numOf(f, v));
  }
  /** @param {Bits} r @param {string | undefined} key @param {string[]} pool @param {boolean} v3 @param {boolean} kn */
  function getValue(r, key, pool, v3, kn) {
    const f = key ? fieldOf(key) : undefined;
    const kind = !kn ? r.get(2) : f?.kind === 'colour' ? (r.get(1) ? 2 : 1) : f?.kind === 'icons' ? 3 : 0;
    if (kind === 1) { const c = readColour(r, v3); pool.push(c); return f?.kind === 'colour' ? c : null; }
    if (kind === 2) { const c = pool[r.getNum()] ?? broken(); return f?.kind === 'colour' ? c : null; }
    if (kind === 3) { const v = readIcons(r, v3); return f?.kind === 'icons' ? v : null; }
    const n = r.getNum();
    if (!f) return null;
    if (f.kind === 'enum') return f.values[n] ?? null;
    if (f.kind === 'int' || f.kind === 'tune') return Math.round((f.min + n * f.step) * 1000) / 1000;
    return f.kind === 'off' ? false : f.kind === 'bool' ? true : null;
  }
  /** @param {Bits} w @param {string} name */
  function v3Name(w, name) {
    if (![...name].every(c => NAME_CHARS.includes(c))) return w.put(0, 1), w.text(name);
    w.put(1, 1); w.num(name.length);
    for (const c of name) w.put(NAME_CHARS.indexOf(c), 6);
  }
  /** @param {Bits} r */
  function readName(r) {
    if (!r.get(1)) return r.getText();
    const n = r.getNum();
    if (n > 400) broken();
    return Array.from({ length: n }, () => NAME_CHARS[r.get(6)]).join('');
  }
  /** @param {LinkLook} look */
  const linkLook = look => safe(o.lookOf(look));

  /** a theme ({ name, look, mode }) as a link from the app's address (origin + path)
   *  @param {string} base @param {{ name?: unknown, look?: LinkLook, mode?: unknown }} t */
  function themeLink(base, t) {
    const look = safe(o.lookOf(t.look || {})), name = cleanName(t.name) || 'Shared theme';
    const same = JSON.stringify(look), bundled = presets.find(x => JSON.stringify(o.lookOf(x.look)) === same);
    const w = new Bits(undefined, broken);
    w.put(3, 2); w.put(0, 1);   // format 3 (the 0: a later format would say 1 and its number)
    w.put(MODES.indexOf(typeof t.mode === 'string' && MODES.includes(t.mode) ? t.mode : '') + 1, 3);
    if (bundled) { w.put(1, 1); w.text(bundled.id); }
    else {
      const flat = flatLook(look), ks = keys.filter(k => flat[k] != null), pool = [...POOL3];
      w.put(0, 1); v3Name(w, name); w.num(ks.length);
      let at = -1;
      for (const k of ks) { const i = keys.indexOf(k); w.num(i - at - 1); at = i; putValue(w, k, flat[k], pool, true, i < known); }
    }
    return `${base}#${KEY}=${b64uOf(w.bytes())}`;
  }
  /** @param {string} str @returns {{ name: string, look: LinkLook, mode?: string }} */
  function unpack(str) {
    const r = new Bits(bytesOf(str), broken);
    const format = r.get(2);
    if (format < 2) throw new Error(msg.older);
    const v3 = format === 3;
    if (v3 && r.get(1)) throw new Error(msg.newer);
    const mode = MODES[r.get(3) - 1] || null, also = mode ? { mode } : {};
    if (r.get(1)) {
      const id = r.getText(), p = presets.find(x => x.id === id);
      if (!p) throw new Error(msg.missing);
      return { name: p.name, look: o.lookOf(p.look), ...also };
    }
    const name = v3 ? readName(r) : r.getText(), n = r.getNum(), pool = v3 ? [...POOL3] : [];
    /** @type {Record<string, any>} */
    const flat = {};
    if (n > 500) broken();
    let at = -1;
    for (let j = 0; j < n; j++) {
      at = v3 ? at + 1 + r.getNum() : r.getNum();
      const k = keys[at], v = getValue(r, k, pool, v3, v3 && at < known);
      if (k && v != null) flat[k] = v;
    }
    return { name: cleanName(name) || 'Shared theme', look: linkLook(unflatLook(flat)), ...also };
  }
  /** does an address's hash hold a theme link? @param {unknown} hash */
  const isThemeLink = hash => new RegExp(`^#?(${KEY}|${OLD})=`).test(String(hash || ''));
  /** the theme in an address's #t=… (null when there is none); throws a message when it is there but unreadable
   *  @param {unknown} hash */
  function themeFromLink(hash) {
    const h = String(hash || '').split('?')[0];
    if (!isThemeLink(h)) return null;
    const m = new RegExp(`^#?(${KEY}|${OLD})=([A-Za-z0-9_-]+)$`).exec(h);
    if (m && m[1] === OLD) throw new Error(msg.older);
    if (!m || m[2].length > MAX_LINK) broken();
    const known3 = [msg.older, msg.newer, msg.missing];
    try { return unpack(/** @type {RegExpExecArray} */ (m)[2]); } catch (err) { if (known3.includes(/** @type {Error} */ (err).message)) throw err; return broken(); }
  }
  return { themeLink, themeFromLink, isThemeLink };
}
