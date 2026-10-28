export const HUES: readonly string[];
export const SHADES: 8;
/** @typedef {{ c: string, name: string, hue: string, shade: number }} Cell */
/** @type {readonly Cell[]} */
export const GRID: readonly Cell[];
export function gridIndex(c: unknown): number;
export function snap(c: unknown): string | null;
export type Cell = {
    c: string;
    name: string;
    hue: string;
    shade: number;
};
