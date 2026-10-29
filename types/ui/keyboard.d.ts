/**
 * Whether the keyboard is up and how far it covers the layout (pure).
 * @param {{ base: number, inner: number, height: number, top: number, editing: boolean }} s
 *   base: the tallest innerHeight seen at this width; inner: innerHeight now; height, top: the visual viewport's
 * @returns {{ open: boolean, lift: number }}
 */
export function keyboardState({ base, inner, height, top, editing }: {
    base: number;
    inner: number;
    height: number;
    top: number;
    editing: boolean;
}): {
    open: boolean;
    lift: number;
};
/** Watches the keyboard; gives back the function that stops it. @returns {() => void} */
export function watchKeyboard(): () => void;
export const KEYBOARD_MIN: 150;
