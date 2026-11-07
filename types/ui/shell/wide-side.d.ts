/** @typedef {import('./shell.js').SideStore} SideStore */
/**
 * @param {HTMLElement} shell  .ui-shell (with a nav.ui-sidebar)
 * @param {{ store?: SideStore | null }} [opts]
 * @returns {{ toggle: (hide?: boolean) => void, hidden: () => boolean, stop: () => void }}
 */
export function wideSide(shell: HTMLElement, { store }?: {
    store?: SideStore | null;
}): {
    toggle: (hide?: boolean) => void;
    hidden: () => boolean;
    stop: () => void;
};
export const SIDE_MS: 270;
export type SideStore = import("./shell.js").SideStore;
export { SIDE_KEY, sideStore } from "./shell.js";
