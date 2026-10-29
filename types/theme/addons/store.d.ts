/** only the add-ons that are on and well-formed @param {unknown} v @returns {Addons} */
export function cleanAddons(v: unknown): Addons;
/** this device's add-ons @param {string} [key] @returns {Addons} */
export function addonChoice(key?: string): Addons;
/** change some add-ons (null or undefined turns one off) and keep them; returns what is kept now
 *  @param {Record<string, unknown>} patch @param {string} [key] @returns {Addons} */
export function chooseAddons(patch: Record<string, unknown>, key?: string): Addons;
/**
 * What to paint (0 to 1): dim (the page colour over the picture), floor (what text on the bare page needs), scrim (the
 * backing that text gets), frost (the card colour over the picture; 1 when off).
 * @param {Addons} d @param {import('./wallpaper.js').WallPalette | null} pal  the colours in use now (null: unknown) @param {string[]} [photoSamples]
 */
export function wallPaint(d: Addons, pal: import("./wallpaper.js").WallPalette | null, photoSamples?: string[]): {
    dim: number;
    floor: number;
    scrim: number;
    frost: number;
};
/** the kit's colours in use now, as #rrggbb, or null if one can't be read @returns {import('./wallpaper.js').WallPalette | null} */
export function pagePalette(): import("./wallpaper.js").WallPalette | null;
/**
 * Shows this device's add-ons (or the ones passed). Call again after light/dark or the palette changes, so the dim
 * and backing are worked out for the colours in use.
 * @param {Addons} [d]
 * @param {{ photos?: ReturnType<typeof import('./wallpaper.js').photoStore>, fonts?: ReturnType<typeof import('./fonts.js').fontStore>,
 *   stacks?: Record<string, string>, off?: boolean }} [o]  photos / fonts: the app's stores (photoStore, fontStore);
 *   stacks: the app's font stacks; off: leave custom CSS off here (the app's theme pages)
 * @returns {Promise<void>}
 */
export function applyAddons(d?: Addons, o?: {
    photos?: ReturnType<typeof import("./wallpaper.js").photoStore>;
    fonts?: ReturnType<typeof import("./fonts.js").fontStore>;
    stacks?: Record<string, string>;
    off?: boolean;
}): Promise<void>;
/** a new photo kept (or none): forget the one shown, then show again */
export function photoChanged(): void;
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
export const ADDONS_KEY: "core-addons";
export type Addons = {
    /**
     * a pattern or 'photo'
     */
    wallpaper?: string | undefined;
    /**
     * 0 to 90, in 5s
     */
    wallDim?: number | undefined;
    /**
     * a pattern's strength
     */
    wallInk?: number | undefined;
    /**
     * see-through cards (.ui-card)
     */
    wallFrost?: boolean | undefined;
    fontUi?: string | undefined;
    fontUiName?: string | undefined;
    fontLog?: string | undefined;
    fontLogName?: string | undefined;
    /**
     * custom CSS
     */
    css?: string | undefined;
    /**
     * its settings' values
     */
    cssValues?: Record<string, unknown> | undefined;
    /**
     * an icon set other than the default
     */
    icons?: string | undefined;
};
