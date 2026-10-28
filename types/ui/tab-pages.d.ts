/** A first move's direction (pure): 'x' a sideways swipe, 'y' a scroll, null not far enough to tell. A swipe is well
 * under 34° from the horizontal. @param {number} mx @param {number} my */
export function swipeIntent(mx: number, my: number): "x" | "y" | null;
/** Where a let-go swipe goes (pure): 1 the next page, -1 the previous one, 0 back to this one.
 * @param {number} dx  finger travel, negative = to the left @param {number} v  px/ms, signed like dx
 * @param {number} width @param {boolean} hasPrev @param {boolean} hasNext */
export function pageStep(dx: number, v: number, width: number, hasPrev: boolean, hasNext: boolean): 1 | 0 | -1;
/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean }} o  screens: the page's screen stack; host: its
 *   .ui-screens; root: where the tabs and side links are (default the page)
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void }}
 */
export function tabPages(bar: HTMLElement, { screens, host, root, swipe, slide }: {
    screens: {
        base: (s: HTMLElement) => Promise<void>;
        depth: () => number;
    };
    host: HTMLElement;
    root?: ParentNode;
    swipe?: boolean;
    slide?: boolean;
}): {
    go: (page: string | HTMLElement) => void;
    current: () => HTMLElement;
    stop: () => void;
};
/** How long a tapped tab's page takes to slide in, in ms. */
export const SLIDE_MS: 280;
