/**
 * @param {HTMLElement} host  the region is added here (once per page)
 * @param {{ ms?: number, labels?: Record<string, string> }} [o]  ms: how long a toast stays (default 4000);
 *   labels: words over LABELS
 * @returns {{ show: (message: string, o?: { ms?: number, action?: { label: string, run: () => void } }) => () => void, stop: () => void }}
 *   show returns that toast's dismiss (action: a button such as Undo, which runs and dismisses); stop removes the region
 */
export function toaster(host: HTMLElement, { ms, labels }?: {
    ms?: number;
    labels?: Record<string, string>;
}): {
    show: (message: string, o?: {
        ms?: number;
        action?: {
            label: string;
            run: () => void;
        };
    }) => () => void;
    stop: () => void;
};
