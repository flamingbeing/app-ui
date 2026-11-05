// Ask first, at the moment of need (as mini programmes do: per use, never at launch): askFirst(kind, { why }) before
// the app uses notifications, location, the camera or the microphone.
//   allowed already           resolves 'granted', nothing shown
//   blocked by the browser    a short sheet on how to allow it in the browser's or phone's settings; 'denied' once closed
//   "Not now" in the last     resolves 'later', nothing shown (ASK_LATER_DAYS, the laterDays option; per kind, this
//   7 days                    device only)
//   otherwise                 a sheet with the kind's icon, the app's one-line reason (why), Allow and Not now. Allow
//                             asks the browser itself (Notification.requestPermission, geolocation.getCurrentPosition,
//                             getUserMedia, whose tracks are stopped at once) and resolves what it said; Not now
//                             resolves 'later' and is kept; closing the sheet another way resolves 'later', not kept.
//   no such thing here        resolves 'unsupported', nothing shown (no Notification, geolocation or getUserMedia)
// What the browser already knows comes from navigator.permissions.query where there is one (Notification.permission
// for notifications); everything is feature-detected. Words: LABELS (askTitle, askAllow, askNotNow, askOffTitle, askOff,
// and the kinds' names, ok), overridable with labels. Nothing runs on import.
import { LABELS } from './labels.js';
import { el } from './dom.js';
import { icon, bell, mapPin, camera, mic } from '../icons/lucide.js';
import { popSheet } from './pop-sheet.js';

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
export const ASK_KINDS = /** @type {readonly AskKind[]} */ (Object.freeze(['notifications', 'location', 'camera', 'microphone']));
/** How long "Not now" holds, per kind (days; the laterDays option). */
export const ASK_LATER_DAYS = 7;
/** Where "Not now" is kept (localStorage): { kind: until (ms) }. */
export const ASK_LATER_KEY = 'ui-ask-later';

// each kind's name for navigator.permissions, its icon and its words' key
const KINDS = {
  notifications: { query: 'notifications', icon: bell, word: 'askNotifications' },
  location: { query: 'geolocation', icon: mapPin, word: 'askLocation' },
  camera: { query: 'camera', icon: camera, word: 'askCamera' },
  microphone: { query: 'microphone', icon: mic, word: 'askMicrophone' },
};

/** @param {string} s @param {Record<string, string>} v */
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

/** the page's own parts @returns {AskEnv} */
function pageEnv() {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  return {
    permissions: nav?.permissions ?? null,
    Notification: typeof Notification === 'function' ? /** @type {any} */ (Notification) : null,
    geolocation: nav?.geolocation ?? null,
    mediaDevices: nav?.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function' ? nav.mediaDevices : null,
  };
}

/**
 * What to do now (pure): the browser's state, and until when "Not now" holds for this kind.
 * @param {AskState} state @param {number} laterUntil  0: no "Not now" kept @param {number} now
 * @returns {AskAnswer | 'ask'}  'ask': show the sheet
 */
export function askStep(state, laterUntil, now) {
  if (state === 'granted' || state === 'denied' || state === 'unsupported') return state;
  return laterUntil > now ? 'later' : 'ask';
}

/** The kept "Not now"s (pure): { kind: until }, anything unreadable left out. @param {string | null} raw @returns {Record<string, number>} */
export function laterTimes(raw) {
  try {
    const v = JSON.parse(raw || '{}');
    if (!v || typeof v !== 'object') return {};
    return Object.fromEntries(Object.entries(v).filter(([k, t]) => k in KINDS && typeof t === 'number' && Number.isFinite(t)));
  } catch { return {}; }
}

/**
 * What the browser knows already, without asking: 'unsupported' where it has no such thing.
 * @param {AskKind} kind @param {AskEnv} [env] @returns {Promise<AskState>}
 */
export async function permissionState(kind, env = pageEnv()) {
  if (kind === 'notifications') {
    if (!env.Notification) return 'unsupported';
    const p = env.Notification.permission;
    return p === 'granted' || p === 'denied' ? p : 'prompt';
  }
  if (kind === 'location' ? !env.geolocation : !env.mediaDevices) return 'unsupported';
  try {
    const s = (await env.permissions?.query({ name: KINDS[kind].query }))?.state;
    return s === 'granted' || s === 'denied' ? s : 'prompt';
  } catch { return 'prompt'; }   // (a browser that can't query this name, as Firefox for the camera)
}

/**
 * The browser's own prompt (call it straight from a tap: browsers ask only after one). A prompt closed without an
 * answer is 'later'.
 * @param {AskKind} kind @param {AskEnv} [env] @returns {Promise<AskAnswer>}
 */
export async function requestPermission(kind, env = pageEnv()) {
  /** @type {AskAnswer} */
  let said;
  try {
    if (kind === 'notifications') {
      const N = env.Notification;
      if (!N) return 'unsupported';
      // (older Safari takes a callback and returns nothing)
      const p = await new Promise(resolve => { const r = N.requestPermission(resolve); if (r && typeof r.then === 'function') r.then(resolve, () => resolve('default')); });
      said = p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'later';
    } else if (kind === 'location') {
      const g = env.geolocation;
      if (!g) return 'unsupported';
      // a position that can't be found (or in time) still means it was allowed
      said = await new Promise(resolve => g.getCurrentPosition(() => resolve('granted'), e => resolve(e?.code === 1 ? 'denied' : 'granted'),
        { maximumAge: Infinity, timeout: 20_000 }));
    } else {
      const m = env.mediaDevices;
      if (!m) return 'unsupported';
      try {
        const stream = await m.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
        for (const t of stream.getTracks()) t.stop();
        said = 'granted';
      } catch (err) {
        const name = err instanceof Error || (err && typeof err === 'object') ? /** @type {{ name?: string }} */ (err).name : '';
        // allowed but busy (another app has it) is still allowed; no camera at all is unsupported
        said = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'unsupported' : 'granted';
      }
    }
  } catch { said = 'denied'; }
  // a prompt shut without an answer reads as a refusal in some browsers: the state says which it was
  if (said === 'denied' && (await permissionState(kind, env)) === 'prompt') return 'later';
  return said;
}

/** localStorage, or null where it can't be reached */
function local() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** one ask per kind at a time: a second call while a sheet is up gets the same answer @type {Map<string, Promise<AskAnswer>>} */
const asking = new Map();

/**
 * @param {AskKind} kind
 * @param {{ why?: string, labels?: Record<string, string>, laterDays?: number, storage?: { getItem: (k: string) => string | null, setItem: (k: string, v: string) => void } | null,
 *   now?: () => number, env?: AskEnv }} [o]
 *   why: the app's one-line reason, shown in the sheet; laterDays: how long Not now holds (ASK_LATER_DAYS); storage,
 *   now, env: the page's own by default (tests)
 * @returns {Promise<AskAnswer>}
 */
export function askFirst(kind, o = {}) {
  if (!(kind in KINDS)) return Promise.reject(new TypeError(`askFirst: unknown kind ${kind}`));
  const running = asking.get(kind);
  if (running) return running;
  const p = ask(kind, o).finally(() => asking.delete(kind));
  asking.set(kind, p);
  return p;
}

/** @param {AskKind} kind @param {Parameters<typeof askFirst>[1] & {}} o @returns {Promise<AskAnswer>} */
async function ask(kind, { why = '', labels = {}, laterDays = ASK_LATER_DAYS, storage = local(), now = Date.now, env = pageEnv() }) {
  const words = { ...LABELS, ...labels };
  const what = words[KINDS[kind].word];
  const read = () => { try { return laterTimes(storage?.getItem(ASK_LATER_KEY) ?? null); } catch { return {}; } };
  /** @param {number | null} until  null: forget it */
  const keep = until => {
    try {
      const all = read();
      if (until === null) delete all[kind]; else all[kind] = until;
      storage?.setItem(ASK_LATER_KEY, JSON.stringify(all));
    } catch { /* full or blocked: it asks again next time */ }
  };
  const state = await permissionState(kind, env);
  const step = askStep(state, read()[kind] ?? 0, now());
  if (step === 'granted' || step === 'unsupported' || step === 'later') return step;
  const badge = el('div', { class: 'ui-ask-icon' }, icon(KINDS[kind].icon));
  if (step === 'denied') {
    const ok = el('button', { type: 'button', class: 'ui-primary primary', 'data-close': '' }, words.ok);
    const { closed } = popSheet({ title: words.askOffTitle, className: 'ui-ask-sheet', body: [badge, el('p', {}, fill(words.askOff, { what })), el('div', { class: 'ui-ask-row' }, ok)] });
    ok.focus();
    await closed;
    return 'denied';
  }
  const allow = el('button', { type: 'button', class: 'ui-primary primary ui-ask-allow' }, words.askAllow);
  const later = el('button', { type: 'button', class: 'ui-ask-later' }, words.askNotNow);
  const body = [badge, ...(why ? [el('p', { class: 'ui-ask-why' }, why)] : []), el('div', { class: 'ui-ask-row' }, later, allow)];
  const sheet = popSheet({ title: fill(words.askTitle, { what }), className: 'ui-ask-sheet', body });
  /** @type {Promise<AskAnswer> | null} */
  let answer = null;
  allow.addEventListener('click', () => {
    answer ??= requestPermission(kind, env);   // at once, inside the tap
    sheet.close();
  });
  later.addEventListener('click', () => {
    if (!answer) { keep(now() + laterDays * 86_400_000); answer = Promise.resolve('later'); }
    sheet.close();
  });
  allow.focus();
  await sheet.closed;
  const said = await (answer ?? Promise.resolve(/** @type {AskAnswer} */ ('later')));
  if (said === 'granted') keep(null);
  return said;
}
