/**
 * @param {HTMLElement} host  the region is added here (once per page)
 * @param {{ ms?: number, labels?: Record<string, string>, bottom?: string, exit?: number }} [o]  exit: ms a toast fades out
 *   (ease-in) before it goes (default 0 = hard cut; 300 matches the Material snackbar); every toast fades in over 150 ms
 *   (--d-toast-in), none when Still or Reduce Motion is on; ms: how long a toast stays (default 4000);
 *   labels: words over LABELS; bottom: a CSS length the toasts sit above (an app's own tab bar, say
 *   'calc(56px + env(safe-area-inset-bottom))'), the same as setting --ui-toast-bottom (default: the page bottom, or
 *   over the kit tab bar)
 * @returns {{ show: (message: string, o?: { ms?: number, swap?: boolean, action?: { label: string, run: () => void } }) => () => void, stop: () => void }}
 *   swap: true changes the toast already showing in place (its text cross-fades over 80 ms, the timer restarts) instead of adding another;
 *   show returns that toast's dismiss (action: a button such as Undo, which runs and dismisses); stop removes the region
 */
export function toaster(host: HTMLElement, { ms, labels, bottom, exit }?: {
    ms?: number;
    labels?: Record<string, string>;
    bottom?: string;
    exit?: number;
}): {
    show: (message: string, o?: {
        ms?: number;
        swap?: boolean;
        action?: {
            label: string;
            run: () => void;
        };
    }) => () => void;
    stop: () => void;
};
