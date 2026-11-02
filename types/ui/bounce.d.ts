/** A sticky part is stuck to an edge (pure): its top at its `top` inset from the scrollport's top once the scroller has
 * left its top, or its bottom at its `bottom` inset from the port's foot before the scroller's end. Not stuck, it is
 * where the content puts it, so it moves with the content.
 * @param {{ top: string, bottom: string }} inset its computed `top` and `bottom` ('auto' or px)
 * @param {{ top: number, bottom: number }} rect where it is @param {{ top: number, bottom: number }} port the scrollport
 * @param {number} pos the scroller's scroll @param {number} max its furthest scroll */
export function stuck(inset: {
    top: string;
    bottom: string;
}, rect: {
    top: number;
    bottom: number;
}, port: {
    top: number;
    bottom: number;
}, pos: number, max: number): boolean;
/**
 * Starts the bounce for touches on `root` (the page by default).
 * @param {ParentNode & EventTarget} [root]
 * @returns {() => void} stop
 */
export function bounce(root?: ParentNode & EventTarget): () => void;
export function rubberSlope(d: number, w: number): number;
