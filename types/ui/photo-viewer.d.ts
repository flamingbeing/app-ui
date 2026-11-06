/**
 * A pinch's zoom and pan (pure): the point under the fingers stays under them, and follows them as they move.
 * m0, m: the fingers' midpoint (px from the box's centre) and spread at the start and now; s0, x0, y0: the zoom and pan
 * at the start. @param {{ x: number, y: number, d: number }} m0 @param {{ x: number, y: number, d: number }} m
 * @param {number} s0 @param {number} x0 @param {number} y0 @returns {{ s: number, x: number, y: number }}
 */
export function pinchTo(m0: {
    x: number;
    y: number;
    d: number;
}, m: {
    x: number;
    y: number;
    d: number;
}, s0: number, x0: number, y0: number): {
    s: number;
    x: number;
    y: number;
};
/** Which photo a sideways swipe lands on (pure): the next or the one before once it went past 18 % of the width or
 * was thrown that way (over 0.3 px/ms), else the same. @param {number} i @param {number} n @param {number} dx
 * @param {number} v @param {number} W */
export function swipeTo(i: number, n: number, dx: number, v: number, W: number): number;
/**
 * @param {HTMLDialogElement} dlg  an empty <dialog> to fill (an aria-label names it; "Photo" if it has none)
 * @param {{ steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } } | null,
 *   labels?: { close?: string, photo?: string }, onChange?: (i: number) => void }} [o]
 *   steps: the page's createTransients(), so Back closes it; labels: the close button's and the dialog's names;
 *   onChange: the photo shown changed (its index)
 * @returns {PhotoViewer}
 */
export function photoViewer(dlg: HTMLDialogElement, { steps, labels, onChange }?: {
    steps?: {
        open: (dismiss: () => void) => {
            readonly active: boolean;
            close: () => Promise<void>;
        };
    } | null;
    labels?: {
        close?: string;
        photo?: string;
    };
    onChange?: (i: number) => void;
}): PhotoViewer;
/** The most a photo zooms (times its fitted size), and how far a double-tap zooms in. */
export const VIEWER_MAX_ZOOM: 6;
export const VIEWER_TAP_ZOOM: 2.5;
/** Two taps this close in time (ms) and place (px) are a double-tap. */
export const DOUBLE_TAP_MS: 320;
/** A swipe down past this (px), or let go faster than CLOSE_SPEED (px/ms), closes the viewer. */
export const CLOSE_DROP: 110;
export const CLOSE_SPEED: 0.6;
export function panLimits(w: number, h: number, s: number, W: number, H: number): [number, number];
export function tapZoom(px: number, py: number, s: number): {
    s: number;
    x: number;
    y: number;
};
/**
 * src: the full photo; thumb: one already loaded (shown until src arrives); cap: the caption; alt: its text alternative
 */
export type ViewerPhoto = {
    src: string;
    thumb?: string;
    cap?: string;
    alt?: string;
};
export type PhotoViewer = {
    open: (photos: ViewerPhoto[], at?: number) => void;
    close: () => void;
    index: () => number;
    go: (n: number) => void;
    stop: () => void;
};
