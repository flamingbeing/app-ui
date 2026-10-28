/**
 * @param {HTMLElement} host  the version line and the answer are added here
 * @param {{ update: import('./types').UpdateApi | null, idPrefix?: string }} o
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 * @returns {() => void} stop: stops the retries and removes the prompt
 */
export function updatePrompt(host: HTMLElement, { update, idPrefix }: {
    update: import("./types").UpdateApi | null;
    idPrefix?: string;
}): () => void;
