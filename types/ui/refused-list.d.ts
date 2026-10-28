/**
 * @param {HTMLElement} host  the list is added here
 * @param {{ sync: import('./types').SyncApi, kind?: string, text?: (record: Record<string, unknown>) => string, idPrefix?: string }} o
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 *   kind: only this collection's saves (default: all); text: a save in words (default: its fields as JSON)
 * @returns {() => void} stop: unsubscribes and removes the list
 */
export function refusedList(host: HTMLElement, { sync, kind, text, idPrefix }: {
    sync: import("./types").SyncApi;
    kind?: string;
    text?: (record: Record<string, unknown>) => string;
    idPrefix?: string;
}): () => void;
