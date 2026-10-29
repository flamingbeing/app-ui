/**
 * Where a drag lands (pure): the height nearest where the sheet would come to rest, or 'close'. A clear flick goes
 * on to the next height its way; well below the lowest height it closes.
 * @param {string[]} detents @param {Record<string, number>} sizes  each detent's height (px)
 * @param {number} shown  how much of the sheet shows now (px) @param {number} v  px per ms at the end (down is +)
 * @param {string} now  the detent it started at
 */
export function settle(detents: string[], sizes: Record<string, number>, shown: number, v: number, now: string): string;
/**
 * @param {HTMLDialogElement} sheet  dialog.ui-sheet[data-detents]
 * @returns {{ open: (opener?: HTMLElement | null) => void, close: () => void, setDetent: (d: string) => void, stop: () => void }}
 */
export function detentSheet(sheet: HTMLDialogElement): {
    open: (opener?: HTMLElement | null) => void;
    close: () => void;
    setDetent: (d: string) => void;
    stop: () => void;
};
/** Resolves once every sheet's (and the drawer's) step back has landed: push a page after it. @returns {Promise<void>} */
export const sheetsSettled: () => Promise<void>;
export function topDetent(ds: string[]): string;
