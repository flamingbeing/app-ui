/**
 * @param {{ history: History, events: Pick<Window, 'addEventListener' | 'removeEventListener'>, onFirst: () => void,
 *   onClose?: () => void, closeMs?: number, first?: boolean }} o
 *   onFirst: Back took the page to the first tab; show it (the address is already the first tab's); onClose: Back on
 *   the first tab, kept in the app: say "Press Back again to close" (without it, no guard: Back there leaves);
 *   closeMs: the window for that second Back (default CLOSE_MS); first: whether the page starts on the first tab
 *   (default: yes, unless the entry is another tab's)
 * @returns {{ went: (first: boolean, url?: string) => void, away: () => boolean, closing: () => boolean, stop: () => void }}
 *   went: the page now shows a tab (first: whether it is the first); url: its address, if the router keeps one;
 *   closing: within the window, a Back now leaves
 */
export function tabBack({ history, events, onFirst, onClose, closeMs, first: startFirst }: {
    history: History;
    events: Pick<Window, "addEventListener" | "removeEventListener">;
    onFirst: () => void;
    onClose?: () => void;
    closeMs?: number;
    first?: boolean;
}): {
    went: (first: boolean, url?: string) => void;
    away: () => boolean;
    closing: () => boolean;
    stop: () => void;
};
/** How long the second Back may wait and still leave (Android's own "press again" window). */
export const CLOSE_MS: 2000;
