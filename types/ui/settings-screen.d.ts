/**
 * @param {HTMLElement} host  the screen is added here
 * @param {{ settings: import('../settings/types').SettingsApi, sections: SettingSection[], file?: string | false,
 *   labels?: Record<string, string>, about?: { name: string, update: import('./types').UpdateApi | null,
 *   licences?: Record<string, string>, importMap?: { imports?: Record<string, string> } | null } }} o  file: the
 *   exported file's name (false: no file rows); labels: words over SETTINGS_WORDS (and LABELS); about: the About group
 *   (update null: the version reads "dev", no check)
 * @returns {() => void} stop: unwatches and removes the screen
 */
export function settingsScreen(host: HTMLElement, { settings, sections, file, labels, about }: {
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
}): () => void;
/**
 * @typedef {{ key: string, label: string, sub?: string, more?: string, choices?: [unknown, string][], min?: number,
 *   max?: number, step?: number }} SettingRow  sub: one line of help; more: the rest, behind an info button; choices:
 *   [value, word] pairs (a picker); a boolean default is a switch; a number one a number field (min, max, step)
 * @typedef {{ title: string, rows?: SettingRow[], reset?: boolean, mount?: (host: HTMLElement) => (() => void) | void }} SettingSection
 *   reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo
 */
/** @type {Readonly<Record<string, string>>} */
export const SETTINGS_WORDS: Readonly<Record<string, string>>;
/**
 * sub: one line of help; more: the rest, behind an info button; choices:
 *   [value, word] pairs (a picker); a boolean default is a switch; a number one a number field (min, max, step)
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
 * reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo
 */
export type SettingSection = {
    title: string;
    rows?: SettingRow[];
    reset?: boolean;
    mount?: (host: HTMLElement) => (() => void) | void;
};
