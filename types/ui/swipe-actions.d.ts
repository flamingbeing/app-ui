/**
 * Where a let-go row settles (pure): 'full' (run the first action), 'open' (stay on the actions) or 'closed'.
 * @param {number} x  how far the row is out, px (either way) @param {number} v  the let-go speed the same way, px/ms
 * @param {number} width  the row's @param {number} tray  the actions' width @param {boolean} full  a full action
 * @returns {'full' | 'open' | 'closed'}
 */
export function swipeSettle(x: number, v: number, width: number, tray: number, full: boolean): "full" | "open" | "closed";
/**
 * Where the row shows for a finger at d px out (pure): 1:1 up to the actions' width, then with a full action on
 * freely up to the row's width (past it, a stretch), without one a rubber band past the actions.
 * @param {number} d @param {number} width @param {number} tray @param {boolean} full @returns {number}
 */
export function swipeShown(d: number, width: number, tray: number, full: boolean): number;
/**
 * Swipe actions on the rows (.ui-row) of a list.
 * @param {HTMLElement} list  the list (ul.ui-list or any parent of the rows) @param {SwipeOptions} o
 * @returns {{ close: () => void, stop: () => void }}
 */
export function swipeActions(list: HTMLElement, { lead, trail, onAction }: SwipeOptions): {
    close: () => void;
    stop: () => void;
};
/**
 * One action: its id (passed to onAction), its words, its colour (tone: the danger red, warn orange, grey, ok green,
 * purple; else the accent), full: the action a full swipe runs (only the first of a side can be).
 * @typedef {{ id: string, label: string, tone?: 'danger' | 'warn' | 'grey' | 'ok' | 'purple' | 'accent', full?: boolean }} SwipeAction
 */
/**
 * @typedef {{ lead?: (row: HTMLElement) => SwipeAction[], trail?: (row: HTMLElement) => SwipeAction[],
 *   onAction: (id: string, row: HTMLElement) => void }} SwipeOptions
 * lead: the actions under the row's start (shown by a swipe towards the end: right in a left-to-right page), trail:
 * those under its end (a swipe towards the start), each listed from the outer edge in; [] or none: that way doesn't
 * open. onAction runs once the row has settled.
 */
/** how far a full swipe goes before it arms, as a share of the row's width */
export const FULL_AT: 0.6;
/** each action button's width, px (iOS's 74) */
export const ACTION_W: 74;
/**
 * One action: its id (passed to onAction), its words, its colour (tone: the danger red, warn orange, grey, ok green,
 * purple; else the accent), full: the action a full swipe runs (only the first of a side can be).
 */
export type SwipeAction = {
    id: string;
    label: string;
    tone?: "danger" | "warn" | "grey" | "ok" | "purple" | "accent";
    full?: boolean;
};
/**
 * lead: the actions under the row's start (shown by a swipe towards the end: right in a left-to-right page), trail:
 * those under its end (a swipe towards the start), each listed from the outer edge in; [] or none: that way doesn't
 * open. onAction runs once the row has settled.
 */
export type SwipeOptions = {
    lead?: (row: HTMLElement) => SwipeAction[];
    trail?: (row: HTMLElement) => SwipeAction[];
    onAction: (id: string, row: HTMLElement) => void;
};
