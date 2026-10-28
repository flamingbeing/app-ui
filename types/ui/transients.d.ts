/**
 * @typedef {{ history: History, location: Pick<Location, 'pathname' | 'search' | 'hash' | 'href'>, events: Pick<Window, 'addEventListener'> }} Env
 * @typedef {{ readonly active: boolean, close: () => Promise<void> }} Transient
 * @typedef {{ id: string, dismiss: () => void, active: boolean, pending: Promise<void> | null, resolve?: () => void }} Entry
 */
/**
 * @param {Env} env
 * @returns {{ open: (dismiss: () => void) => Transient, dismissAll: () => Promise<void>, reset: () => void }}
 *   open: adds the entry; dismiss runs when Back (or close) takes it away; close() goes Back for it and resolves once
 *   it has landed; dismissAll closes every one, newest first; reset forgets them without running dismiss (sign-out)
 */
export function createTransients({ history, location, events }: Env): {
    open: (dismiss: () => void) => Transient;
    dismissAll: () => Promise<void>;
    reset: () => void;
};
export type Env = {
    history: History;
    location: Pick<Location, "pathname" | "search" | "hash" | "href">;
    events: Pick<Window, "addEventListener">;
};
export type Transient = {
    readonly active: boolean;
    close: () => Promise<void>;
};
export type Entry = {
    id: string;
    dismiss: () => void;
    active: boolean;
    pending: Promise<void> | null;
    resolve?: () => void;
};
