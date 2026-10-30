/**
 * @param {HTMLElement} host  the screen is added here
 * @param {{ settings: import('../settings/types').SettingsApi, sections: SettingSection[], file?: string | false,
 *   labels?: Record<string, string>, about?: { name: string, update: import('./types').UpdateApi | null,
 *   licences?: Record<string, string>, importMap?: { imports?: Record<string, string> } | null },
 *   menu?: SettingsMenu | boolean }} o  file: the exported file's name (false: no file rows); labels: words over
 *   SETTINGS_WORDS (and LABELS); about: the About group (update null: the version reads "dev", no check); menu: open
 *   on the menu (true: with no steps)
 * @returns {() => void} stop: unwatches and removes the screen
 */
export function settingsScreen(host: HTMLElement, { settings, sections, file, labels, about, menu }: {
    settings: import("../settings/types").SettingsApi;
    sections: SettingSection[];
    file?: string | false;
    labels?: Record<string, string>;
    about?: {
        name: string;
        update: import("./types").UpdateApi | null;
        licences?: Record<string, string>;
        importMap?: {
            imports?: Record<string, string>;
        } | null;
    };
    menu?: SettingsMenu | boolean;
}): () => void;
/**
 * @typedef {import('../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ key: string, label: string, sub?: string, more?: string, choices?: [unknown, string][], min?: number,
 *   max?: number, step?: number }} SettingRow  sub: one line of help; more: the rest, behind an info button; choices:
 *   [value, word] pairs (a picker); a boolean default is a switch; a number one a number field (min, max, step)
 * @typedef {{ title: string, rows?: SettingRow[], reset?: boolean, mount?: (host: HTMLElement) => (() => void) | void,
 *   icon?: IconNodes, sub?: string, group?: string, find?: string }} SettingSection
 *   reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo; with menu:
 *   icon, sub (its one line) and group (the menu heading it sits under), find: more words the search finds it by
 * @typedef {{ steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } },
 *   top?: (host: HTMLElement) => (() => void) | void, search?: boolean }} SettingsMenu
 *   steps: createTransients' api (Back closes a page); top: the app's own part above the menu (such as the tabs off
 *   the bar); search: the search box (default on)
 */
/** @type {Readonly<Record<string, string>>} */
export const SETTINGS_WORDS: Readonly<Record<string, string>>;
export type IconNodes = import("../icons/lucide.js").IconNodes;
/**
 * sub: one line of help; more: the rest, behind an info button; choices:
 *  [value, word] pairs (a picker); a boolean default is a switch; a number one a number field (min, max, step)
 */
export type SettingRow = {
    key: string;
    label: string;
    sub?: string;
    more?: string;
    choices?: [unknown, string][];
    min?: number;
    max?: number;
    step?: number;
};
/**
 * reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo; with menu:
 * icon, sub (its one line) and group (the menu heading it sits under), find: more words the search finds it by
 */
export type SettingSection = {
    title: string;
    rows?: SettingRow[];
    reset?: boolean;
    mount?: (host: HTMLElement) => (() => void) | void;
    icon?: IconNodes;
    sub?: string;
    group?: string;
    find?: string;
};
/**
 * steps: createTransients' api (Back closes a page); top: the app's own part above the menu (such as the tabs off
 * the bar); search: the search box (default on)
 */
export type SettingsMenu = {
    steps?: {
        open: (dismiss: () => void) => {
            readonly active: boolean;
            close: () => Promise<void>;
        };
    };
    top?: (host: HTMLElement) => (() => void) | void;
    search?: boolean;
};
