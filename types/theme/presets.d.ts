/** @typedef {Record<string, string>} Tokens */
/** @typedef {{ label: string, light?: Tokens, dark?: Tokens }} Surface */
/**
 * @typedef {{ id: string, name: string, desc: string, accent?: string, surface?: string, round?: number,
 *   border?: number, shadow?: boolean, head?: 'serif', leading?: number, strong?: boolean }} Preset
 */
/** @type {Readonly<Record<string, Surface>>} */
export const SURFACES: Readonly<Record<string, Surface>>;
/** @type {readonly Preset[]} */
export const PRESETS: readonly Preset[];
export type Tokens = Record<string, string>;
export type Surface = {
    label: string;
    light?: Tokens;
    dark?: Tokens;
};
export type Preset = {
    id: string;
    name: string;
    desc: string;
    accent?: string;
    surface?: string;
    round?: number;
    border?: number;
    shadow?: boolean;
    head?: "serif";
    leading?: number;
    strong?: boolean;
};
