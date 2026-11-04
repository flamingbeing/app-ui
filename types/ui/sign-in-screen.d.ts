/**
 * Whether this browser holds an app-sync account's copy (its `<name>:auth/owner` entry), so Forget has something to
 * clear. Apps without app-sync pass their own `holdsCopy`.
 * @param {Pick<Storage, 'length' | 'key' | 'getItem'> | null} [store]
 */
export function holdsSyncCopy(store?: Pick<Storage, "length" | "key" | "getItem"> | null): boolean;
/**
 * @typedef {{ label: string, onTap: () => void, id?: string }} MoreButton
 * @param {HTMLElement} host  the screen is added here (the app's signed-out section)
 * @param {{
 *   name: string, tagline?: string, icon?: string, accent?: string,
 *   auth?: import('./types').AuthApi | null, label?: string,
 *   fields?: HTMLElement | null, more?: MoreButton[], about?: HTMLElement | null, note?: string,
 *   holdsCopy?: () => boolean, onForget?: (ok: boolean) => void, idPrefix?: string,
 * }} o
 *   name, tagline, icon (an image address), accent (a CSS colour for the glow; default the theme's accent): the app's own.
 *   auth: the Google button signs in with it (leave it out for a passcode-only screen); label: that button's words.
 *   fields: the app's own form (passcode, password), above the buttons. more: extra plain buttons below ("Try the demo").
 *   about: anything more under the tagline (a short list of what the app does). note: the small line at the bottom.
 *   holdsCopy: whether this phone keeps a signed-out copy (default: an app-sync owner is stored); onForget: told
 *   whether this device was forgotten. idPrefix: put before each id (two on one page, or ids the app already uses).
 * @returns {() => void} stop: unsubscribes and removes the screen
 */
export function signInScreen(host: HTMLElement, { name, tagline, icon, accent, auth, label, fields, more, about, note, holdsCopy, onForget, idPrefix, }: {
    name: string;
    tagline?: string;
    icon?: string;
    accent?: string;
    auth?: import("./types").AuthApi | null;
    label?: string;
    fields?: HTMLElement | null;
    more?: MoreButton[];
    about?: HTMLElement | null;
    note?: string;
    holdsCopy?: () => boolean;
    onForget?: (ok: boolean) => void;
    idPrefix?: string;
}): () => void;
export type MoreButton = {
    label: string;
    onTap: () => void;
    id?: string;
};
