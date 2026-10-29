/**
 * @param {ParentNode} [root]
 * @param {{ drawer?: () => import('./tab-pages.js').PullDrawer | null, onPrevMissing?: () => void, press?: boolean, bounce?: boolean, keyboard?: boolean, ticks?: boolean }} [o]  drawer:
 *   ignored (a swipe no longer pulls the side bar out; still taken so apps that pass it need no change);
 *   onPrevMissing: told after a right swipe on the first tab page; press: false leaves out the instant pressed state; bounce: false
 *   leaves out the rubber band at the scroll's ends; keyboard: false leaves out the keyboard watch; ticks: false
 *   leaves out the switches' and segmented controls' tick
 * @returns {{ title: ReturnType<typeof largeTitle> | null, menus: ReturnType<typeof holdMenus> | null,
 *   sheets: Map<string, ReturnType<typeof detentSheet>>, screens: ReturnType<typeof screenStack> | null,
 *   selects: Map<string, ReturnType<typeof selectMode>>, tabs: ReturnType<typeof tabPages> | null, stop: () => void }}
 */
export function startGestures(root?: ParentNode, { onPrevMissing, press, bounce, keyboard, ticks }?: {
    drawer?: () => import("./tab-pages.js").PullDrawer | null;
    onPrevMissing?: () => void;
    press?: boolean;
    bounce?: boolean;
    keyboard?: boolean;
    ticks?: boolean;
}): {
    title: ReturnType<typeof largeTitle> | null;
    menus: ReturnType<typeof holdMenus> | null;
    sheets: Map<string, ReturnType<typeof detentSheet>>;
    screens: ReturnType<typeof screenStack> | null;
    selects: Map<string, ReturnType<typeof selectMode>>;
    tabs: ReturnType<typeof tabPages> | null;
    stop: () => void;
};
import { largeTitle } from './large-title.js';
import { holdMenus } from './hold-menu.js';
import { detentSheet } from './detent-sheet.js';
import { screenStack } from './screens.js';
import { selectMode } from './select-mode.js';
import { tabPages } from './tab-pages.js';
