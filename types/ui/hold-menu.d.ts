/**
 * Where the preview and the menu go (pure): the preview stays put and the menu goes under it, or above if there is no
 * room; if neither fits, the preview moves up so the menu fits under it. Left follows the finger when there is one.
 * @param {{ left: number, top: number, bottom: number, height: number }} r  the element's rect
 * @param {{ w: number, h: number }} menu @param {{ w: number, h: number }} view @param {{ x: number } | null} [at]
 * @returns {{ left: number, top: number, previewTop: number, below: boolean }}
 */
export function placeMenu(r: {
    left: number;
    top: number;
    bottom: number;
    height: number;
}, menu: {
    w: number;
    h: number;
}, view: {
    w: number;
    h: number;
}, at?: {
    x: number;
} | null): {
    left: number;
    top: number;
    previewTop: number;
    below: boolean;
};
/**
 * Where a mouse's right-click menu goes (pure): its corner at the pointer, as on a desktop; flipped left or up when it
 * would run off the screen, and kept 8 px inside it.
 * @param {{ w: number, h: number }} menu @param {{ w: number, h: number }} view @param {{ x: number, y: number }} at
 * @returns {{ left: number, top: number, below: boolean }}
 */
export function placeAtPointer(menu: {
    w: number;
    h: number;
}, view: {
    w: number;
    h: number;
}, at: {
    x: number;
    y: number;
}): {
    left: number;
    top: number;
    below: boolean;
};
/**
 * The sheet menu's place (pure): along the bottom edge, never above the top one.
 * @param {{ h: number }} menu @param {{ h: number }} view @returns {{ top: number }}
 */
export function placeSheetMenu(menu: {
    h: number;
}, view: {
    h: number;
}): {
    top: number;
};
/**
 * Starts hold menus for every [data-hold-menu] inside root (now or added later).
 * @param {ParentNode} [root]
 * @returns {{ open: (el: HTMLElement, at?: { x: number, y: number } | null, byKey?: boolean) => void, close: () => void, stop: () => void }}
 */
export function holdMenus(root?: ParentNode): {
    open: (el: HTMLElement, at?: {
        x: number;
        y: number;
    } | null, byKey?: boolean) => void;
    close: () => void;
    stop: () => void;
};
export const SHEET_BELOW: 840;
