/**
 * The ticks after a drag from row `from` to row `to` (pure): rows in between take `setTo`, the rest go back to `snap`.
 * @param {boolean[]} snap  the ticks when the drag started @param {number} from @param {number} to @param {boolean} setTo
 */
export function dragRange(snap: boolean[], from: number, to: number, setTo: boolean): boolean[];
/**
 * The row an arrow key moves to (pure): the next (`step` 1) or previous (-1) row from `from` that `isShown` keeps,
 * skipping rows a search hid (`hidden`) or the page hides (display:none); null at either end.
 * @template T @param {T[]} rows @param {T | null} from @param {1 | -1} step @param {(row: T) => boolean} isShown
 */
export function nextShown<T>(rows: T[], from: T | null, step: 1 | -1, isShown: (row: T) => boolean): T | null;
/** "2-4" -> [2, 4]; "1" -> [1, 99] */
export function needs(spec: string): number[];
/**
 * @param {HTMLElement} list  .ui-list[data-select] (needs an id)
 * @param {{ tabBar?: HTMLElement | null, steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } } }} [opts]
 *   tabBar: the tab bar the action bar replaces (default nav.ui-tabbar); steps: createTransients(), so Back ends select mode
 * @returns {{ setEditing: (on: boolean) => void, selected: () => HTMLElement[], stop: () => void }}
 */
export function selectMode(list: HTMLElement, { tabBar, steps }?: {
    tabBar?: HTMLElement | null;
    steps?: {
        open: (dismiss: () => void) => {
            readonly active: boolean;
            close: () => Promise<void>;
        };
    };
}): {
    setEditing: (on: boolean) => void;
    selected: () => HTMLElement[];
    stop: () => void;
};
/** where the ticks are: a finger starting this far (px) from the list's left edge drags the range */
export const TICKS: 56;
