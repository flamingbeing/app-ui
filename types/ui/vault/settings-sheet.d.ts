/**
 * @param {{ id?: string, title?: string, root: SettingsCard[] | (() => SettingsCard[]), pages: SettingsPage[],
 *   steps?: import('./side-drawer.js').Steps, search?: boolean | { placeholder?: string, none?: string },
 *   closeLabel?: string, onClose?: () => void }} o
 *   id: the dialog's (default ui-vault-settings; the parts' ids start with it); title: the root's (default
 *   Settings); root: the root's cards, under the search; pages: every page a row can open; steps: the page's
 *   createTransients() (without it, Back leaves it be); search: the root's search box (default on), its words;
 *   closeLabel: the X's name; onClose: it has closed
 * @returns {SettingsSheet}
 */
export function settingsSheet(o: {
    id?: string;
    title?: string;
    root: SettingsCard[] | (() => SettingsCard[]);
    pages: SettingsPage[];
    steps?: import("./side-drawer.js").Steps;
    search?: boolean | {
        placeholder?: string;
        none?: string;
    };
    closeLabel?: string;
    onClose?: () => void;
}): SettingsSheet;
export type IconNodes = import("../../icons/lucide.js").IconNodes;
/**
 * id: the control's (a link's button, a switch's input; default made from the sheet's id); sub: a second line;
 * keywords: more words the search finds it by; shown: read each time the page is drawn (default shown)
 */
export type RowBase = {
    id?: string;
    label: string;
    sub?: string;
    keywords?: string;
    shown?: () => boolean;
};
/**
 * opens page `go` (its icon, else the page's)
 */
export type GoRow = RowBase & {
    go: string;
    icon?: IconNodes;
    hint?: string;
};
/**
 * a switch; set may throw or reject (the switch shows get() again, the words say why); gear: a page of its options,
 * its gear shown while the switch is on
 */
export type ToggleRow = RowBase & {
    toggle: {
        get: () => boolean;
        set: (on: boolean) => unknown;
    };
    gear?: string;
};
/**
 * one of a few (a pill with chevrons under the words: the browser's own picker); options: [value, words]; set as a
 * switch's
 */
export type ChoiceRow = RowBase & {
    choice: {
        options: [string, string][];
        get: () => string;
        set: (value: string) => unknown;
    };
};
/**
 * the app's own control, at the end
 *  of the row or under its words
 */
export type ControlRow = RowBase & {
    control: () => HTMLElement;
    under?: boolean;
};
/**
 * a pill button under the words
 */
export type ButtonRow = RowBase & {
    button: {
        text: string;
        run: () => unknown;
        danger?: boolean;
    };
};
/**
 * words at the end (read only)
 */
export type ValueRow = RowBase & {
    value: string | (() => string);
};
export type SettingsRow = GoRow | ToggleRow | ChoiceRow | ControlRow | ButtonRow | ValueRow;
/**
 * title: a heading over the card
 */
export type SettingsCard = {
    title?: string;
    sub?: string;
    rows: SettingsRow[];
};
/**
 * cards: read each time the page is drawn; shown: whether its rows are found by the search (default yes)
 */
export type SettingsPage = {
    id: string;
    title: string;
    icon?: IconNodes;
    cards: SettingsCard[] | (() => SettingsCard[]);
    shown?: () => boolean;
};
export type SettingsSheet = {
    el: HTMLDialogElement;
    open: () => void;
    close: () => Promise<void>;
    go: (page: string) => Promise<void>;
    back: () => Promise<void>;
    refresh: () => void;
    isOpen: () => boolean;
    top: () => string;
    say: (text: string, bad?: boolean) => void;
    destroy: () => void;
};
export type Shown = {
    id: string;
    el: HTMLElement;
    x: number;
    v: number;
    step: {
        readonly active: boolean;
        close: () => Promise<void>;
    } | null;
    from: string;
};
