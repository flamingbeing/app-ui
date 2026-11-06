/**
 * @param {{ id: string, label: string | (() => string), cards: MenuCard[] | (() => MenuCard[]), heading?: string | (() => string),
 *   steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } },
 *   close?: boolean | { label?: string, at?: 'start' | 'end' } }} o
 *   id: the dialog's id (row ids are the app's); label: what the sheet is for (its accessible name); cards: what it
 *   shows, read each time it opens; heading: a title over the cards; steps: the page's createTransients(), so Back
 *   closes it (without it, Back leaves it be); close: a Close row in a card of its own (true: "Close" at the end;
 *   or { label, at: 'start' | 'end' }; default none)
 * @returns {MenuSheet}
 */
export function menuSheet(o: {
    id: string;
    label: string | (() => string);
    cards: MenuCard[] | (() => MenuCard[]);
    heading?: string | (() => string);
    steps?: {
        open: (dismiss: () => void) => {
            readonly active: boolean;
            close: () => Promise<void>;
        };
    };
    close?: boolean | {
        label?: string;
        at?: "start" | "end";
    };
}): MenuSheet;
export type IconNodes = import("../../icons/lucide.js").IconNodes;
/**
 * ticked: an on-state (a tick at the end, aria-pressed); radio: one of a choice (a radio at the end, filled on the one
 * chosen); next: opens another list (a chevron); danger: red (a delete); hint: a few faint words at the end; sub: a
 * second, smaller line; disabled: shown, not tappable (the hint says why); aside: a button of its own at the end (a
 * tab's close) that keeps the sheet open and draws it again
 */
export type MenuRow = {
    id?: string;
    icon?: IconNodes;
    label: string;
    run?: () => unknown;
    ticked?: boolean;
    radio?: boolean;
    danger?: boolean;
    next?: boolean;
    hint?: string;
    sub?: string;
    disabled?: boolean;
    aside?: {
        id?: string;
        icon: IconNodes;
        label: string;
        run: () => unknown;
    };
};
/**
 * title: what the card is for (read by screen readers, not shown)
 */
export type MenuCard = {
    title?: string;
    rows: MenuRow[];
};
export type MenuSheet = {
    open: () => void;
    close: (v?: number) => Promise<void>;
    refill: () => void;
    isOpen: () => boolean;
    el: HTMLDialogElement;
    destroy: () => void;
};
