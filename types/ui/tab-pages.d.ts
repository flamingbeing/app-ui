/** A first move's direction (pure): 'x' a sideways swipe, 'y' a scroll, null not far enough to tell. A swipe is under
 * about 37° from the horizontal. @param {number} mx @param {number} my */
export function swipeIntent(mx: number, my: number): "x" | "y" | null;
/** Where a let-go swipe goes (pure): 1 the next page, -1 the previous one, 0 back to this one. Like iOS's paging,
 * the page goes when where it is plus its throw (v x THROW_MS) is past half the width: a slow drag past half, or a
 * flick; a finger that turns back at the end takes it back.
 * @param {number} dx  finger travel, negative = to the left @param {number} v  px/ms, signed like dx
 * @param {number} width @param {boolean} hasPrev @param {boolean} hasNext */
export function pageStep(dx: number, v: number, width: number, hasPrev: boolean, hasNext: boolean): 1 | 0 | -1;
/** A critically damped spring's path (pure), one position per 60 Hz frame from `from` to `to`, starting at v px/ms
 * (the finger's speed, so the page doesn't jerk when let go). The speed is capped so it lands without passing `to`
 * (no page waits beyond it). The last position is exactly `to`.
 * @param {number} from @param {number} to @param {number} v @param {number} [response] */
export function springPath(from: number, to: number, v: number, response?: number): number[];
/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number, baseY?: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean, onPrevMissing?: () => void }} o  screens: the page's screen stack; host: its
 *   .ui-screens; root: where the tabs and side links are (default the page); onPrevMissing: a right swipe on the
 *   first page (nothing before it)
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void }}
 */
export function tabPages(bar: HTMLElement, { screens, host, root, swipe, slide, onPrevMissing }: {
    screens: {
        base: (s: HTMLElement) => Promise<void>;
        depth: () => number;
        baseY?: () => number;
    };
    host: HTMLElement;
    root?: ParentNode;
    swipe?: boolean;
    slide?: boolean;
    onPrevMissing?: () => void;
}): {
    go: (page: string | HTMLElement) => void;
    current: () => HTMLElement;
    stop: () => void;
};
/** How far ahead a let-go swipe's speed is projected, in ms (iOS's paging: the throw counts, not just the drag). */
export const THROW_MS: 200;
export function rubber(d: number, w: number): number;
/** How quickly the let-go glide settles: the spring's response in s (iOS's paging feel). */
export const SPRING_S: 0.3;
export function swipeEdge(width: number): number;
/** How long a tapped tab's page takes to slide in, in ms. */
export const SLIDE_MS: 280;
