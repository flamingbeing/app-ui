/**
 * Where a drag lands (pure): -> the detent to settle on, or 'close'.
 * @param {string[]} detents @param {string} now  the detent it started at
 * @param {number} dy  how far it moved (down is +) @param {number} v  px per ms at the end (down is +)
 */
export function settle(detents: string[], now: string, dy: number, v: number): string;
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
export function sheetsSettled(): Promise<void>;
export function topDetent(ds: string[]): string;
