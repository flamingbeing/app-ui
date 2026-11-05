// Ask first (ui/ask-first.js) and share this screen as a link (ui/share.js shareLink): the pure steps, what the
// browser says on a fake browser (every kind, the old callback style, refusals, a prompt shut without an answer), and
// the answers that need no sheet. The sheets themselves: e2e/share-ask.spec.mjs. node --test test/ask-first.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { askStep, laterTimes, permissionState, requestPermission, askFirst, ASK_KINDS, ASK_LATER_KEY, ASK_LATER_DAYS } from '../ui/ask-first.js';
import { shareLink } from '../ui/share.js';
import { LABELS } from '../ui/labels.js';

const T = 1_800_000_000_000;

test('askStep: the browser\'s answer wins; a kept Not now holds until its time', () => {
  for (const s of /** @type {const} */ (['granted', 'denied', 'unsupported'])) assert.equal(askStep(s, T + 1, T), s);
  assert.equal(askStep('prompt', 0, T), 'ask');
  assert.equal(askStep('prompt', T + 1, T), 'later');
  assert.equal(askStep('prompt', T, T), 'ask');
  assert.equal(ASK_LATER_DAYS, 7);
  assert.deepEqual([...ASK_KINDS], ['notifications', 'location', 'camera', 'microphone']);
});

test('laterTimes keeps known kinds with a finite time and drops the rest', () => {
  assert.deepEqual(laterTimes(JSON.stringify({ camera: T, location: 'soon', mic: T, microphone: Infinity, notifications: T + 1 })), { camera: T, notifications: T + 1 });
  for (const bad of [null, '', '{', 'null', '7', '[1]']) assert.deepEqual(laterTimes(bad), {});
});

/** a browser stand-in: the permissions API's states, and what each prompt answers */
function fakeEnv({ states = {}, notif = 'default', answer = {}, noQuery = false } = {}) {
  const asked = [];
  let stopped = 0;
  const env = {
    permissions: { query: async ({ name }) => { if (noQuery) throw new TypeError('not a permission name'); return { state: states[name] ?? 'prompt' }; } },
    Notification: { permission: notif, requestPermission: async () => { asked.push('notifications'); return answer.notifications ?? 'granted'; } },
    geolocation: { getCurrentPosition: (ok, fail) => { asked.push('location'); const a = answer.location ?? 'ok'; a === 'ok' ? ok({}) : fail({ code: a }); } },
    mediaDevices: { getUserMedia: async c => {
      asked.push(c.video ? 'camera' : 'microphone');
      const err = answer.media;
      if (err) throw Object.assign(new Error(err), { name: err });
      return { getTracks: () => [{ stop: () => { stopped++; } }, { stop: () => { stopped++; } }] };
    } },
  };
  return { env, asked, stopped: () => stopped };
}

test('permissionState reads Notification.permission and permissions.query; missing parts are unsupported', async () => {
  assert.equal(await permissionState('notifications', fakeEnv({ notif: 'granted' }).env), 'granted');
  assert.equal(await permissionState('notifications', fakeEnv({ notif: 'default' }).env), 'prompt');
  assert.equal(await permissionState('location', fakeEnv({ states: { geolocation: 'denied' } }).env), 'denied');
  assert.equal(await permissionState('camera', fakeEnv({ states: { camera: 'granted' } }).env), 'granted');
  assert.equal(await permissionState('microphone', fakeEnv({ noQuery: true }).env), 'prompt');
  assert.equal(await permissionState('camera', { ...fakeEnv().env, permissions: null }), 'prompt');
  assert.equal(await permissionState('notifications', { Notification: null }), 'unsupported');
  assert.equal(await permissionState('location', { geolocation: null }), 'unsupported');
  assert.equal(await permissionState('microphone', { mediaDevices: null }), 'unsupported');
});

test('requestPermission asks the browser itself and reads its answer', async () => {
  let f = fakeEnv();
  assert.equal(await requestPermission('notifications', f.env), 'granted');
  assert.equal(await requestPermission('location', f.env), 'granted');
  assert.equal(await requestPermission('camera', f.env), 'granted');
  assert.equal(await requestPermission('microphone', f.env), 'granted');
  assert.deepEqual(f.asked, ['notifications', 'location', 'camera', 'microphone']);
  assert.equal(f.stopped(), 4, 'the camera and microphone are let go at once');
  // refused, and the state says so
  f = fakeEnv({ answer: { notifications: 'denied', location: 1, media: 'NotAllowedError' }, notif: 'denied', states: { geolocation: 'denied', camera: 'denied' } });
  assert.equal(await requestPermission('notifications', f.env), 'denied');
  assert.equal(await requestPermission('location', f.env), 'denied');
  assert.equal(await requestPermission('camera', f.env), 'denied');
  // a prompt shut without an answer reads as a refusal in some browsers: still 'prompt', so 'later'
  f = fakeEnv({ answer: { location: 1, media: 'NotAllowedError' } });
  assert.equal(await requestPermission('location', f.env), 'later');
  assert.equal(await requestPermission('microphone', f.env), 'later');
  assert.equal(await requestPermission('notifications', fakeEnv({ answer: { notifications: 'default' } }).env), 'later');
  // a position not found in time was still allowed; a busy camera is allowed; no camera at all is unsupported
  assert.equal(await requestPermission('location', fakeEnv({ answer: { location: 3 } }).env), 'granted');
  assert.equal(await requestPermission('camera', fakeEnv({ answer: { media: 'NotReadableError' } }).env), 'granted');
  assert.equal(await requestPermission('camera', fakeEnv({ answer: { media: 'NotFoundError' } }).env), 'unsupported');
  assert.equal(await requestPermission('location', { geolocation: null }), 'unsupported');
});

test('requestPermission takes older Safari\'s callback style', async () => {
  const env = { Notification: { permission: 'default', requestPermission: cb => { setTimeout(() => cb('granted'), 1); } } };
  assert.equal(await requestPermission('notifications', env), 'granted');
});

test('askFirst answers without a sheet when the browser or a kept Not now already says', async () => {
  const store = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } };
  const now = () => T;
  assert.equal(await askFirst('camera', { env: fakeEnv({ states: { camera: 'granted' } }).env, storage, now }), 'granted');
  assert.equal(await askFirst('notifications', { env: { Notification: null }, storage, now }), 'unsupported');
  store.set(ASK_LATER_KEY, JSON.stringify({ location: T + 1000 }));
  const f = fakeEnv();
  assert.equal(await askFirst('location', { env: f.env, storage, now }), 'later');
  assert.deepEqual(f.asked, [], 'the browser is not asked while Not now holds');
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(await askFirst('microphone', { env: fakeEnv({ states: { microphone: 'granted' } }).env, storage: blocked, now }), 'granted');
  await assert.rejects(askFirst(/** @type {any} */ ('contacts')), TypeError);
});

test('askFirst: a second call for the same kind while one runs gets the same answer', async () => {
  const env = fakeEnv({ states: { camera: 'granted' } }).env;
  const a = askFirst('camera', { env }), b = askFirst('camera', { env });
  assert.equal(a, b);
  assert.equal(await a, 'granted');
  assert.notEqual(askFirst('camera', { env }), a);
});

test('shareLink: the share sheet with the link, else the link copied', async () => {
  const notes = [], toasts = { show: m => notes.push(m) };
  const nav = globalThis.navigator;
  const set = v => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true });
  try {
    let sent = null;
    set({ share: async d => { sent = d; } });
    assert.equal(await shareLink({ url: 'https://x.test/a', title: 'A', toasts }), 'shared');
    assert.deepEqual(sent, { title: 'A', url: 'https://x.test/a' });
    await shareLink({ url: 'https://x.test/a', title: 'A', text: 'Look', toasts });
    assert.deepEqual(sent, { title: 'A', text: 'Look', url: 'https://x.test/a' });
    set({ share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } });
    assert.equal(await shareLink({ url: 'https://x.test/a', toasts }), 'cancelled');
    assert.deepEqual(notes, []);
    let copied = '';
    const clipboard = { writeText: async t => { copied = t; } };
    set({ share: async () => {}, canShare: () => false, clipboard });   // a sheet that can't take it: copied
    assert.equal(await shareLink({ url: 'https://x.test/b', toasts }), 'copied');
    assert.equal(copied, 'https://x.test/b');
    assert.equal(notes.at(-1), LABELS.linkCopied);
    set({ clipboard });
    assert.equal(await shareLink({ url: 'https://x.test/c', toasts, labels: { linkCopied: 'Got it' } }), 'copied');
    assert.equal(notes.at(-1), 'Got it');
    set({ clipboard: { writeText: async () => { throw new Error('no'); } } });
    assert.equal(await shareLink({ url: 'https://x.test/d', toasts }), 'failed');
  } finally { set(nav); }
});
