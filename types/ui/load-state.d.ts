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
/**
 * The last list, painted at once on start from the app's kept copy, like a phone app reopening where it was; the
 * real list takes over once it has come. Call it when the page starts, before waiting for sign-in or sync.
 * The copy is the host's markup: its first `rows` children, without aria-current, aria-selected or .changed. A row
 * (`[data-id]`) tapped while the copy shows is kept, and takeOver() hands its id back to open once the real list is
 * drawn. While the copy shows, the host has data-ui-cached and aria-busy.
 * @param {HTMLElement} host  the list's own element (it is filled with the copy, then emptied for the real list)
 * @param {{ read: () => string | null | undefined, write: (html: string | null) => void, rows?: number, wait?: number }} o
 *   read: the kept copy (null: none, the page starts as before); write: keep it (null: forget it, at sign-out);
 *   rows: how many rows to keep (default SNAP_ROWS); wait: ms after the last keep() before it is written (default 1000)
 * @returns {{ painted: boolean, keep: () => void, takeOver: () => string, drop: () => void, stop: () => void }}
 *   painted: the copy is showing; keep: the list changed, write the copy soon (when the page is idle, and at once on
 *   leaving); takeOver: the real list is about to be drawn, gives the tapped row's id or ''; drop: forget the copy
 */
export function cachedPaint(host: HTMLElement, { read, write, rows, wait }: {
    read: () => string | null | undefined;
    write: (html: string | null) => void;
    rows?: number;
    wait?: number;
}): {
    painted: boolean;
    keep: () => void;
    takeOver: () => string;
    drop: () => void;
    stop: () => void;
};
/**
 * Holds a list's empty state until its first data has come, so a list that will fill shows as loading, never as
 * "Nothing here yet" for the second or two sign-in and the first sync take. Draw the empty state only when
 * `!hold.holding`; draw loading (loadState's skeleton) while it holds. It ends at release() (the data came, or the
 * lookup failed) or after `ms`, so a stuck sign-in never holds it for ever; onEnd runs once then (redraw).
 * @param {{ hold?: boolean, ms?: number, onEnd?: () => void }} [o]  hold: whether to hold at all (say, this device had
 *   data last time; default true); ms: the longest it holds (default 8000)
 * @returns {{ readonly holding: boolean, release: () => void }}
 */
export function holdEmpty({ hold, ms, onEnd }?: {
    hold?: boolean;
    ms?: number;
    onEnd?: () => void;
}): {
    readonly holding: boolean;
    release: () => void;
};
/**
 * Shows `next` in `host` once `ready` has settled, keeping what the host shows now up (still, inert) until then: a
 * tab switch whose module mounts into `next` shows the tab's last view instead of an empty or "Loading…" page. With
 * nothing in the host, `next` goes in at once. Meanwhile `next` is laid out but unseen (.ui-swap-in), so the module
 * can measure. A later swap into the same host wins: an earlier `next` still waiting is dropped.
 * @param {HTMLElement} host @param {HTMLElement} next @param {Promise<unknown>} ready  (a failure swaps in too: the
 *   module shows its own error in `next`)
 * @returns {Promise<boolean>}  whether `next` is the one showing
 */
export function swapWhenReady(host: HTMLElement, next: HTMLElement, ready: Promise<unknown>): Promise<boolean>;
/** How many rows of a list a kept copy holds: more than a tall screen shows. */
export const SNAP_ROWS: 60;
