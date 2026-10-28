/**
 * @param {HTMLElement} host  the button and the sheet are added here
 * @param {{ sync: import('./types').SyncApi, text?: (value: unknown) => string, idPrefix?: string }} o
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 *   text: one side's record in words (default: as JSON)
 * @returns {() => void} stop: unsubscribes and removes both
 */
export function conflictSheet(host: HTMLElement, { sync, text, idPrefix }: {
    sync: import("./types").SyncApi;
    text?: (value: unknown) => string;
    idPrefix?: string;
}): () => void;
