/**
 * @typedef {{ tab: string, scroll: number }} Step
 * @typedef {{ base: string, tab: string, trail: Step[], scroll: number }} NavState
 * @typedef {{ history: History, location: Pick<Location, 'pathname' | 'search' | 'hash'>,
 *   parents: Record<string, string>, allowed: (tab: string) => boolean, onNavigate: (tab: string, scroll: number) => void,
 *   getScroll?: () => number }} NavOptions  parents: each screen's parent; allowed: whether a name is a screen;
 *   onNavigate: the page shows that screen and restores the scroll
 */
/** @param {NavOptions} o */
export function createNavigation({ history, location, parents, allowed, onNavigate, getScroll }: NavOptions): {
    initialize: (tab: string) => void;
    go: (tab: string, { replace }?: {
        replace?: boolean;
    }) => boolean;
    sync: (tab: string) => void;
    remember: () => void;
    back: (parent?: string) => void;
    backTarget: (parent?: string) => string | undefined;
};
export type Step = {
    tab: string;
    scroll: number;
};
export type NavState = {
    base: string;
    tab: string;
    trail: Step[];
    scroll: number;
};
/**
 * parents: each screen's parent; allowed: whether a name is a screen;
 * onNavigate: the page shows that screen and restores the scroll
 */
export type NavOptions = {
    history: History;
    location: Pick<Location, "pathname" | "search" | "hash">;
    parents: Record<string, string>;
    allowed: (tab: string) => boolean;
    onNavigate: (tab: string, scroll: number) => void;
    getScroll?: () => number;
};
