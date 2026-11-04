/** Whether a row's text matches a search: every word, any case (pure). @param {string} text @param {string} query */
export function matchesSearch(text: string, query: string): boolean;
/**
 * @param {HTMLElement} shell  .ui-shell
 * @param {{ screens?: { push: (t: string | HTMLElement, from?: HTMLElement | null) => void, pop: (a?: boolean) => void, depth: () => number } | null,
 *   render?: (row: HTMLElement, detail: HTMLElement) => void,
 *   wide?: import('./wide-side.js').SideStore | null }} [opts]  screens: the page's screen stack (startGestures().screens);
 *   wide: where the wide side bar's hidden state is kept (html[data-wide-side] only; default localStorage)
 * @returns {{ open: (row: HTMLElement) => void, current: () => HTMLElement | null, size: () => string,
 *   drawer: { pull: (x: number) => void, release: (x: number, v: number) => void } | null,
 *   side: () => { toggle: (hide?: boolean) => void, hidden: () => boolean } | null, stop: () => void }}
 *   drawer: the side bar's drawer as a finger would pull it (null without a side bar); no swipe pulls it any more.
 *   side: the wide side bar's hide button once wide-side.js has loaded (null before, and on phones and tablets)
 */
export function adaptiveShell(shell: HTMLElement, { screens, render, wide }?: {
    screens?: {
        push: (t: string | HTMLElement, from?: HTMLElement | null) => void;
        pop: (a?: boolean) => void;
        depth: () => number;
    } | null;
    render?: (row: HTMLElement, detail: HTMLElement) => void;
    wide?: import("./wide-side.js").SideStore | null;
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
