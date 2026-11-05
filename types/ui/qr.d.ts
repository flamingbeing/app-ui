/** @typedef {{ version: number, size: number, mask: number, modules: boolean[][] }} QrCode  modules[y][x]: true is dark */
/** The modules left for data and error correction in a version (pure). @param {number} ver */
export function rawModules(ver: number): number;
/** How many data bytes a version holds at level M, in byte mode (pure). @param {number} ver */
export function capacity(ver: number): number;
/** Where a version's alignment patterns are centred, on each axis (pure). @param {number} ver @returns {number[]} */
export function alignmentAt(ver: number): number[];
/**
 * The penalty of a finished code (pure): the standard's four rules (runs of five or more, 2 x 2 blocks, finder-like
 * patterns, the balance of dark and light). The mask with the lowest wins. @param {boolean[][]} m
 */
export function penalty(m: boolean[][]): number;
/**
 * The QR code of a text (pure): byte mode, level M, the smallest version that fits.
 * @param {string | Uint8Array} text  a string goes in as UTF-8
 * @param {{ mask?: number, minVersion?: number }} [o]  mask: 0-7 to use that mask (tests), else the best one
 * @returns {QrCode}
 * @throws {RangeError} when the text is longer than version 40 holds (2331 bytes)
 */
export function qrCode(text: string | Uint8Array, { mask, minVersion }?: {
    mask?: number;
    minVersion?: number;
}): QrCode;
/**
 * The dark modules as one SVG path (pure), a unit per module, each row's runs as rectangles, offset by the quiet
 * zone: draw it in a viewBox of size + 2 * quiet. @param {QrCode} code @param {number} [quiet]  modules of light edge (4)
 */
export function qrPath(code: QrCode, quiet?: number): string;
export function eccOf(data: number[], degree: number): number[];
/**
 * modules[y][x]: true is dark
 */
export type QrCode = {
    version: number;
    size: number;
    mask: number;
    modules: boolean[][];
};
