/**
 * The colour, lighter or darker in small steps until it reaches `ratio` against every colour in `on` (lighter when
 * the first of them is dark). Ends at white or black if nothing short of that passes.
 * @param {string} c @param {string[]} on @param {number} ratio @returns {string}
 */
export function nudge(c: string, on: string[], ratio: number): string;
/** @param {string} accent @returns {Palette} */
export function lightPalette(accent: string): Palette;
/** @param {string} accent @param {boolean} [oled]  pure black pages and cards @returns {Palette} */
export function darkPalette(accent: string, oled?: boolean): Palette;
/**
 * The palette with its role tokens filled in (fill, on-fill, link, focus, band, on-band follow the accent unless set)
 * and every pair brought up to its floor: the token on the left is nudged (never the ground it sits on).
 * @param {Palette} p @param {{ strong?: boolean }} [opts] @returns {Palette}
 */
export function floor(p: Palette, { strong }?: {
    strong?: boolean;
}): Palette;
/**
 * Each pair that misses its floor, as "token on ground: ratio:1 (needs n:1)" lines (empty = all pass).
 * @param {Palette} p @param {{ strong?: boolean }} [opts] @returns {string[]}
 */
export function checkPalette(p: Palette, { strong }?: {
    strong?: boolean;
}): string[];
/**
 * The colours that can show through glass: the page and card grounds, the fill (a filled button), and text as the blur
 * spreads it; `shaded` puts them under the backdrop first (a sheet).
 * @param {Palette} p @param {boolean} [shaded] @returns {string[]}
 */
export function glassSamples(p: Palette, shaded?: boolean): string[];
/**
 * How much card colour the glass needs (0 to 1, in 0.01 steps, never under `least`): the lowest strength at which
 * every pair that sits on the page or a card (text, status, lines: pairs) reaches its floor over every sample. Always
 * reached by 1 (the solid card colour), which floor() already brought up to every pair. linesOnly: only lines and the
 * focus ring count (glass that carries no text).
 * @param {string[]} samples @param {Palette} p @param {{ strong?: boolean, least?: number, linesOnly?: boolean }} [opts]
 * @returns {number}
 */
export function frostAlpha(samples: string[], p: Palette, { strong, least, linesOnly }?: {
    strong?: boolean;
    least?: number;
    linesOnly?: boolean;
}): number;
/**
 * The glass strengths for a palette: glass (bars, toasts), thick (sheets, over the backdrop) and clear (icon-only
 * controls: lines and the focus ring only, no text).
 * @param {Palette} p @param {{ strong?: boolean }} [opts] @returns {{ glass: number, thick: number, clear: number }}
 */
export function glassStrengths(p: Palette, { strong }?: {
    strong?: boolean;
}): {
    glass: number;
    thick: number;
    clear: number;
};
export function cleanHex(c: unknown): string | null;
export function mix(a: string, b: string, t: number): string;
export function luminance(h: string): number;
export function contrast(a: string, b: string): number;
export function pairs(strong: boolean): [string, string[], number][];
export const BACKDROP: 0.4;
/**
 * token name (no leading --) -> hex
 */
export type Palette = Record<string, string>;
