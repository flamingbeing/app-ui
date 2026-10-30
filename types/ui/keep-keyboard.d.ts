/** @typedef {{ handTo: (field: HTMLElement | null | undefined) => void, release: () => void, held: () => boolean }} KeyboardHold */
/**
 * @param {{ ms?: number, coarse?: boolean }} [o]  ms: how long the stand-in waits (default HOLD_MS);
 *   coarse: whether this is a touch screen (default: `(pointer: coarse)`)
 * @returns {KeyboardHold}
 */
export function holdKeyboard({ ms, coarse }?: {
    ms?: number;
    coarse?: boolean;
}): KeyboardHold;
/** How long a stand-in waits for its field. */
export const HOLD_MS: 3000;
export type KeyboardHold = {
    handTo: (field: HTMLElement | null | undefined) => void;
    release: () => void;
    held: () => boolean;
};
