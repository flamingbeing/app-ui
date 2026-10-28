/** @param {Navigator} [nav] @param {(q: string) => boolean} [media] @param {string | null} [attr]  html[data-edge-back] */
export function edgeBackOn(nav?: Navigator, media?: (q: string) => boolean, attr?: string | null): boolean;
/**
 * @param {HTMLElement} host  .ui-screens
 * @param {{ onChange?: (top: HTMLElement) => void }} [opts]  onChange: after each push or pop (e.g. largeTitle.watch)
 * @returns {{ push: (target: string | HTMLElement, from?: HTMLElement | null) => void, pop: (animate?: boolean) => void,
 *   depth: () => number, baseY: () => number, base: (screen: HTMLElement) => Promise<void>, stop: () => void }}  base: tab pages (tab-pages.js)
 */
export function screenStack(host: HTMLElement, { onChange }?: {
    onChange?: (top: HTMLElement) => void;
}): {
    push: (target: string | HTMLElement, from?: HTMLElement | null) => void;
    pop: (animate?: boolean) => void;
    depth: () => number;
    baseY: () => number;
    base: (screen: HTMLElement) => Promise<void>;
    stop: () => void;
};
export const EDGE: 24;
export function swipeGoesBack(dx: number, v: number, width: number): boolean;
