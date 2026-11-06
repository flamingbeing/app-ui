/**
 * How far a sheet or bar docked over the keyboard jumped (pure): the layout's bottom edge above the keyboard is the
 * page's height less the lift (with resizes-content the page shrinks and the lift stays 0; without it the lift grows).
 * Positive: it went up, so it starts that far down. 0 when the width changed (turned) or the keyboard was not involved,
 * or only the visible part scrolled (the keyboard's cover unchanged).
 * @param {{ inner: number, lift: number, open: boolean, covered: number, width: number }} was
 * @param {{ inner: number, lift: number, open: boolean, covered: number, width: number }} now
 * @returns {number}
 */
export function keyboardFollow(was: {
    inner: number;
    lift: number;
    open: boolean;
    covered: number;
    width: number;
}, now: {
    inner: number;
    lift: number;
    open: boolean;
    covered: number;
    width: number;
}): number;
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
/**
 * How far the bars over the keyboard reach up (pure): the tallest shown one.
 * @param {{ height: number, shown: boolean }[]} bars
 */
export function barCover(bars: {
    height: number;
    shown: boolean;
}[]): number;
/**
 * How far a scroller scrolls to bring the caret into sight (pure): 0 when it shows, else down past the bottom edge or
 * up past the top, keeping `margin` px clear. One taller than the room (a whole tall field) only moves if it is out of
 * sight altogether, its top then lined up at the top.
 * @param {{ top: number, bottom: number }} caret @param {{ top: number, bottom: number }} view @param {number} [margin]
 */
export function caretShift(caret: {
    top: number;
    bottom: number;
}, view: {
    top: number;
    bottom: number;
}, margin?: number): number;
/** Watches the keyboard; gives back the function that stops it. @returns {() => void} */
export function watchKeyboard(): () => void;
export const KEYBOARD_MIN: 150;
export const KEYBOARD_FOLLOW_MS: 190;
export const KEYBOARD_FOLLOW_EASE: "cubic-bezier(0, 0, .2, 1)";
/** What follows the keyboard's top on a phone; on a wide screen only OVER_KEYBOARD. */
export const FOLLOWS_KEYBOARD: "dialog.ui-sheet[open]:not([data-detent=\"large\"])";
/** The fixed bars that sit above the keyboard. */
export const OVER_KEYBOARD: ".ui-action-bar, [data-over-keyboard]";
/** The dialogs that close with the keyboard. */
export const KEYBOARD_CLOSES: "dialog[open][data-keyboard-close]";
export function closesWithKeyboard(dialog: {
    contains: (n: any) => boolean;
}, focus: unknown, { body, typing: isTyping }: {
    body: unknown;
    typing: (el: any) => boolean;
}): boolean;
