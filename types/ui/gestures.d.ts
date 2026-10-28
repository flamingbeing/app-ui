/**
 * @param {ParentNode} [root]
 * @returns {{ title: ReturnType<typeof largeTitle> | null, menus: ReturnType<typeof holdMenus> | null,
 *   sheets: Map<string, ReturnType<typeof detentSheet>>, screens: ReturnType<typeof screenStack> | null,
 *   selects: Map<string, ReturnType<typeof selectMode>>, tabs: ReturnType<typeof tabPages> | null, stop: () => void }}
 */
export function startGestures(root?: ParentNode): {
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
