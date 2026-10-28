/** @param {WallChoice} [d] @returns {string}  the CSS for a pattern (after the palette, so it follows light and dark), or '' */
export function patternCss(d?: WallChoice): string;
/** @param {string[]} samples @param {WallPalette} pal @returns {number} */
export function minDim(samples: string[], pal: WallPalette): number;
/** @param {string[]} samples @param {number} dim @param {WallPalette} pal */
export function frostAlpha(samples: string[], dim: number, pal: WallPalette): number;
/** The photo's main colour: the hue that covers most of it among colours with some colour in them (greys, near-black
 *  and near-white don't count), as the average of that hue's samples; null for a grey photo
 *  @param {string[]} samples @returns {string | null} */
export function mainColour(samples: string[]): string | null;
/** a colour from the page's computed style (#rgb, #rrggbb or rgb()) as #rrggbb, or null @param {unknown} v */
export function cssHex(v: unknown): string | null;
/**
 * The photo's keeper on this device: IndexedDB `db` (the app names it, so two apps on one address keep their own),
 * store 'files', key 'photo' -> { name, blob (JPEG), samples (#rrggbb, 32 x 32) }.
 * @param {string} db
 */
export function photoStore(db: string): {
    get: () => Promise<WallPhoto | null>;
    put: (rec: WallPhoto) => Promise<any>;
    remove: () => Promise<any>;
    save: (file: File) => Promise<WallPhoto>;
};
/** the colours of a 32 x 32 version of a picture (each one the average of its patch) @param {CanvasImageSource} source */
export function samplesOf(source: CanvasImageSource): string[];
/** the colour around a point of an <img> (a 5 x 5 average at its own resolution), for tap-to-pick
 *  @param {HTMLImageElement} img @param {number} fx @param {number} fy  0 to 1 */
export function colourAt(img: HTMLImageElement, fx: number, fy: number): string;
/** @typedef {{ label: string, ink: [string, number], css: (p: string) => string }} Pattern */
/** @typedef {{ wallpaper?: unknown, wallDim?: unknown, wallInk?: unknown }} WallChoice */
/** @typedef {{ bg: string, ink?: string, text?: string, muted?: string, accent?: string, panel?: string, surface?: string }} WallPalette
 *  logbook names (ink, panel) or the kit's (text, surface) */
/** @typedef {{ name: string, blob: Blob, samples: string[] }} WallPhoto */
/** @type {Readonly<Record<string, Pattern>>} */
export const PATTERNS: Readonly<Record<string, Pattern>>;
/** @type {[string, string][]}  the choices, in order: none, the patterns, a photo */
export const WALLPAPERS: [string, string][];
export function cleanPattern(v: unknown): string | null;
export function cleanWall(v: unknown): string | null;
export const INK_MIN: 6;
export const INK_MAX: 36;
export const INK_STEP: 6;
export function cleanInk(v: unknown): number | null;
export function inkOf(d: WallChoice | undefined): number;
export const DIM_MAX: 90;
export function cleanDim(v: unknown): number | null;
export function dimOf(d: WallChoice): number;
export function patternSamples(k: string, pal: WallPalette, pct?: unknown): string[];
export const TEXT_RATIO: 4.5;
export function textNeed(plain: number): number;
export function scrimFor(floor: number, dim: number): number;
export const FROST: 0.8;
export function hexOf(r: number, g: number, b: number): string;
export const MAX_PHOTO_BYTES: number;
export type Pattern = {
    label: string;
    ink: [string, number];
    css: (p: string) => string;
};
export type WallChoice = {
    wallpaper?: unknown;
    wallDim?: unknown;
    wallInk?: unknown;
};
/**
 * logbook names (ink, panel) or the kit's (text, surface)
 */
export type WallPalette = {
    bg: string;
    ink?: string;
    text?: string;
    muted?: string;
    accent?: string;
    panel?: string;
    surface?: string;
};
export type WallPhoto = {
    name: string;
    blob: Blob;
    samples: string[];
};
