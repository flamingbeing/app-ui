/**
 * @typedef {{ open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } }} Steps
 * @typedef {{ el: HTMLDialogElement, open: () => Promise<void>, close: () => Promise<void>, leave: () => Promise<void>,
 *   toggle: () => Promise<void>, isOpen: () => boolean,
 *   swipeFrom: (el: HTMLElement, o?: { can?: () => boolean, edge?: () => number }) => () => void, destroy: () => void }} SideDrawer
 *   open/close: resolve once it has landed; leave: closed without waiting for the slide (resolves once its Back step is
 *   gone, so a page opened next is a step of its own); swipeFrom: a swipe on this element opens it (returns a stop)
 */
/**
 * @param {{ id: string, label: string, side?: 'left' | 'right', steps?: Steps, pushed?: () => (HTMLElement | null | undefined)[],
 *   onChange?: (open: boolean) => void, onOpen?: () => void }} o
 *   id: the dialog's; label: its accessible name; steps: the page's createTransients() (without it, Back leaves it be);
 *   pushed: what slides aside with it (the content, the pill), read at each move; onChange: opening or closing (a
 *   button's look); onOpen: it is about to show (fill it)
 * @returns {SideDrawer}
 */
export function sideDrawer({ id, label, side, steps, pushed, onChange, onOpen }: {
    id: string;
    label: string;
    side?: "left" | "right";
    steps?: Steps;
    pushed?: () => (HTMLElement | null | undefined)[];
    onChange?: (open: boolean) => void;
    onOpen?: () => void;
}): SideDrawer;
/** px from the screen's edge: the phone's own Back gesture, never a drawer's swipe */
export const DRAWER_EDGE: 24;
export type Steps = {
    open: (dismiss: () => void) => {
        readonly active: boolean;
        close: () => Promise<void>;
    };
};
/**
 * open/close: resolve once it has landed; leave: closed without waiting for the slide (resolves once its Back step is
 * gone, so a page opened next is a step of its own); swipeFrom: a swipe on this element opens it (returns a stop)
 */
export type SideDrawer = {
    el: HTMLDialogElement;
    open: () => Promise<void>;
    close: () => Promise<void>;
    leave: () => Promise<void>;
    toggle: () => Promise<void>;
    isOpen: () => boolean;
    swipeFrom: (el: HTMLElement, o?: {
        can?: () => boolean;
        edge?: () => number;
    }) => () => void;
    destroy: () => void;
};
