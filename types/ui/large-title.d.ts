/**
 * @param {HTMLElement} bar  the top bar
 * @param {HTMLElement | null} [title]  the screen's large title (default: the first one showing)
 * @returns {{ watch: (t: HTMLElement | null) => void, stop: () => void }}  watch: aim it at a new screen's title
 */
export function largeTitle(bar: HTMLElement, title?: HTMLElement | null): {
    watch: (t: HTMLElement | null) => void;
    stop: () => void;
};
