/**
 * @param {HTMLElement} host  the block is added here, empty until loading() or failed()
 * @param {{ rows?: number, labels?: Record<string, string> }} [o]  rows: how many skeleton rows (default 4)
 * @returns {{ loading: () => void, failed: (message: string, retry: () => unknown) => void, done: () => void, stop: () => void }}
 */
export function loadState(host: HTMLElement, { rows, labels }?: {
    rows?: number;
    labels?: Record<string, string>;
}): {
    loading: () => void;
    failed: (message: string, retry: () => unknown) => void;
    done: () => void;
    stop: () => void;
};
