// Add-on: saved themes (ported from the logbook engine; "Your themes"). Change a look and the app can keep it under a
// name of the person's own (this device), to pick again later like a preset; Export writes them to a file (.json),
// Import reads such a file back (only the look settings the app knows, checked). Day and night: with light or dark on
// Auto, a night theme ('mine:<id>' for a saved one, else a preset's id) is shown while the device is dark.
// The kit knows nothing of an app's look settings: the app passes how to clean a look (its schema) and its presets.
// Pure; unit-tested.

import { cleanFontFile } from './fonts.js';

/** @typedef {Record<string, any>} Look  an app's look settings (colours nested as { colours: { light, dark } }) */
/** @typedef {{ id: string, name: string, look: Look, mode?: string }} SavedTheme */
/** @typedef {{ id: string, name: string, look: Look }} Preset  one of the app's bundled themes */
/**
 * @typedef {object} SavedThemesOptions
 * @property {(d: Record<string, any>) => Look} lookOf  the look settings of a device's settings (only the set ones,
 *   each checked against what it may hold)
 * @property {string} fileKind  the `kind` an exported file carries (the app's own, so files don't cross apps)
 * @property {number} [max]  how many a device may keep (12)
 * @property {(look: Look) => void} [check]  throws a message when a look can't be kept (colours that clash)
 * @property {Preset[]} [presets]  the app's bundled themes (for a night theme by id)
 * @property {(patch: Record<string, any>, current: Record<string, any>) => Record<string, any>} [keep]  what the
 *   device keeps when changing theme (a photo wallpaper, say): put back into a patch
 * @property {(d: Record<string, any>) => Set<string>} [kept]  the settings the device keeps (they don't count when
 *   matching a saved theme)
 * @property {string[]} [keys]  every look setting (a patch sets the unset ones back to the default)
 * @property {(p: Preset, current: Record<string, any>) => Record<string, any>} [presetPatch]  the patch a preset puts on
 */

export const MODES = Object.freeze(['light', 'dark', 'oled', 'auto']);
/** @param {unknown} s */
export const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
const newId = () => Math.random().toString(36).slice(2, 10);
/** @type {[string, string][]}  font slots in a file -> the look setting that says "own font file" */
const FONT_SLOTS = [['ui', 'fontUi'], ['log', 'fontLog']];

/** @param {SavedThemesOptions} o */
export function savedThemes(o) {
  const max = o.max ?? 12, keep = o.keep ?? (p => p), kept = o.kept ?? (() => new Set()), presets = o.presets ?? [];
  /** @param {unknown} mode */
  const modeOf = mode => (typeof mode === 'string' && MODES.includes(mode) ? { mode } : {});

  /** @param {unknown} list @returns {SavedTheme[]}  only well-formed ones, names unique (any case), at most max */
  function cleanMine(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).filter(t => t && typeof t === 'object' && cleanName(t.name)).map(t => ({
      id: typeof t.id === 'string' && /^[a-z0-9]{1,12}$/.test(t.id) ? t.id : newId(),
      name: cleanName(t.name), look: o.lookOf(t.look || {}), ...modeOf(t.mode),
    })).filter(t => (seen.has(t.name.toLowerCase()) ? false : seen.add(t.name.toLowerCase()))).slice(0, max);
  }
  /** save the look now under a name: a theme of the same name is replaced; the newest first
   *  @param {unknown} list @param {unknown} name @param {Record<string, any>} d @param {string | null} [mode] @param {string} [id] */
  function saveMine(list, name, d, mode = null, id = newId()) {
    o.check?.(o.lookOf(d));
    const n = cleanName(name);
    if (!n) throw new Error('Give the theme a name');
    const rest = cleanMine(list).filter(t => t.name.toLowerCase() !== n.toLowerCase());
    if (rest.length >= max) throw new Error(`Up to ${max} themes of your own: delete one first`);
    return cleanMine([{ id, name: n, look: o.lookOf(d), ...modeOf(mode) }, ...rest]);
  }
  /** the patch that puts a saved theme on this device: every look setting (unset ones back to the default)
   *  @param {SavedTheme} t @param {Record<string, any>} [current] */
  const minePatch = (t, current = {}) => keep({ theme: null, ...Object.fromEntries((o.keys ?? Object.keys(t.look)).map(k => [k, t.look[k] ?? null])) }, current);
  /** the saved theme the device's look matches, if any @param {unknown} list @param {Record<string, any>} d */
  function matchMine(list, d) {
    const k = kept(d);
    /** @param {Look} look */
    const sig = look => JSON.stringify(Object.entries(o.lookOf(look)).filter(([x]) => !k.has(x)));
    const now = sig(d);
    return cleanMine(list).find(t => sig(t.look) === now) || null;
  }
  /** the file: { kind, version, themes }. fonts: a theme id -> { ui, log } font files ({ name, data: base64 }), carried
   *  for a theme whose font is an own font file, so it looks the same on the other phone
   *  @param {unknown} list @param {Record<string, Record<string, { name: string, data: string }>>} [fonts] */
  const exportText = (list, fonts = {}) => JSON.stringify({ kind: o.fileKind, version: 1, themes: cleanMine(list).map(({ id, ...t }) => {
    const f = Object.fromEntries(FONT_SLOTS.filter(([slot, k]) => t.look[k] === 'file' && fonts[id]?.[slot]).map(([slot]) => [slot, fonts[id][slot]]));
    return Object.keys(f).length ? { ...t, fonts: f } : t;
  }) }, null, 2);
  /** a file's themes, checked; added to the list (a name already there is replaced) -> { list, added, fonts }
   *  fonts: a theme id (in the new list) -> { ui, log } font files ({ name, data: ArrayBuffer }), each checked
   *  @param {unknown} text @param {unknown} list */
  function importText(text, list) {
    let data;
    try { data = JSON.parse(String(text || '')); } catch { throw new Error('That isn’t a themes file'); }
    const got = data && data.kind === o.fileKind && Array.isArray(data.themes) ? cleanMine(data.themes) : null;
    if (!got || !got.length) throw new Error('No themes in that file');
    for (const t of got) o.check?.(t.look);
    const names = new Set(got.map(t => t.name.toLowerCase()));
    const merged = [...got, ...cleanMine(list).filter(t => !names.has(t.name.toLowerCase()))];
    if (merged.length > max) throw new Error(`Up to ${max} themes of your own: delete some first`);
    const out = cleanMine(merged);
    /** @type {Record<string, Record<string, import('./fonts.js').FontFile>>} */
    const fonts = {};
    for (const raw of data.themes) {
      const t = raw && raw.fonts && typeof raw.fonts === 'object' && got.find(x => x.name === cleanName(raw.name));
      if (!t) continue;
      for (const [slot, k] of FONT_SLOTS) {
        const rec = t.look[k] === 'file' ? cleanFontFile(raw.fonts[slot]) : null;
        const mine = out.find(x => x.name === t.name);
        if (rec && mine) (fonts[mine.id] ||= {})[slot] = rec;
      }
    }
    return { list: out, added: got.length, fonts };
  }
  /** the night theme a device chose (nightTheme: 'mine:<id>' or a preset's id), or null
   *  @param {Record<string, any>} [d] @returns {{ mine: SavedTheme, name: string } | { preset: Preset, name: string } | null} */
  function nightRef(d = {}) {
    const ref = typeof d.nightTheme === 'string' ? d.nightTheme : '';
    if (ref.startsWith('mine:')) { const t = cleanMine(d.myThemes).find(x => x.id === ref.slice(5)); return t ? { mine: t, name: t.name } : null; }
    const p = presets.find(x => x.id === ref);
    return p ? { preset: p, name: p.name } : null;
  }
  /** the look to show now: d itself by day or with no night theme @param {Record<string, any>} [d] @param {boolean} [dark] */
  function lookNow(d = {}, dark = false) {
    const n = dark ? nightRef(d) : null;
    if (!n) return d;
    if ('mine' in n) return { ...d, ...minePatch(n.mine, d) };
    return { ...d, ...(o.presetPatch ? o.presetPatch(n.preset, d) : n.preset.look) };
  }
  return { max, cleanMine, saveMine, minePatch, matchMine, exportText, importText, nightRef, lookNow };
}
