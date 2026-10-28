/**
 * The saved list made safe: known kinds, short words, no repeats; past MAX_HIDDEN the oldest go.
 * @param {unknown} v
 * @returns {Hidden[]}
 */
export function cleanHideList(v: unknown): Hidden[];
/** the words that name an element: a button's label, a card's first heading (none: it can't be hidden) @param {Element} el */
export function nameOf(el: Element): string;
/**
 * Why it can't be hidden, or '' when it can.
 * @param {Element} el
 * @param {{ keepOut?: string }} [o]  keepOut: a selector for the app's bars and pop-ups, added to the built-in ones
 */
export function keptBecause(el: Element, { keepOut }?: {
    keepOut?: string;
}): "" | "The bars and pop-ups always stay." | "It holds the main button or an input, which always stay." | "It has no name to find it by again." | "The main button, Save and inputs always stay." | "Choices between options always stay, so you can always switch back." | "Its name changes with your data (a date or a count), so it can’t be found again.";
/** the element a tap is about: the button tapped, else the card around it @param {Element} node */
export function targetOf(node: Element): Element | null;
/**
 * Hide the listed items of this page in root (class user-hidden); with hide mode on (marking), mark what can go
 * (class hide-cand).
 * @param {ParentNode | null} root @param {string} tab @param {unknown} list
 * @param {{ free?: boolean, marking?: boolean, keepOut?: string }} [o]  free: show everything (hide mode's owner is
 *   looking at the list); marking: hide mode is on
 */
export function applyHidden(root: ParentNode | null, tab: string, list: unknown, { free, marking, keepOut }?: {
    free?: boolean;
    marking?: boolean;
    keepOut?: string;
}): void;
export const MAX_HIDDEN: 100;
export function hideKey(x: Hidden): string;
export function entryFor(el: Element, tab: string): Hidden;
/**
 * tab: the page (letters and digits)
 */
export type Hidden = {
    tab: string;
    kind: "btn" | "card";
    name: string;
};
