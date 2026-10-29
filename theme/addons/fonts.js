// Add-on: fonts (ported from the logbook engine). Per device, off by default: one font for the interface (--font, which
// --font-ui follows) and one for writing (--font-editor: an editor, a long text box), which follows the interface font
// unless set. A choice is a stack from STACKS, a font installed on this device by name ('named': not every browser
// allows it, Safari mostly doesn't), or a font file kept on this device only ('file', IndexedDB). The kit ships one font
// file, Inter (theme/fonts/, for the iOS look); an app that bundles others adds its own @font-face rules and passes its
// stacks (applyFonts' stacks).

/** @typedef {{ fontUi?: unknown, fontUiName?: unknown, fontLog?: unknown, fontLogName?: unknown }} FontChoice */
/** @typedef {{ name: string, data: ArrayBuffer }} FontFile */
/** @typedef {'ui' | 'log'} Slot */

/** @type {[string, string][]}  the choices, in order ('default': the app's own font) */
export const FONTS = [
  ['default', 'The app’s font (default)'],
  ['system', 'This device’s font'],
  ['atkinson', 'Atkinson Hyperlegible'],
  ['lexend', 'Lexend'],
  ['inter', 'Inter'],
  ['nunito', 'Nunito (rounded)'],
  ['plex', 'IBM Plex Sans'],
  ['sourceserif', 'Source Serif'],
  ['serif', 'Serif'],
  ['jetbrains', 'JetBrains Mono'],
  ['mono', 'Monospace'],
  ['named', 'A font installed on this device…'],
  ['file', 'Your own font file…'],
];
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** @type {Readonly<Record<string, string>>}  each choice's CSS font-family ('' for default: the kit's own --font) */
export const STACKS = Object.freeze({
  default: '',
  system: SANS,
  atkinson: `"Atkinson Hyperlegible Next", ${SANS}`,
  lexend: `"Lexend", ${SANS}`,
  inter: `"Inter", ${SANS}`,
  nunito: `"Nunito", ${SANS}`,
  plex: `"IBM Plex Sans", ${SANS}`,
  sourceserif: '"Source Serif 4", ui-serif, Georgia, serif',
  jetbrains: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
  serif: 'ui-serif, Charter, "Bitstream Charter", Georgia, "Noto Serif", "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
});
/** the fonts a saved theme or a theme link may set: the stacks, never a typed name or a file */
export const THEME_FONTS = Object.keys(STACKS);
export const MAX_FONT_BYTES = 3 * 1024 * 1024;
export const FONT_TYPES = /\.(woff2?|ttf|otf)$/i;

/** a typed font name: letters, digits, spaces and a few marks only (it goes into CSS), at most 60 characters
 *  @param {unknown} s */
export const cleanFontName = s => String(s || '').replace(/[^\p{L}\p{N} ._'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 60);
/** @param {Slot} slot  the family name an uploaded font is loaded under */
export const userFamily = slot => (slot === 'log' ? 'Own font (writing)' : 'Own font');
/**
 * The CSS font-family for a choice, or '' for the app's own.
 * @param {unknown} choice @param {unknown} [name]  a typed name ('named') @param {Slot} [slot]
 * @param {Record<string, string>} [stacks]  the app's stacks over STACKS (an app that bundles fonts, or its own default)
 */
export function fontStack(choice, name = '', slot = 'ui', stacks = {}) {
  const all = { ...STACKS, ...stacks }, fallback = all.default || SANS;
  if (choice === 'named' && cleanFontName(name)) return `"${cleanFontName(name).replace(/"/g, '')}", ${fallback}`;
  if (choice === 'file') return `"${userFamily(slot)}", ${fallback}`;
  return (typeof choice === 'string' && Object.hasOwn(all, choice) ? all[choice] : '') || all.default || '';
}
/** the writing font follows the interface font unless set (unset or 'same') @param {FontChoice} d */
export const logChoice = d => (d.fontLog && d.fontLog !== 'same' ? d.fontLog : null);

// An uploaded font in an exported themes file: { name, data } with the data as base64. Checked on the way in: a font
// file's name, at most 3 MB, and the first bytes of a woff2, woff, TrueType or OpenType font.
/** @param {FontFile} rec */
export const fontToFile = rec => ({ name: rec.name, data: b64(new Uint8Array(rec.data)) });
/** @param {Uint8Array} bytes */
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
const MAGIC = ['wOF2', 'wOFF', 'OTTO', 'true', '\u0000\u0001\u0000\u0000'];
/** @param {any} f @returns {FontFile | null} */
export function cleanFontFile(f) {
  if (!f || typeof f !== 'object' || typeof f.name !== 'string' || typeof f.data !== 'string') return null;
  const name = f.name.replace(/[\u0000-\u001f<>/\\]/g, '').trim().slice(0, 80);
  if (!FONT_TYPES.test(name) || f.data.length > Math.ceil(MAX_FONT_BYTES / 3) * 4) return null;
  let bytes;
  try { bytes = Uint8Array.from(atob(f.data), c => c.charCodeAt(0)); } catch { return null; }
  if (bytes.length < 12 || !MAGIC.includes(String.fromCharCode(...bytes.subarray(0, 4)))) return null;
  return { name, data: bytes.buffer };
}

// ---- browser side ----

/** is a font installed (by name)? compares text widths against two fallbacks, as fonts.check() can't tell
 *  @param {unknown} name */
export function fontAvailable(name) {
  const n = cleanFontName(name);
  if (!n || typeof document === 'undefined') return false;
  const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d'));
  const sample = 'mmmmmmmmmlli1O0WwQq@#';
  return ['monospace', 'serif'].some(base => {
    ctx.font = `32px ${base}`; const w0 = ctx.measureText(sample).width;
    ctx.font = `32px "${n}", ${base}`; return ctx.measureText(sample).width !== w0;
  });
}

/** @type {[Slot, 'fontUi' | 'fontLog'][]} */
const SLOTS = [['ui', 'fontUi'], ['log', 'fontLog']];

/**
 * Uploaded fonts on this device: IndexedDB `db` (the app names it), store 'files', key 'ui' | 'log' -> { name, data }.
 * Saved themes keep their own copy (key 'mine-<theme id>-<slot>'), so picking one later, or exporting it, brings
 * that font back even after the device's own font file has changed.
 * @param {string} db
 */
export function fontStore(db) {
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
  /** @type {Partial<Record<Slot, FontFace>>} */
  const loaded = {};
  /** @param {string} id @param {Slot} slot */
  const mineKey = (id, slot) => `mine-${id}-${slot}`;
  /** @param {Slot} slot @returns {Promise<FontFile | null>} */
  const get = slot => tx('readonly', s => s.get(slot)).then(r => r ?? null, () => null);
  /** @param {Slot} slot @param {ArrayBuffer} data */
  async function addFace(slot, data) {
    const face = new FontFace(userFamily(slot), data);
    await face.load();
    const old = loaded[slot];
    if (old) document.fonts.delete(old);
    document.fonts.add(face); loaded[slot] = face;
  }
  return {
    get,
    /** @param {Slot} slot */
    remove: slot => tx('readwrite', s => s.delete(slot)),
    /** @param {Slot} slot @returns {Promise<boolean>}  the device's font file is loaded (now or before) */
    async load(slot) {
      if (loaded[slot]) return true;
      const f = await get(slot);
      if (!f || !f.data) return false;
      await addFace(slot, f.data);
      return true;
    },
    /** a file the person picked: checked, tried, then kept; throws a message for the person
     *  @param {Slot} slot @param {File} file @returns {Promise<string>} its name */
    async save(slot, file) {
      if (!FONT_TYPES.test(file.name)) throw new Error('Choose a .woff2, .woff, .ttf or .otf font file');
      if (file.size > MAX_FONT_BYTES) throw new Error('That font file is over 3 MB');
      const data = await file.arrayBuffer();
      try { await addFace(slot, data); } catch { throw new Error('That file could not be read as a font'); }
      await tx('readwrite', s => s.put({ name: file.name, data }, slot));
      return file.name;
    },
    /** a saved theme keeps its own copy of the device's font file @param {{ id: string, look: Record<string, unknown> }} t */
    async keepForTheme(t) {
      for (const [slot, k] of SLOTS) if (t.look[k] === 'file') { const f = await get(slot); if (f?.data) await tx('readwrite', s => s.put(f, mineKey(t.id, slot))).catch(() => {}); }
    },
    /** a saved theme's fonts as { ui, log } for a file (base64), from its own copy or else this device's font
     *  @param {{ id: string, look: Record<string, unknown> }} t */
    async ofTheme(t) {
      /** @type {Partial<Record<Slot, { name: string, data: string }>>} */
      const out = {};
      for (const [slot, k] of SLOTS) if (t.look[k] === 'file') { const f = (await tx('readonly', s => s.get(mineKey(t.id, slot))).catch(() => null)) || await get(slot); if (f?.data) out[slot] = fontToFile(f); }
      return out;
    },
    /** fonts read from a themes file, kept for the theme @param {string} id @param {Partial<Record<Slot, FontFile>>} fonts */
    async putForTheme(id, fonts) {
      for (const [slot, f] of Object.entries(fonts || {})) await tx('readwrite', s => s.put(f, mineKey(id, /** @type {Slot} */ (slot))));
    },
    /** picking a saved theme: its font becomes this device's font file (shown at once)
     *  @param {{ id: string, look: Record<string, unknown> }} t */
    async useTheme(t) {
      for (const [slot, k] of SLOTS) {
        if (t.look[k] !== 'file') continue;
        const f = await tx('readonly', s => s.get(mineKey(t.id, slot))).catch(() => null);
        if (f?.data) { await tx('readwrite', s => s.put(f, slot)); await addFace(slot, f.data).catch(() => {}); }
      }
    },
    /** @param {string} id */
    dropTheme: id => Promise.all(/** @type {Slot[]} */ (['ui', 'log']).map(slot => tx('readwrite', s => s.delete(mineKey(id, slot))).catch(() => {}))),
  };
}

/**
 * Shows a font choice: sets --font (the interface) and --font-editor (writing) on <html>, or takes them off for the
 * app's own; loads an uploaded font when one is picked.
 * @param {FontChoice} [d]
 * @param {{ stacks?: Record<string, string>, store?: ReturnType<typeof fontStore> }} [o]
 */
export function applyFonts(d = {}, o = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  /** @param {string} prop @param {string} v */
  const set = (prop, v) => (v ? root.setProperty(prop, v) : root.removeProperty(prop));
  set('--font', fontStack(d.fontUi || 'default', d.fontUiName, 'ui', o.stacks));
  const lc = logChoice(d);
  set('--font-editor', lc ? fontStack(lc, d.fontLogName, 'log', o.stacks) : '');
  if (o.store) for (const [slot, choice] of /** @type {[Slot, unknown][]} */ ([['ui', d.fontUi], ['log', lc]])) if (choice === 'file') o.store.load(slot).catch(() => {});
}
