/**
 * An orbit loader, hidden from screen readers (the words beside it say what is loading).
 * @param {{ size?: number, dot?: number, class?: string }} [o]  size, dot: the ring's and a dot's size in px
 *   (default 34 and 4.5; the sync button's is 22 and 3); class: added after ui-orbit
 * @returns {HTMLSpanElement}
 */
export function orbit({ size, dot, class: cls }?: {
    size?: number;
    dot?: number;
    class?: string;
}): HTMLSpanElement;
/** The dots in a ring. */
export const ORBIT_DOTS: 5;
