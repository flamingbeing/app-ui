/**
 * The ticks after a drag from row `from` to row `to` (pure): rows in between take `setTo`, the rest go back to `snap`.
 * @param {boolean[]} snap  the ticks when the drag started @param {number} from @param {number} to @param {boolean} setTo
 */
export function dragRange(snap: boolean[], from: number, to: number, setTo: boolean): boolean[];
/** "2-4" -> [2, 4]; "1" -> [1, 99] */
export function needs(spec: string): number[];
/**
 * @param {HTMLElement} list  .ui-list[data-select] (needs an id)
 * @param {{ tabBar?: HTMLElement | null }} [opts]  the tab bar the action bar replaces (default nav.ui-tabbar)
 * @returns {{ setEditing: (on: boolean) => void, selected: () => HTMLElement[], stop: () => void }}
 */
export function selectMode(list: HTMLElement, { tabBar }?: {
    tabBar?: HTMLElement | null;
}): {
    setEditing: (on: boolean) => void;
    selected: () => HTMLElement[];
    stop: () => void;
};
/** where the ticks are: a finger starting this far (px) from the list's left edge drags the range */
export const TICKS: 56;
