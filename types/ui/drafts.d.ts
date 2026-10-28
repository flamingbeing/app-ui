/**
 * @param {string} prefix  the app's own storage prefix
 * @param {string} owner  what the draft belongs to (an account id, a form name)
 * @param {{ storage?: DraftStore, session?: DraftStore, move?: boolean }} [o]  storage: where drafts live (default
 *   localStorage); session: where this document remembers its slot (default sessionStorage); move: the old slot is taken
 *   over, not copied (one draft at a time); a hidden or closing page puts it down for the next document to take
 * @returns {{ key: string, initial: unknown, release: () => void, save: (value: unknown) => void, clear: () => void, stop: () => void }}
 *   initial: the draft found on open (null: none); save throws where storage is blocked; stop: removes the page listeners
 *   (when the editor closes)
 */
export function draftSlot(prefix: string, owner: string, { storage, session, move }?: {
    storage?: DraftStore;
    session?: DraftStore;
    move?: boolean;
}): {
    key: string;
    initial: unknown;
    release: () => void;
    save: (value: unknown) => void;
    clear: () => void;
    stop: () => void;
};
/**
 * The drafts left behind for an owner (unfinished work from earlier documents).
 * @param {string} prefix @param {string} owner
 * @param {DraftStore} [storage]
 * @returns {{ key: string, value: unknown }[]}
 */
export function listDrafts(prefix: string, owner: string, storage?: DraftStore): {
    key: string;
    value: unknown;
}[];
export type DraftStore = {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
    removeItem(k: string): void;
};
