/** @param {string | null} stored  what KEY holds -> the choice it names, defaults where it names none */
export function parseChoice(stored: string | null): import("./schema.js").Choice;
/** @returns {Choice} */
export function themeChoice(): Choice;
/**
 * Shows this device's choice; call once, as early as the page can (the starter's boot.js, before first paint).
 * Starts the glass guard too (guard.js): its verdict, once found, shows the choice again.
 * @param {import('./palette-css.js').AppTheme} [appTheme]  the app's own defaults: accent, its colour (hex); look,
 *   the look a device that picked none gets (looks.js ids; none: A); surface, the ground a device that picked none
 *   gets (schema.js SURFACE_IDS; none: theme.css's); layer, the cascade layer the palette sheet goes in; ownTheme, the
 *   app keeps data-theme (and its browser bar colour) itself
 */
export function applyTheme(appTheme?: import("./palette-css.js").AppTheme): void;
/** @param {Partial<Choice>} change  shows the choice with this change on this page only, keeping nothing (the
 *  gallery's ?look= links) @returns {Choice} */
export function previewTheme(change: Partial<Choice>): Choice;
/** @param {Partial<Choice>} change  -> the choice now (kept on this device when storage allows) */
export function chooseTheme(change: Partial<Choice>): import("./schema.js").Choice;
export const MARKS: readonly string[];
export function pickedAccent(): string;
export function glassOn(c: Choice): boolean;
export function shownLook(): string;
export type Choice = import("./schema.js").Choice;
import { THEMES } from './schema.js';
import { LAYOUTS } from './schema.js';
import { DENSITIES } from './schema.js';
export { THEMES, LAYOUTS, DENSITIES };
