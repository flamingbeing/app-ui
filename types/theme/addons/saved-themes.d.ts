/** @param {SavedThemesOptions} o */
export function savedThemes(o: SavedThemesOptions): {
    max: number;
    cleanMine: (list: unknown) => SavedTheme[];
    saveMine: (list: unknown, name: unknown, d: Record<string, any>, mode?: string | null, id?: string) => SavedTheme[];
    minePatch: (t: SavedTheme, current?: Record<string, any>) => Record<string, any>;
    matchMine: (list: unknown, d: Record<string, any>) => SavedTheme | null;
    exportText: (list: unknown, fonts?: Record<string, Record<string, {
        name: string;
        data: string;
    }>>) => string;
    importText: (text: unknown, list: unknown) => {
        list: SavedTheme[];
        added: number;
        fonts: Record<string, Record<string, import("./fonts.js").FontFile>>;
    };
    nightRef: (d?: Record<string, any>) => {
        mine: SavedTheme;
        name: string;
    } | {
        preset: Preset;
        name: string;
    } | null;
    lookNow: (d?: Record<string, any>, dark?: boolean) => Record<string, any>;
};
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
export const MODES: readonly string[];
export function cleanName(s: unknown): string;
/**
 * an app's look settings (colours nested as { colours: { light, dark } })
 */
export type Look = Record<string, any>;
export type SavedTheme = {
    id: string;
    name: string;
    look: Look;
    mode?: string;
};
/**
 * one of the app's bundled themes
 */
export type Preset = {
    id: string;
    name: string;
    look: Look;
};
export type SavedThemesOptions = {
    /**
     * the look settings of a device's settings (only the set ones,
     * each checked against what it may hold)
     */
    lookOf: (d: Record<string, any>) => Look;
    /**
     * the `kind` an exported file carries (the app's own, so files don't cross apps)
     */
    fileKind: string;
    /**
     * how many a device may keep (12)
     */
    max?: number | undefined;
    /**
     * throws a message when a look can't be kept (colours that clash)
     */
    check?: ((look: Look) => void) | undefined;
    /**
     * the app's bundled themes (for a night theme by id)
     */
    presets?: Preset[] | undefined;
    /**
     * what the
     * device keeps when changing theme (a photo wallpaper, say): put back into a patch
     */
    keep?: ((patch: Record<string, any>, current: Record<string, any>) => Record<string, any>) | undefined;
    /**
     * the settings the device keeps (they don't count when
     * matching a saved theme)
     */
    kept?: ((d: Record<string, any>) => Set<string>) | undefined;
    /**
     * every look setting (a patch sets the unset ones back to the default)
     */
    keys?: string[] | undefined;
    /**
     * the patch a preset puts on
     */
    presetPatch?: ((p: Preset, current: Record<string, any>) => Record<string, any>) | undefined;
};
