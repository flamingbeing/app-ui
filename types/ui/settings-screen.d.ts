/**
 * @param {HTMLElement} host  the screen is added here
 * @param {{ settings: import('../settings/types').SettingsApi, sections: SettingSection[], file?: string | false,
 *   labels?: Record<string, string>, about?: { name: string, update: import('./types').UpdateApi | null,
 *   licences?: Record<string, string>, importMap?: { imports?: Record<string, string> } | null, install?: boolean,
 *   rows?: { label: string, sub?: string, value?: string, href?: string, run?: () => unknown }[] },
 *   menu?: SettingsMenu | boolean }} o  file: the exported file's name (false: no file rows); labels: words over
 *   SETTINGS_WORDS (and LABELS, INSTALL_WORDS); about: the About group (update null: the version reads "dev", no
 *   check; install false: no Install this app row, else it shows until installed; rows: the app's own rows at the end
 *   of About, each with a value or a link (href) or a button (run), e.g. Privacy, Terms); menu: open on the menu (true: with
 *   no steps)
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
        install?: boolean;
        rows?: {
            label: string;
            sub?: string;
            value?: string;
            href?: string;
            run?: () => unknown;
        }[];
    };
    menu?: SettingsMenu | boolean;
}): () => void;
/**
 * @typedef {import('../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ key: string, label: string, sub?: string, more?: string, choices?: [unknown, string][], min?: number,
 *   max?: number, step?: number }} SettingRow  sub: one line of help; more: the rest, behind an info button; choices:
 *   [value, word] pairs (a picker); a boolean default is a switch; a number one a number field (min, max, step)
 * @typedef {{ heading: string }} SettingHeading  a subheading between rows (a small title; no control, no key)
 * @typedef {{ title: string, rows?: (SettingRow | SettingHeading)[], reset?: boolean, mount?: (host: HTMLElement) => (() => void) | void,
 *   icon?: IconNodes, sub?: string, group?: string, find?: string, visible?: (() => boolean) | string }} SettingSection
 *   reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo; with menu:
 *   icon, sub (its one line) and group (the menu heading it sits under), find: more words the search finds it by;
 *   visible: a function or an option key (read with settings.get): shown only while true, live (a key is watched, a
 *   function re-runs on any change); a hidden page leaves the menu and the search, and closes if open (default: shown)
 * @typedef {{ steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } },
 *   top?: (host: HTMLElement) => (() => void) | void, search?: boolean,
 *   onPage?: (page: { title: string, close: () => void } | null) => void }} SettingsMenu
 *   steps: createTransients' api (Back closes a page); top: the app's own part above the menu (such as the tabs off
 *   the bar); search: the search box (default on); onPage: told each time a page opens (its title, and close: what
 *   Back does) and when the menu is back (null), so the screen's own title and Back stand for the page's; with it, a
 *   page has no Back button of its own and its heading is visually hidden (pass steps too, so history Back closes it)
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
 * a subheading between rows (a small title; no control, no key)
 */
export type SettingHeading = {
    heading: string;
};
/**
 * reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo; with menu:
 * icon, sub (its one line) and group (the menu heading it sits under), find: more words the search finds it by;
 * visible: a function or an option key (read with settings.get): shown only while true, live (a key is watched, a
 * function re-runs on any change); a hidden page leaves the menu and the search, and closes if open (default: shown)
 */
export type SettingSection = {
    title: string;
    rows?: (SettingRow | SettingHeading)[];
    reset?: boolean;
    mount?: (host: HTMLElement) => (() => void) | void;
    icon?: IconNodes;
    sub?: string;
    group?: string;
    find?: string;
    visible?: (() => boolean) | string;
};
/**
 * steps: createTransients' api (Back closes a page); top: the app's own part above the menu (such as the tabs off
 * the bar); search: the search box (default on); onPage: told each time a page opens (its title, and close: what
 * Back does) and when the menu is back (null), so the screen's own title and Back stand for the page's; with it, a
 * page has no Back button of its own and its heading is visually hidden (pass steps too, so history Back closes it)
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
    onPage?: (page: {
        title: string;
        close: () => void;
    } | null) => void;
};
