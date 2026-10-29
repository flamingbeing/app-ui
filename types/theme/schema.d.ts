/** @param {unknown} raw  anything (a stored object, a v0 { theme, layout }) @returns {Choice}  only allowed values */
export function cleanChoice(raw: unknown): Choice;
export const THEMES: readonly string[];
export const DARK_STYLES: readonly string[];
export const PRESET_IDS: readonly string[];
export const SURFACE_IDS: readonly string[];
export const DENSITIES: readonly string[];
/** @deprecated v0's name for the densities */
export const LAYOUTS: readonly string[];
export const MATERIALS: readonly string[];
export const MOTIONS: readonly string[];
export const HAPTICS: readonly string[];
/**
 * look: '' = the app's default look (applyTheme({ look })), else one of looks.js
 * accent: '' = the preset's (or the app's) colour, else a six-digit hex
 */
export type Choice = {
    theme: string;
    dark: string;
    preset: string;
    accent: string;
    surface: string;
    look: string;
    density: string;
    material: string;
    motion: string;
    haptics: string;
};
