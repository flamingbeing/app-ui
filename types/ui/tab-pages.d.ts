/** Where a let-go swipe goes (pure): 1 the next page, -1 the previous one, 0 back to this one. Like iOS's paging,
 * the page goes when where it is plus its throw (v x THROW_MS) is past half the width (a slow drag past half), or on
 * a flick (FLICK_V or faster) that way; a finger that turns back at the end takes it back. So quick flicks one after
 * another each go one page on (a caught glide counts from the page it was going to).
 * @param {number} dx  finger travel, negative = to the left @param {number} v  px/ms, signed like dx
 * @param {number} width @param {boolean} hasPrev @param {boolean} hasNext */
export function pageStep(dx: number, v: number, width: number, hasPrev: boolean, hasNext: boolean): 1 | 0 | -1;
/** A drawer a finger can pull (the shell's side bar on a phone, shell.js): pull(x) shows it x px out (0 closed),
 * release(x, v) lets it go there at v px/ms, to open or closed.
 * @typedef {{ pull: (x: number) => void, release: (x: number, v: number) => void }} PullDrawer */
/** The pages' glide after a let-go: where to, and whether it was a right swipe with nothing before.
 * @typedef {{ run: import('./motion.js').Glide, to: HTMLElement | null, missing: boolean, timer: ReturnType<typeof setTimeout> | number }} Gliding */
/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number, baseY?: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean, drawer?: () => PullDrawer | null, onPrevMissing?: () => void }} o
 *   screens: the page's screen stack; host: its .ui-screens; root: where the tabs and side links are (default the
 *   page); drawer: the drawer a right swipe on the first page pulls out (adaptiveShell().drawer); onPrevMissing
 *   (without a drawer): told after a right swipe on the first page (nothing before it)
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void }}
 */
export function tabPages(bar: HTMLElement, { screens, host, root, swipe, slide, drawer, onPrevMissing }: {
    screens: {
        base: (s: HTMLElement) => Promise<void>;
        depth: () => number;
        baseY?: () => number;
    };
    host: HTMLElement;
    root?: ParentNode;
    swipe?: boolean;
    slide?: boolean;
    drawer?: () => PullDrawer | null;
    onPrevMissing?: () => void;
}): {
    go: (page: string | HTMLElement) => void;
    current: () => HTMLElement;
    stop: () => void;
};
/** A let-go this fast (px/ms) is a flick: it goes a page that way however short it was. */
export const FLICK_V: 0.4;
export function swipeEdge(width: number): number;
/** How long a tapped tab's page takes to slide in, in ms. */
export const SLIDE_MS: 280;
/**
 * A drawer a finger can pull (the shell's side bar on a phone, shell.js): pull(x) shows it x px out (0 closed),
 * release(x, v) lets it go there at v px/ms, to open or closed.
 */
export type PullDrawer = {
    pull: (x: number) => void;
    release: (x: number, v: number) => void;
};
/**
 * The pages' glide after a let-go: where to, and whether it was a right swipe with nothing before.
 */
export type Gliding = {
    run: import("./motion.js").Glide;
    to: HTMLElement | null;
    missing: boolean;
    timer: ReturnType<typeof setTimeout> | number;
};
export { swipeIntent, THROW_MS, rubber, SPRING_S, springPath } from "./gesture.js";
