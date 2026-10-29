/**
 * The CSS font-family for a choice, or '' for the app's own.
 * @param {unknown} choice @param {unknown} [name]  a typed name ('named') @param {Slot} [slot]
 * @param {Record<string, string>} [stacks]  the app's stacks over STACKS (an app that bundles fonts, or its own default)
 */
export function fontStack(choice: unknown, name?: unknown, slot?: Slot, stacks?: Record<string, string>): string;
/** @param {any} f @returns {FontFile | null} */
export function cleanFontFile(f: any): FontFile | null;
/** is a font installed (by name)? compares text widths against two fallbacks, as fonts.check() can't tell
 *  @param {unknown} name */
export function fontAvailable(name: unknown): boolean;
/**
 * Uploaded fonts on this device: IndexedDB `db` (the app names it), store 'files', key 'ui' | 'log' -> { name, data }.
 * Saved themes keep their own copy (key 'mine-<theme id>-<slot>'), so picking one later, or exporting it, brings
 * that font back even after the device's own font file has changed.
 * @param {string} db
 */
export function fontStore(db: string): {
    get: (slot: Slot) => Promise<FontFile | null>;
    /** @param {Slot} slot */
    remove: (slot: Slot) => Promise<any>;
    /** @param {Slot} slot @returns {Promise<boolean>}  the device's font file is loaded (now or before) */
    load(slot: Slot): Promise<boolean>;
    /** a file the person picked: checked, tried, then kept; throws a message for the person
     *  @param {Slot} slot @param {File} file @returns {Promise<string>} its name */
    save(slot: Slot, file: File): Promise<string>;
    /** a saved theme keeps its own copy of the device's font file @param {{ id: string, look: Record<string, unknown> }} t */
    keepForTheme(t: {
        id: string;
        look: Record<string, unknown>;
    }): Promise<void>;
    /** a saved theme's fonts as { ui, log } for a file (base64), from its own copy or else this device's font
     *  @param {{ id: string, look: Record<string, unknown> }} t */
    ofTheme(t: {
        id: string;
        look: Record<string, unknown>;
    }): Promise<Partial<Record<Slot, {
        name: string;
        data: string;
    }>>>;
    /** fonts read from a themes file, kept for the theme @param {string} id @param {Partial<Record<Slot, FontFile>>} fonts */
    putForTheme(id: string, fonts: Partial<Record<Slot, FontFile>>): Promise<void>;
    /** picking a saved theme: its font becomes this device's font file (shown at once)
     *  @param {{ id: string, look: Record<string, unknown> }} t */
    useTheme(t: {
        id: string;
        look: Record<string, unknown>;
    }): Promise<void>;
    /** @param {string} id */
    dropTheme: (id: string) => Promise<any[]>;
};
/**
 * Shows a font choice: sets --font (the interface) and --font-editor (writing) on <html>, or takes them off for the
 * app's own; loads an uploaded font when one is picked.
 * @param {FontChoice} [d]
 * @param {{ stacks?: Record<string, string>, store?: ReturnType<typeof fontStore> }} [o]
 */
export function applyFonts(d?: FontChoice, o?: {
    stacks?: Record<string, string>;
    store?: ReturnType<typeof fontStore>;
}): void;
/** @typedef {{ fontUi?: unknown, fontUiName?: unknown, fontLog?: unknown, fontLogName?: unknown }} FontChoice */
/** @typedef {{ name: string, data: ArrayBuffer }} FontFile */
/** @typedef {'ui' | 'log'} Slot */
/** @type {[string, string][]}  the choices, in order ('default': the app's own font) */
export const FONTS: [string, string][];
/** @type {Readonly<Record<string, string>>}  each choice's CSS font-family ('' for default: the kit's own --font) */
export const STACKS: Readonly<Record<string, string>>;
/** the fonts a saved theme or a theme link may set: the stacks, never a typed name or a file */
export const THEME_FONTS: string[];
export const MAX_FONT_BYTES: number;
export const FONT_TYPES: RegExp;
export function cleanFontName(s: unknown): string;
export function userFamily(slot: Slot): "Own font (writing)" | "Own font";
export function logChoice(d: FontChoice): {} | null;
export function fontToFile(rec: FontFile): {
    name: string;
    data: string;
};
export type FontChoice = {
    fontUi?: unknown;
    fontUiName?: unknown;
    fontLog?: unknown;
    fontLogName?: unknown;
};
export type FontFile = {
    name: string;
    data: ArrayBuffer;
};
export type Slot = "ui" | "log";
