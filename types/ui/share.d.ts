/**
 * @typedef {{ show: (message: string) => unknown }} Notes  the page's toaster
 * @typedef {{ toasts?: Notes, labels?: Record<string, string> }} ShareOptions
 */
/**
 * @param {string} text @param {ShareOptions & { what?: string }} [o]  what: the word shown after copying
 * @returns {Promise<boolean>} whether it was copied
 */
export function copyText(text: string, { toasts, labels, what }?: ShareOptions & {
    what?: string;
}): Promise<boolean>;
/**
 * The share sheet (messages, notes apps); the clipboard where there isn't one. A closed sheet is not an error.
 * @param {string} text @param {ShareOptions & { title?: string }} [o]
 * @returns {Promise<'shared' | 'copied' | 'cancelled' | 'failed'>}
 */
export function shareText(text: string, { title, toasts, labels }?: ShareOptions & {
    title?: string;
}): Promise<"shared" | "copied" | "cancelled" | "failed">;
/**
 * Share this screen: its link through the system share sheet (with a title, and words if given), or the link copied
 * where there is no share sheet or it can't take a link. A closed sheet is not an error.
 * @param {ShareOptions & { url?: string, title?: string, text?: string }} [o]  url: default the page's own address
 * @returns {Promise<'shared' | 'copied' | 'cancelled' | 'failed'>}
 */
export function shareLink({ url, title, text, toasts, labels }?: ShareOptions & {
    url?: string;
    title?: string;
    text?: string;
}): Promise<"shared" | "copied" | "cancelled" | "failed">;
/**
 * the page's toaster
 */
export type Notes = {
    show: (message: string) => unknown;
};
export type ShareOptions = {
    toasts?: Notes;
    labels?: Record<string, string>;
};
