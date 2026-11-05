/**
 * What to do now (pure): the browser's state, and until when "Not now" holds for this kind.
 * @param {AskState} state @param {number} laterUntil  0: no "Not now" kept @param {number} now
 * @returns {AskAnswer | 'ask'}  'ask': show the sheet
 */
export function askStep(state: AskState, laterUntil: number, now: number): AskAnswer | "ask";
/** The kept "Not now"s (pure): { kind: until }, anything unreadable left out. @param {string | null} raw @returns {Record<string, number>} */
export function laterTimes(raw: string | null): Record<string, number>;
/**
 * What the browser knows already, without asking: 'unsupported' where it has no such thing.
 * @param {AskKind} kind @param {AskEnv} [env] @returns {Promise<AskState>}
 */
export function permissionState(kind: AskKind, env?: AskEnv): Promise<AskState>;
/**
 * The browser's own prompt (call it straight from a tap: browsers ask only after one). A prompt closed without an
 * answer is 'later'.
 * @param {AskKind} kind @param {AskEnv} [env] @returns {Promise<AskAnswer>}
 */
export function requestPermission(kind: AskKind, env?: AskEnv): Promise<AskAnswer>;
/**
 * @param {AskKind} kind
 * @param {{ why?: string, labels?: Record<string, string>, laterDays?: number, storage?: { getItem: (k: string) => string | null, setItem: (k: string, v: string) => void } | null,
 *   now?: () => number, env?: AskEnv }} [o]
 *   why: the app's one-line reason, shown in the sheet; laterDays: how long Not now holds (ASK_LATER_DAYS); storage,
 *   now, env: the page's own by default (tests)
 * @returns {Promise<AskAnswer>}
 */
export function askFirst(kind: AskKind, o?: {
    why?: string;
    labels?: Record<string, string>;
    laterDays?: number;
    storage?: {
        getItem: (k: string) => string | null;
        setItem: (k: string, v: string) => void;
    } | null;
    now?: () => number;
    env?: AskEnv;
}): Promise<AskAnswer>;
/** @typedef {'notifications' | 'location' | 'camera' | 'microphone'} AskKind */
/** @typedef {'granted' | 'denied' | 'later' | 'unsupported'} AskAnswer */
/** @typedef {'granted' | 'denied' | 'prompt' | 'unsupported'} AskState */
/**
 * The browser's parts askFirst uses (the page's own by default; tests hand in fakes).
 * @typedef {{ permissions?: { query: (d: { name: any }) => Promise<{ state: string }> } | null,
 *   Notification?: { permission: string, requestPermission: (cb?: (p: string) => void) => Promise<string> | void } | null,
 *   geolocation?: { getCurrentPosition: (ok: (p: unknown) => void, fail: (e: { code?: number }) => void, o?: PositionOptions) => void } | null,
 *   mediaDevices?: { getUserMedia: (c: MediaStreamConstraints) => Promise<{ getTracks: () => { stop: () => void }[] }> } | null }} AskEnv
 */
/** The kinds askFirst knows. */
export const ASK_KINDS: readonly AskKind[];
/** How long "Not now" holds, per kind (days; the laterDays option). */
export const ASK_LATER_DAYS: 7;
/** Where "Not now" is kept (localStorage): { kind: until (ms) }. */
export const ASK_LATER_KEY: "ui-ask-later";
export type AskKind = "notifications" | "location" | "camera" | "microphone";
export type AskAnswer = "granted" | "denied" | "later" | "unsupported";
export type AskState = "granted" | "denied" | "prompt" | "unsupported";
/**
 * The browser's parts askFirst uses (the page's own by default; tests hand in fakes).
 */
export type AskEnv = {
    permissions?: {
        query: (d: {
            name: any;
        }) => Promise<{
            state: string;
        }>;
    } | null;
    Notification?: {
        permission: string;
        requestPermission: (cb?: (p: string) => void) => Promise<string> | void;
    } | null;
    geolocation?: {
        getCurrentPosition: (ok: (p: unknown) => void, fail: (e: {
            code?: number;
        }) => void, o?: PositionOptions) => void;
    } | null;
    mediaDevices?: {
        getUserMedia: (c: MediaStreamConstraints) => Promise<{
            getTracks: () => {
                stop: () => void;
            }[];
        }>;
    } | null;
};
