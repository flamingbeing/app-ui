/**
 * @param {HTMLElement} host  the switch is added here
 * @param {{ name?: string }} [o]  name: the app's name, the Look picker's word for the app's own look (else "The app's own")
 * @returns {() => void} stop: removes it
 */
export function themeSwitch(host: HTMLElement, { name }?: {
    name?: string;
}): () => void;
/**
 * The look and density pickers alone (the gallery's switcher).
 * @param {HTMLElement} host @param {() => void} [after]  runs after a pick
 * @returns {() => void} stop: removes them
 */
export function lookSwitch(host: HTMLElement, after?: () => void): () => void;
/**
 * The theme as a list (opt-in, instead of themeSwitch's selects when an app wants one page of choices): a "Sync with
 * system" switch (on: the theme follows the phone's light or dark; off: it stays as it is now) over a list of the
 * styles (presets.js) with a tick on the picked one. A pick sets the style, nothing else. Re-draws when it changes.
 * @param {HTMLElement} host  the list is added here
 * @param {{ syncLabel?: string }} [o]
 * @returns {() => void} stop: removes it
 */
export function themeList(host: HTMLElement, { syncLabel }?: {
    syncLabel?: string;
}): () => void;
