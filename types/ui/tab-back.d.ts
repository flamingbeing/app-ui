/**
 * @param {{ history: History, events: Pick<Window, 'addEventListener' | 'removeEventListener'>, onFirst: () => void }} o
 *   onFirst: Back took the page to the first tab; show it (the address is already the first tab's)
 * @returns {{ went: (first: boolean, url?: string) => void, away: () => boolean, stop: () => void }}
 *   went: the page now shows a tab (first: whether it is the first); url: its address, if the router keeps one
 */
export function tabBack({ history, events, onFirst }: {
    history: History;
    events: Pick<Window, "addEventListener" | "removeEventListener">;
    onFirst: () => void;
}): {
    went: (first: boolean, url?: string) => void;
    away: () => boolean;
    stop: () => void;
};
