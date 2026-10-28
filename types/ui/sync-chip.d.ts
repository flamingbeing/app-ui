/**
 * @param {HTMLElement} host  the chip is added here
 * @param {{ sync: import('./types').SyncApi, labels?: Record<string, string>, idPrefix?: string }} o  labels: words over LABELS
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 * @returns {() => void} stop: unsubscribes and removes the chip
 */
export function syncChip(host: HTMLElement, { sync, labels, idPrefix }: {
    sync: import("./types").SyncApi;
    labels?: Record<string, string>;
    idPrefix?: string;
}): () => void;
