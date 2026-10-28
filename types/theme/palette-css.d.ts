/**
 * The two palettes a choice shows: light, and dark (pure black when the dark style is OLED; a ground never tints OLED).
 * @param {Partial<Choice>} choice @param {AppTheme} [app] @returns {{ light: Palette, dark: Palette }}
 */
export function palettes(choice: Partial<Choice>, app?: AppTheme): {
    light: Palette;
    dark: Palette;
};
/** @param {Partial<Choice>} choice @returns {Record<string, string>}  shape and type tokens (the same in light and dark) */
export function shapeTokens(choice: Partial<Choice>): Record<string, string>;
/**
 * The glass colours for a palette (glass.css): the card colour at the strengths that keep its text readable over
 * anything scrolling under it (colour.js glassStrengths).
 * @param {Palette} p @param {Partial<Choice>} choice @returns {Record<string, string>}
 */
export function glassTokens(p: Palette, choice: Partial<Choice>): Record<string, string>;
/**
 * The CSS text for a choice: the look's tokens and the theme's shapes, light on :root, dark when chosen or when Auto
 * meets a dark device.
 * @param {Partial<Choice>} choice @param {AppTheme} [app] @returns {string}
 */
export function paletteCss(choice: Partial<Choice>, app?: AppTheme): string;
export const DEFAULT_ACCENT: "#3a6390";
export function accentOf(choice: Partial<Choice>, app?: AppTheme): string;
export type Choice = import("./schema.js").Choice;
export type Palette = import("./colour.js").Palette;
/**
 * the app's own defaults (config): accent colour,
 * look id, ground (SURFACES id)
 */
export type AppTheme = {
    accent?: string;
    look?: string;
    surface?: string;
};
