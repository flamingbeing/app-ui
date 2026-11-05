/** @typedef {{ v: 1, path: string, tab: string, y: number, at: number, until: number, ys?: Record<string, number> }} KeptPlace */
/** @typedef {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void }} PlaceStore */
/**
 * The place to keep (pure): which tab, how far down, when, and until when it may be resumed.
 * @param {{ path: string, tab: string, y: number, now: number, minutes?: number, ys?: Record<string, number> }} o
 *   ys: the other tab pages' scrolls (each screen keeps its own place; only plain ids and whole scrolls above 0 are kept)
 * @returns {KeptPlace | null}  null: nothing worth keeping (a page without a plain id)
 */
export function keepPlace({ path, tab, y, now, minutes, ys }: {
    path: string;
    tab: string;
    y: number;
    now: number;
    minutes?: number;
    ys?: Record<string, number>;
}): KeptPlace | null;
/**
 * The place a start opens (pure; theme/early.js applies the same rule before the first paint): the kept tab and
 * scroll when the place is this page's, kept at or before now and not yet past its window, and the address has no hash
 * or query (a deep link wins); else null (a normal start).
 * @param {string | null} raw  what RESUME_KEY holds
 * @param {{ path: string, hash?: string, search?: string, now: number }} at  the address now, and the clock
 * @returns {{ tab: string, y: number, ys?: Record<string, number> } | null}  ys: the other tab pages' kept scrolls
 */
export function placeToOpen(raw: string | null, { path, hash, search, now }: {
    path: string;
    hash?: string;
    search?: string;
    now: number;
}): {
    tab: string;
    y: number;
    ys?: Record<string, number>;
} | null;
/**
 * The browser side (tabPages starts it): keeps the place whenever the page is hidden or left, and holds a resumed
 * scroll while the page grows.
 * @param {{ current: () => HTMLElement, y: () => number, ys?: () => Record<string, number>, open?: (tab: string, y: number, ys?: Record<string, number>) => boolean }} tabs
 *   current: the tab page showing; y: its scroll (the tab's own under a pushed screen); ys: the other pages' scrolls; open: shows a kept tab at a
 *   scroll if nothing has moved yet (used when early.js didn't mark the page; false: not opened)
 * @param {{ minutes?: number, storage?: PlaceStore | null, now?: () => number, location?: Pick<Location, 'pathname' | 'hash' | 'search'>,
 *   events?: Pick<Window, 'addEventListener' | 'removeEventListener'>, doc?: Document, resumed?: { page: HTMLElement, y: number } | null,
 *   scrollTo?: (y: number) => void, scrollY?: () => number }} [o]
 *   resumed: the page tabPages already opened from early.js's mark (its scroll is held); scrollTo / scrollY: the
 *   window's, by default
 * @returns {{ save: () => void, stop: () => void }}  save: keeps the place now
 */
export function resumeTabs(tabs: {
    current: () => HTMLElement;
    y: () => number;
    ys?: () => Record<string, number>;
    open?: (tab: string, y: number, ys?: Record<string, number>) => boolean;
}, { minutes, storage, now, location, events, doc, resumed, scrollTo, scrollY }?: {
    minutes?: number;
    storage?: PlaceStore | null;
    now?: () => number;
    location?: Pick<Location, "pathname" | "hash" | "search">;
    events?: Pick<Window, "addEventListener" | "removeEventListener">;
    doc?: Document;
    resumed?: {
        page: HTMLElement;
        y: number;
    } | null;
    scrollTo?: (y: number) => void;
    scrollY?: () => number;
}): {
    save: () => void;
    stop: () => void;
};
/** Where the place is kept (localStorage). */
export const RESUME_KEY: "ui-resume";
/** How long after leaving a start still resumes (minutes; the minutes option). */
export const RESUME_MINUTES: 60;
/** How long the kept scroll is held while the page grows (ms): a list drawn later than this starts at the top. */
export const RESUME_HOLD_MS: 3000;
export type KeptPlace = {
    v: 1;
    path: string;
    tab: string;
    y: number;
    at: number;
    until: number;
    ys?: Record<string, number>;
};
export type PlaceStore = {
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
};
