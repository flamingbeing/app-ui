/** Whether a row's text matches a search: every word, any case (pure). @param {string} text @param {string} query */
export function matchesSearch(text: string, query: string): boolean;
/**
 * @param {HTMLElement} shell  .ui-shell
 * @param {{ screens?: { push: (t: string | HTMLElement, from?: HTMLElement | null) => void, pop: (a?: boolean) => void, depth: () => number } | null,
 *   render?: (row: HTMLElement, detail: HTMLElement) => void }} [opts]  screens: the page's screen stack (startGestures().screens)
 * @returns {{ open: (row: HTMLElement) => void, current: () => HTMLElement | null, size: () => string,
 *   drawer: { pull: (x: number) => void, release: (x: number, v: number) => void } | null, stop: () => void }}
 *   drawer: the side bar's drawer as a finger would pull it (null without a side bar); no swipe pulls it any more
 */
export function adaptiveShell(shell: HTMLElement, { screens, render }?: {
    screens?: {
        push: (t: string | HTMLElement, from?: HTMLElement | null) => void;
        pop: (a?: boolean) => void;
        depth: () => number;
    } | null;
    render?: (row: HTMLElement, detail: HTMLElement) => void;
}): {
    open: (row: HTMLElement) => void;
    current: () => HTMLElement | null;
    size: () => string;
    drawer: {
        pull: (x: number) => void;
        release: (x: number, v: number) => void;
    } | null;
    stop: () => void;
};
export const TABLET_MIN: 600;
export const LAPTOP_MIN: 840;
export function sizeClass(w: number): "phone" | "tablet" | "laptop";
