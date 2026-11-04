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
 * @param {string[]} samples @param {Palette} p @param {{ strong?: boolean, least?: number, linesOnly?: boolean, tint?: number }} [opts]
 * @returns {number}
 */
export function frostAlpha(samples: string[], p: Palette, { strong, least, linesOnly, tint }?: {
    strong?: boolean;
    least?: number;
    linesOnly?: boolean;
    tint?: number;
}): number;
/**
 * Whether every pair that sits on a card passes on the glass at strength a over every sample. The glass is the card
 * colour at a, then the accent at tint over it (glass.css --glass-bg: a look's --glass-tint, 7% on look A).
 * @param {string[]} samples @param {Palette} p @param {number} a
 * @param {{ strong?: boolean, linesOnly?: boolean, tint?: number }} [opts] @returns {boolean}
 */
export function glassPasses(samples: string[], p: Palette, a: number, { strong, linesOnly, tint }?: {
    strong?: boolean;
    linesOnly?: boolean;
    tint?: number;
}): boolean;
/**
 * The glass strengths for a palette: glass (bars, toasts), thick (sheets, over the backdrop) and clear (icon-only
 * controls: lines and the focus ring only, no text), and the accent tint the glass may take (at most the look's
 * `tint`, 0 to 1): lowered in 1% steps until the text still passes on glass at 98% (a violet link on a violet-tinted bar
 * fell under 4.5:1 at 7%, and a tint that only passed on solid glass made the bar solid), so the tint never costs
 * contrast and the glass stays see-through.
 * @param {Palette} p @param {{ strong?: boolean, tint?: number }} [opts]
 * @returns {{ glass: number, thick: number, clear: number, tint: number }}
 */
export function glassStrengths(p: Palette, { strong, tint }?: {
    strong?: boolean;
    tint?: number;
}): {
    glass: number;
    thick: number;
    clear: number;
    tint: number;
};
export function cleanHex(c: unknown): string | null;
export function mix(a: string, b: string, t: number): string;
export function luminance(h: string): number;
export function contrast(a: string, b: string): number;
export namespace STATUS {
    namespace light {
        let danger: string;
        let ok: string;
        let warn: string;
    }
    namespace dark {
        let danger_1: string;
        export { danger_1 as danger };
        let ok_1: string;
        export { ok_1 as ok };
        let warn_1: string;
        export { warn_1 as warn };
    }
}
export function pairs(strong: boolean): [string, string[], number][];
export const BACKDROP: 0.4;
/**
 * token name (no leading --) -> hex
 */
export type Palette = Record<string, string>;
