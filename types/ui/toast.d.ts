/**
 * @param {HTMLElement} host  the region is added here (once per page)
 * @param {{ ms?: number, labels?: Record<string, string>, bottom?: string }} [o]  ms: how long a toast stays (default 4000);
 *   labels: words over LABELS; bottom: a CSS length the toasts sit above (an app's own tab bar, say
 *   'calc(56px + env(safe-area-inset-bottom))'), the same as setting --ui-toast-bottom (default: the page bottom, or
 *   over the kit tab bar)
 * @returns {{ show: (message: string, o?: { ms?: number, action?: { label: string, run: () => void } }) => () => void, stop: () => void }}
 *   show returns that toast's dismiss (action: a button such as Undo, which runs and dismisses); stop removes the region
 */
export function toaster(host: HTMLElement, { ms, labels, bottom }?: {
    ms?: number;
    labels?: Record<string, string>;
    bottom?: string;
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
