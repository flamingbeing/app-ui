/** @param {unknown} err  a failed sign-in -> why, in plain words (never the raw error text) */
export function whyFailed(err: unknown): "Sign-in was cancelled." | "No signal, so that didn’t work. Try again when you’re online." | "Sign-in isn’t switched on for this address yet." | "Sign-in didn’t work. Try again in a moment.";
/** @param {{ reason: string, from?: { email?: string } | null }} r  auth.signIn()'s answer (or auth.blocked()) -> '' or why it was refused */
export function whyRefused({ reason, from }: {
    reason: string;
    from?: {
        email?: string;
    } | null;
}): string;
/** @param {{ ok: boolean, reason: string, failed?: string[] }} r  auth.forget()'s answer, in words */
export function forgetWords({ ok, reason, failed }: {
    ok: boolean;
    reason: string;
    failed?: string[];
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
