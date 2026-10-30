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
