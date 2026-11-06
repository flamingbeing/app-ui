/**
 * @param {{ buttons: NavButton[], id?: string, label?: string, parent?: HTMLElement, tabsLabel?: (n: number) => string }} o
 *   buttons: the pill's buttons, in order; id: the pill's (default ui-vault-nav); label: its landmark name (default
 *   Navigation); parent: where it goes (default body); tabsLabel: the tabs button's name for a count (default "Open
 *   tabs: n")
 * @returns {NavPill}
 */
export function navPill({ buttons, id, label, parent, tabsLabel }: {
    buttons: NavButton[];
    id?: string;
    label?: string;
    parent?: HTMLElement;
    tabsLabel?: (n: number) => string;
}): NavPill;
export type IconNodes = import("../../icons/lucide.js").IconNodes;
/**
 * slot: back, forward, search, add, tabs, menu, or the app's own name; id: default `<pill id>-<slot>`; label: the
 * button's name (a known slot has one); icon: a known slot has one; count: the tabs slot's starting count
 */
export type NavButton = {
    slot: string;
    run: () => unknown;
    id?: string;
    label?: string;
    icon?: IconNodes;
    count?: number;
};
export type NavPill = {
    el: HTMLElement;
    button: (slot: string) => HTMLButtonElement | undefined;
    can: (slot: string, ok: boolean) => void;
    count: (n: number) => void;
    destroy: () => void;
};
