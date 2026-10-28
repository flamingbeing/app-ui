/**
 * @param {HTMLElement} host  the switch is added here
 * @returns {() => void} stop: removes it
 */
export function themeSwitch(host: HTMLElement): () => void;
/**
 * The look and density pickers alone (the gallery's switcher).
 * @param {HTMLElement} host @param {() => void} [after]  runs after a pick
 * @returns {() => void} stop: removes them
 */
export function lookSwitch(host: HTMLElement, after?: () => void): () => void;
