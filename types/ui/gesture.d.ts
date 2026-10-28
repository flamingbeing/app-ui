/**
 * Less motion: the device's Reduce Motion, or Still in the theme switch (data-motion="still" on <html>). Read each
 * time, as either can change while the page is open.
 * @returns {boolean}
 */
export function still(): boolean;
/**
 * Places a gesture never starts from: fields, dialogs (outside the sheet part's own handling), drag handles, things
 * that scroll sideways, and anything marked data-no-gesture.
 * @param {EventTarget | null} target
 * @param {{ inDialog?: boolean }} [opts]  inDialog: the caller is a dialog's own part, so dialogs don't count
 */
export function noGesture(target: EventTarget | null, { inDialog }?: {
    inDialog?: boolean;
}): boolean;
/**
 * A light tap: navigator.vibrate where there is one (Android); on iPhone (iOS 18 and later) toggling a hidden
 * <input switch> through its label gives the system's own haptic, the only one a web page can reach there.
 */
export function haptic(): void;
/**
 * Adds listeners and gives back one function that removes them all.
 * @returns {{ on: (t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) => void, stop: () => void }}
 */
export function listeners(): {
    on: (t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) => void;
    stop: () => void;
};
/**
 * Velocity (px per ms) over the last few samples [time, position].
 * @param {[number, number][]} samples
 */
export function velocity(samples: [number, number][]): number;
/** a hold: this long (ms) without moving more than SLOP (px) */
export const HOLD_MS: 500;
export const SLOP: 10;
