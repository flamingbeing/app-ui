/**
 * header: band (the large title on a band of the accent) | plain (on the page) | slim (no large title: the bar always
 *   shows the name)
 * menu: popover (the hold menu beside its row) | sheet (from the bottom, on phones)
 * glass: bars (all floating chrome) | pill (only the floating pills: action bar, toasts, a floating tab bar) | none
 * tick: round | square (select mode's ticks)
 * tabbar: float (a pill over the content) | edge (full width along the bottom)
 * family: core (the kit's own parts) | android (Material 3 parts: android.css restyles the same markup)
 * @typedef {{ header: 'band' | 'plain' | 'slim', menu: 'popover' | 'sheet', glass: 'bars' | 'pill' | 'none',
 *   tick: 'round' | 'square', tabbar: 'float' | 'edge', family: 'core' | 'android' }} Variants
 * tokens: custom properties (without the --) every look sets, the same keys in each: look-font-head, title-size,
 * title-weight, title-track, bar-line, card-r, list-inset, list-bg (the lists' ground), list-edge,
 * list-sep, list-shadow, row-weight, control-r, pill-r,
 * menu-r, sheet-r, tick-size, tab-active, glass-tint (how much accent the glass takes, a percentage)
 * palette: m3 (Material's colour roles from the accent as the seed, m3.js) | none (colour.js's palettes)
 * accent, surface (optional): the colour and the ground (presets.js SURFACES) the look falls back to when neither the
 * device, its theme nor the app names one
 * @typedef {{ id: string, name: string, desc: string, variants: Variants, tokens: Record<string, string>, palette?: 'm3',
 *   accent?: string, surface?: string }} Look
 */
/** @type {readonly Look[]} */
export const LOOKS: readonly Look[];
export const LOOK_IDS: readonly string[];
export const VARIANTS: Readonly<{
    header: string[];
    menu: string[];
    glass: string[];
    tick: string[];
    tabbar: string[];
    family: string[];
}>;
export const DEFAULT_LOOK: "a";
export function lookOf(id?: string, appLook?: string): Look;
/**
 * tokens: custom properties (without the --) every look sets, the same keys in each: look-font-head, title-size,
 * title-weight, title-track, bar-line, card-r, list-inset, list-bg (the lists' ground), list-edge,
 * list-sep, list-shadow, row-weight, control-r, pill-r,
 * menu-r, sheet-r, tick-size, tab-active, glass-tint (how much accent the glass takes, a percentage)
 * palette: m3 (Material's colour roles from the accent as the seed, m3.js) | none (colour.js's palettes)
 * accent, surface (optional): the colour and the ground (presets.js SURFACES) the look falls back to when neither the
 * device, its theme nor the app names one
 */
export type Variants = {
    header: "band" | "plain" | "slim";
    menu: "popover" | "sheet";
    glass: "bars" | "pill" | "none";
    tick: "round" | "square";
    tabbar: "float" | "edge";
    family: "core" | "android";
};
/**
 * header: band (the large title on a band of the accent) | plain (on the page) | slim (no large title: the bar always
 *   shows the name)
 * menu: popover (the hold menu beside its row) | sheet (from the bottom, on phones)
 * glass: bars (all floating chrome) | pill (only the floating pills: action bar, toasts, a floating tab bar) | none
 * tick: round | square (select mode's ticks)
 * tabbar: float (a pill over the content) | edge (full width along the bottom)
 * family: core (the kit's own parts) | android (Material 3 parts: android.css restyles the same markup)
 */
export type Look = {
    id: string;
    name: string;
    desc: string;
    variants: Variants;
    tokens: Record<string, string>;
    palette?: "m3";
    accent?: string;
    surface?: string;
};
