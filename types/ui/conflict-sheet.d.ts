/**
 * @param {HTMLElement} host  the button and the sheet are added here
 * @param {{ sync: import('./types').SyncApi, text?: (value: unknown) => string, idPrefix?: string,
 *   fields?: Record<string, import('./types').ConflictField> }} o
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 *   text: one side's record in words (default: as JSON)
 *   fields: per field path, the words shown for it in the per-field picks (label, default the path) and its value in
 *   words (format, default as JSON), e.g. { 'shift.start': { label: 'Start time', format: v => hhmm(v) } }
 * @returns {() => void} stop: unsubscribes and removes both
 */
export function conflictSheet(host: HTMLElement, { sync, text, idPrefix, fields }: {
    sync: import("./types").SyncApi;
    text?: (value: unknown) => string;
    idPrefix?: string;
    fields?: Record<string, import("./types").ConflictField>;
}): () => void;
