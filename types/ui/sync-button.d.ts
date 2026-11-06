/**
 * What the button shows for a sync state (pure, for the tests)
 * @param {string} state  the sync module's state (synced, pending, offline, attention, at-risk, unknown)
 * @param {number} count  what waits (0: nothing)
 * @param {boolean} spinning  a tap's minimum spin is still running
 * @param {Record<string, string>} words  LABELS with the app's words over them
 * @returns {{ shown: string, label: string }}
 */
export function syncLook(state: string, count: number, spinning: boolean, words: Record<string, string>): {
    shown: string;
    label: string;
};
/**
 * @param {HTMLElement} host  a <button> becomes the sync button (the app's markup places it before the script runs);
 *   any other element gets one added
 * @param {{ sync: import('./types').SyncApi, syncNow?: () => unknown, checkUpdate?: false | (() => unknown),
 *   labels?: Record<string, string>, idPrefix?: string, orbit?: boolean }} o
 *   syncNow: what a tap does (default: the sync module's nudge('wake') then flush()); checkUpdate: what a tap also
 *   does, at most once per UPDATE_GAP_MS (default: the service worker registration's update(); false: nothing);
 *   labels: words over LABELS; idPrefix: put before the button's id; orbit: while sending, the orbit loader (orbit.js)
 *   in place of the cloud
 * @returns {() => void} stop: unsubscribes, and removes the button if this part added it
 */
export function syncButton(host: HTMLElement, { sync, syncNow, checkUpdate, labels, idPrefix, orbit: ring }: {
    sync: import("./types").SyncApi;
    syncNow?: () => unknown;
    checkUpdate?: false | (() => unknown);
    labels?: Record<string, string>;
    idPrefix?: string;
    orbit?: boolean;
}): () => void;
export const MIN_SPIN_MS: 700;
export const UPDATE_GAP_MS: 30000;
