/** @param {{ reason: string, from?: { email?: string } | null }} r  auth.signIn()'s answer (or auth.blocked()) -> '' or why it was refused */
export function whyRefused({ reason, from }: {
    reason: string;
    from?: {
        email?: string;
    } | null;
}): string;
/**
 * @param {HTMLElement} host  the sheet's parts are added here
 * @param {{ auth: import('./types').AuthApi, label?: string, onForget?: (ok: boolean) => void, idPrefix?: string }} o
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 *   label: the sign-in button's words; onForget: told whether this device was forgotten
 * @returns {() => void} stop: unsubscribes and removes the parts
 */
export function signInSheet(host: HTMLElement, { auth, label, onForget, idPrefix }: {
    auth: import("./types").AuthApi;
    label?: string;
    onForget?: (ok: boolean) => void;
    idPrefix?: string;
}): () => void;
