/**
 * A glide: a spring from where a finger let go to where it rests.
 * @typedef {{ from: number, to: number, path: number[], at: () => number, stop: () => number,
 *   done: Promise<boolean>, running: () => boolean }} Glide
 *   at: where it is now; stop: stops it there (a finger caught it) and gives that place; done: true once it lands,
 *   false if stopped first. A landed glide holds its last frame until stop() (set the resting styles, then stop).
 */
/**
 * Glides `parts` from `from` to `to` on a critically damped spring that starts at the finger's speed v (px/ms) and
 * lands without overshoot (springPath; about a third of a second). Each part is an element and the keyframe it shows
 * at a place x, transform or opacity only (the compositor runs them; no layout per frame).
 * @param {[Element, (x: number) => Keyframe][]} parts
 * @param {number} from @param {number} to @param {number} [v] @param {{ response?: number }} [o]  response: the spring's, in s
 * @returns {Glide}
 */
export function glide(parts: [Element, (x: number) => Keyframe][], from: number, to: number, v?: number, { response }?: {
    response?: number;
}): Glide;
/**
 * The same spring for a value that isn't an element's transform or opacity (a height, a scroll): apply(x) once a
 * frame (requestAnimationFrame). Prefer glide(): this one runs on the main thread.
 * @param {(x: number) => void} apply @param {number} from @param {number} to @param {number} [v] @param {{ response?: number }} [o]
 * @returns {Glide}
 */
export function spring(apply: (x: number) => void, from: number, to: number, v?: number, { response }?: {
    response?: number;
}): Glide;
/**
 * A finger's let-go speed: add() each move (time, place along the axis), speed(now) at the let-go (over about its
 * last 100 ms, so a finger that stopped before it lifted throws nothing).
 * @returns {{ reset: (t: number, x: number) => void, add: (t: number, x: number) => void, speed: (now: number) => number }}
 */
export function tracker(): {
    reset: (t: number, x: number) => void;
    add: (t: number, x: number) => void;
    speed: (now: number) => number;
};
/**
 * A drag along one axis of `el`, glued to the finger (pointer events; a mouse too with mouse: true). touch-action is
 * set so the browser keeps only the other axis's scroll (pan-y for 'x', pan-x for 'y'). The drag starts once the
 * finger has clearly gone along the axis (8 px, swipeIntent); a move the other way is left to the page. start() may
 * give the place the drag starts from (a caught glide's); past bounds() the move stretches (rubber band). end() gets
 * the place and the let-go speed (px/ms, 0 when the browser cancelled the touch); a drag that moved swallows the
 * click that follows.
 * @param {HTMLElement} el
 * @param {{ axis?: 'x' | 'y', mouse?: boolean, filter?: (e: PointerEvent) => boolean, start?: (e: PointerEvent) => number | void,
 *   move: (x: number, e: PointerEvent) => void, end: (x: number, v: number) => void, bounds?: () => [number, number] }} o
 * @returns {() => void} stop
 */
export function drag(el: HTMLElement, { axis, mouse, filter, start, move, end, bounds }: {
    axis?: "x" | "y";
    mouse?: boolean;
    filter?: (e: PointerEvent) => boolean;
    start?: (e: PointerEvent) => number | void;
    move: (x: number, e: PointerEvent) => void;
    end: (x: number, v: number) => void;
    bounds?: () => [number, number];
}): () => void;
/** A finger is down, or a drag's glide is still moving: the time to hold heavy work. @returns {boolean} */
export function gesturing(): boolean;
/**
 * Runs fn once the fingers have lifted and the glides have landed (a frame after, so the landing paints first); at
 * once, a frame later, when nothing is moving. The same fn asked for twice runs once. A finger held down longer than
 * maxWait (ms) doesn't hold it for ever. Use it for saves, syncs and re-renders a gesture starts.
 * @param {() => void} fn @param {{ maxWait?: number }} [o]
 * @returns {() => void} cancel
 */
export function afterGesture(fn: () => void, { maxWait }?: {
    maxWait?: number;
}): () => void;
/**
 * Marks the control a finger (or pen) lands on pressed at once (data-pressed; theme.css styles it), without the
 * browser's wait to see whether the touch is a scroll; a scroll, a move past SLOP or the lift clears it, after one
 * painted frame at least. A mouse keeps the browser's own :active.
 * @param {ParentNode & EventTarget} [root]
 * @returns {() => void} stop
 */
export function pressFeedback(root?: ParentNode & EventTarget): () => void;
/** What shows pressed: buttons, tabs, menu items, rows that open something, and anything marked data-press. */
export const PRESSABLE: "button, [role=\"button\"], .ui-tab, .ui-menu-item, a.ui-row, .ui-row[tabindex], .ui-row[data-push], summary, [data-press]";
/**
 * at: where it is now; stop: stops it there (a finger caught it) and gives that place; done: true once it lands,
 * false if stopped first. A landed glide holds its last frame until stop() (set the resting styles, then stop).
 */
export type Glide = {
    from: number;
    to: number;
    path: number[];
    at: () => number;
    stop: () => number;
    done: Promise<boolean>;
    running: () => boolean;
};
export { rubber, unrubber, springPath, releaseVelocity, swipeIntent, THROW_MS, SPRING_S, still } from "./gesture.js";
