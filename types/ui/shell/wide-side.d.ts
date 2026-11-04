/** @typedef {{ get: () => boolean, set: (v: boolean) => void }} SideStore */
/**
 * The store for the hidden state: the app's own, or localStorage (any failure reads as shown and is not kept) (pure but
 * for the storage it is given).
 * @param {SideStore | null} [store] @param {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null} [storage]
 * @returns {SideStore}
 */
export function sideStore(store?: SideStore | null, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): SideStore;
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
export const SIDE_KEY: "ui-side-hidden";
export const SIDE_MS: 270;
export type SideStore = {
    get: () => boolean;
    set: (v: boolean) => void;
};
