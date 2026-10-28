/**
 * @param {{ show: (message: string, o?: { ms?: number, action?: { label: string, run: () => void } }) => () => void }} toasts
 *   the page's toaster
 * @param {{ ms?: number, labels?: Record<string, string> }} [o]  ms: how long Undo stays (default 6000)
 * @returns {{ show: (message: string, undo: () => unknown) => void, stop: () => void }}
 *   show: the message and what Undo runs; stop: removes the toast showing
 */
export function undoToast(toasts: {
    show: (message: string, o?: {
        ms?: number;
        action?: {
            label: string;
            run: () => void;
        };
    }) => () => void;
}, { ms, labels }?: {
    ms?: number;
    labels?: Record<string, string>;
}): {
    show: (message: string, undo: () => unknown) => void;
    stop: () => void;
};
