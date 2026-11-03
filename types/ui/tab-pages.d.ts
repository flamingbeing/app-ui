/** The start delay of each of n blocks in fade mode (pure): after the gap, top-down, one stagger apart, the blocks past TAB_FADE_BLOCKS with the last.
 * With `rise`: spread so the last block (of at most TAB_FADE_BLOCKS + 1) ends at TAB_RISE_END_MS, no more than TAB_RISE_MAX_STAGGER_MS apart.
 * @param {number} n @param {boolean} [rise] @returns {number[]} */
export function tabFadeDelays(n: number, rise?: boolean): number[];
/** Where a let-go swipe goes (pure): 1 the next page, -1 the previous one, 0 back to this one. Like iOS's paging,
 * the page goes when where it is plus its throw (v x THROW_MS) is past half the width (a slow drag past half), or on
 * a flick (FLICK_V or faster) that way; a finger that turns back at the end takes it back. So quick flicks one after
 * another each go one page on (a caught glide counts from the page it was going to).
 * @param {number} dx  finger travel, negative = to the left @param {number} v  px/ms, signed like dx
 * @param {number} width @param {boolean} hasPrev @param {boolean} hasNext */
export function pageStep(dx: number, v: number, width: number, hasPrev: boolean, hasNext: boolean): 1 | 0 | -1;
/** A drawer a finger can pull (the shell's side bar on a phone, shell.js): pull(x) shows it x px out (0 closed),
 * release(x, v) lets it go there at v px/ms, to open or closed. (No swipe pulls it any more: the drawer option is
 * still taken, and ignored, so apps that pass it need no change.)
 * @typedef {{ pull: (x: number) => void, release: (x: number, v: number) => void }} PullDrawer */
/** The pages' glide after a let-go: where to, and whether it was a right swipe with nothing before.
 * @typedef {{ run: import('./motion.js').Glide, to: HTMLElement | null, missing: boolean, timer: ReturnType<typeof setTimeout> | number }} Gliding */
/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ screens: { base: (s: HTMLElement) => Promise<void>, depth: () => number, baseY?: () => number }, host: HTMLElement,
 *   root?: ParentNode, swipe?: boolean, slide?: boolean | 'fade' | 'rise', drawer?: () => PullDrawer | null, onPrevMissing?: () => void,
 *   backToFirst?: boolean, backToClose?: boolean, toasts?: { show: (message: string, o?: { ms?: number }) => () => void },
 *   labels?: Record<string, string>, ahead?: (page: HTMLElement) => void }} o
 *   screens: the page's screen stack; host: its .ui-screens; root: where the tabs and side links are (default the
 *   page); drawer: ignored (a swipe no longer pulls the side bar out); onPrevMissing: told after a right swipe on the first page (nothing before it); backToFirst (default on): Back
 *   on another page goes to the first, and Back there leaves (tab-back.js); off, the pages add no history at all;
 *   backToClose (default on, with backToFirst): the first Back on the first page stays and shows the backAgain words
 *   in a toast (the app's toaster given as toasts, else one of its own), a second within CLOSE_MS leaves; labels: words over LABELS;
 *   ahead: draws a still copy of a page that isn't on screen (above, "Drawn ahead"; left out, nothing is drawn ahead)
 * @returns {{ go: (page: string | HTMLElement) => void, current: () => HTMLElement, stop: () => void, drawAhead: () => void }}
 *   drawAhead: asks for every page again, nearest first (the app's data changed); nothing without ahead
 */
export function tabPages(bar: HTMLElement, { screens, host, root, swipe, slide, onPrevMissing, backToFirst, backToClose, toasts, labels, ahead }: {
    screens: {
        base: (s: HTMLElement) => Promise<void>;
        depth: () => number;
        baseY?: () => number;
    };
    host: HTMLElement;
    root?: ParentNode;
    swipe?: boolean;
    slide?: boolean | "fade" | "rise";
    drawer?: () => PullDrawer | null;
    onPrevMissing?: () => void;
    backToFirst?: boolean;
    backToClose?: boolean;
    toasts?: {
        show: (message: string, o?: {
            ms?: number;
        }) => () => void;
    };
    labels?: Record<string, string>;
    ahead?: (page: HTMLElement) => void;
}): {
    go: (page: string | HTMLElement) => void;
    current: () => HTMLElement;
    stop: () => void;
    drawAhead: () => void;
};
export const TAB_FADE_OUT_MS: 67;
export const TAB_FADE_GAP_MS: 100;
export const TAB_FADE_IN_MS: 120;
export const TAB_FADE_STAGGER_MS: 20;
export const TAB_FADE_BLOCKS: 12;
export const TAB_RISE_GAP_MS: 10;
export const TAB_RISE_IN_MS: 150;
export const TAB_RISE_PX: 12;
export const TAB_RISE_END_MS: 317;
export const TAB_RISE_MAX_STAGGER_MS: 40;
/** A let-go this fast (px/ms) is a flick: it goes a page that way however short it was. */
export const FLICK_V: 0.4;
export function swipeEdge(width: number): number;
/** How quickly a let-go tab swipe settles (the spring's response in s): quicker than sheets' SPRING_S, so a page
 * change lands in about 0.3 s (owner 1 Nov: tab changes felt slow). */
export const PAGE_SPRING_S: 0.22;
/**
 * A drawer a finger can pull (the shell's side bar on a phone, shell.js): pull(x) shows it x px out (0 closed),
 * release(x, v) lets it go there at v px/ms, to open or closed. (No swipe pulls it any more: the drawer option is
 * still taken, and ignored, so apps that pass it need no change.)
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
export { swipeIntent, THROW_MS, rubber, SPRING_S, springPath, SLIDE_MS } from "./gesture.js";
