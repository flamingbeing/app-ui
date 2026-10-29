/**
 * @typedef {{ history: History, events: Pick<Window, 'addEventListener' | 'removeEventListener'>,
 *   standalone?: boolean, atHome?: () => boolean, onHome?: () => void }} GuardOptions
 *   standalone: whether the page runs as the installed app (default: installedApp()); atHome: whether the page shows
 *   its home screen with nothing open over it (the spare entry goes in only then); onHome: runs when Back would leave
 */
/** Whether the page runs as an installed app (its own window). @param {(q: string) => boolean} [media] @param {Navigator} [nav] */
export function installedApp(media?: (q: string) => boolean, nav?: Navigator): boolean;
/** @param {GuardOptions} o @returns {{ armed: () => boolean, stop: () => void }} */
export function backGuard({ history, events, standalone, atHome, onHome }: GuardOptions): {
    armed: () => boolean;
    stop: () => void;
};
/**
 * standalone: whether the page runs as the installed app (default: installedApp()); atHome: whether the page shows
 * its home screen with nothing open over it (the spare entry goes in only then); onHome: runs when Back would leave
 */
export type GuardOptions = {
    history: History;
    events: Pick<Window, "addEventListener" | "removeEventListener">;
    standalone?: boolean;
    atHome?: () => boolean;
    onHome?: () => void;
};
