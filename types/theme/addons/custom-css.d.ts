/** @param {unknown} text @returns {{ ok: boolean, css: string, problems: string[] }} */
export function checkCss(text: unknown): {
    ok: boolean;
    css: string;
    problems: string[];
};
/** @param {unknown} css @returns {{ settings: CssSetting[], problems: string[] }} */
export function parseSettings(css: unknown): {
    settings: CssSetting[];
    problems: string[];
};
/** @param {CssSetting} s @param {unknown} v @returns {number | string | boolean | null} */
export function cleanValue(s: CssSetting, v: unknown): number | string | boolean | null;
/** @param {CssSetting[]} settings @param {unknown} vals @returns {Record<string, number | string | boolean>} */
export function cleanValues(settings: CssSetting[], vals: unknown): Record<string, number | string | boolean>;
/** @param {CssSetting[]} settings @param {unknown} vals */
export function settingsCss(settings: CssSetting[], vals: unknown): string;
/**
 * Shows custom CSS (with its settings' values) in one constructed stylesheet after the app's own, or takes it off.
 * Refused CSS is never shown; ?nocss in the address keeps it off for that visit.
 * @param {{ css?: unknown, values?: unknown }} [d]  css: the person's CSS; values: their settings' values
 * @param {{ off?: boolean }} [o]  off: leave it off here (the app's theme pages, so a bad rule can always be fixed)
 * @returns {boolean} shown
 */
export function applyCustomCss(d?: {
    css?: unknown;
    values?: unknown;
}, o?: {
    off?: boolean;
}): boolean;
/** @typedef {{ kind: 'slider', name: string, label: string, min: number, max: number, step: number, def: number, unit: string }
 *   | { kind: 'colour', name: string, label: string, def: string }
 *   | { kind: 'switch', name: string, label: string, off: string, on: string }} CssSetting */
export const MAX_CSS: number;
export const MAX_SETTINGS: 24;
export function valueOf(s: CssSetting, vals: any): string | number | boolean;
export function cssValue(s: CssSetting, v: any): string;
export type CssSetting = {
    kind: "slider";
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    def: number;
    unit: string;
} | {
    kind: "colour";
    name: string;
    label: string;
    def: string;
} | {
    kind: "switch";
    name: string;
    label: string;
    off: string;
    on: string;
};
