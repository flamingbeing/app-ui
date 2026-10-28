export const HUES: string[];
export const SHADES: 8;
export const GRID: {
    c: string;
    name: string;
    hue: string;
    shade: number;
}[];
export function gridIndex(c: unknown): number;
export function snap(c: unknown): string | null;
export function isSnapped(c: unknown): boolean;
export function bits18(c: string): number;
export function fromBits18(n: number): string;
export const MAX_RECENT: 8;
export function pushRecent(list: unknown, c: unknown): string[];
