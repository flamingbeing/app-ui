/** @typedef {{ get: () => boolean, set: (v: boolean) => void }} SideStore */
/**
 * The store for the side bar's hidden state: the app's own, or localStorage (any failure reads as shown and is not
 * kept) (pure but for the storage it is given).
 * @param {SideStore | null} [store] @param {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null} [storage]
 * @returns {SideStore}
 */
export function sideStore(store?: SideStore | null, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): SideStore;
/** Whether a row's text matches a search: every word, any case (pure). @param {string} text @param {string} query */
export function matchesSearch(text: string, query: string): boolean;
/**
 * @param {HTMLElement} shell  .ui-shell
 * @param {{ screens?: { push: (t: string | HTMLElement, from?: HTMLElement | null) => void, pop: (a?: boolean) => void, depth: () => number } | null,
 *   render?: (row: HTMLElement, detail: HTMLElement) => void,
 *   wide?: SideStore | null }} [opts]  screens: the page's screen stack (startGestures().screens);
 *   wide: where the side bar's hidden state is kept (the wide side bar's and the menu button's; default localStorage)
 * @returns {{ open: (row: HTMLElement) => void, current: () => HTMLElement | null, size: () => string,
 *   drawer: { pull: (x: number) => void, release: (x: number, v: number) => void } | null,
 *   side: () => { toggle: (hide?: boolean) => void, hidden: () => boolean } | null, stop: () => void }}
 *   drawer: the side bar's drawer as a finger would pull it (null without a side bar); no swipe pulls it any more.
 *   side: the side bar's hiding once wide-side.js has loaded (null before, and on a phone: from 600 px a shell with
 *   panes loads it at once, a single-pane shell at its menu button's first press)
 */
export function adaptiveShell(shell: HTMLElement, { screens, render, wide }?: {
    screens?: {
        push: (t: string | HTMLElement, from?: HTMLElement | null) => void;
        pop: (a?: boolean) => void;
        depth: () => number;
    } | null;
    render?: (row: HTMLElement, detail: HTMLElement) => void;
    wide?: SideStore | null;
}): {
    open: (row: HTMLElement) => void;
    current: () => HTMLElement | null;
    size: () => string;
    drawer: {
        pull: (x: number) => void;
        release: (x: number, v: number) => void;
    } | null;
    side: () => {
        toggle: (hide?: boolean) => void;
        hidden: () => boolean;
    } | null;
    stop: () => void;
};
export const TABLET_MIN: 600;
export const LAPTOP_MIN: 840;
export function sizeClass(w: number): "phone" | "tablet" | "laptop";
export function wantsWideSide(html: {
    hasAttribute: (name: string) => boolean;
}, width: number): boolean;
export const SIDE_KEY: "ui-side-hidden";
export type SideStore = {
    get: () => boolean;
    set: (v: boolean) => void;
};
