// The settings screen gallery: a made-up plant app's options in the settings screen. The values live in a stand-in for
// @core/settings (same api, same option rules from its schema and file code, kept in this tab's sessionStorage), so the
// page works signed out. window.kit is { settings, stop, retries } for the tests.
import { settingsScreen } from '../../ui/index.js';
import { themeSwitch } from '../../theme/index.js';
import { compile, valueOf, isCustom, readFile, writeFile } from '../../settings/index.js';
import { galleryPreview } from '../preview.js';

galleryPreview();

const HOURS = 'Pick an hour from 0 to 23';
const cfg = compile({
  options: {
    units: { scope: 'account', default: 'metric', clean: (/** @type {any} */ v) => (v === 'metric' || v === 'imperial' ? v : undefined) },
    sort: { scope: 'account', default: 'due', clean: (/** @type {any} */ v) => (['due', 'name', 'room'].includes(/** @type {string} */ (v)) ? v : undefined) },
    reminders: { scope: 'account', default: true },
    reminderHour: { scope: 'account', default: 8, clean: (/** @type {any} */ v) => (Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 23 ? v : undefined) },
    photos: { default: false },
  },
  profiles: {
    balcony: { label: 'Balcony garden', defaults: { sort: 'room', reminderHour: 7 } },
    office: { label: 'Office plants', defaults: { sort: 'name', reminders: false } },
  },
});

/** the stand-in: what @core/settings keeps, in this tab only @returns {import('../../settings/types').SettingsApi} */
function fakeSettings() {
  const KEPT = 'kit-settings';
  /** @type {{ saved: Record<string, unknown>, profile: string | null }} */
  let state = { saved: {}, profile: null };
  try { state = { ...state, ...JSON.parse(sessionStorage.getItem(KEPT) || '{}') }; } catch { /* a fresh start */ }
  /** @type {Set<(v: any, key: string) => void>} */
  const all = new Set();
  const savedOf = (/** @type {string} */ k) => state.saved[k];
  const get = (/** @type {string} */ k) => valueOf(cfg, k, savedOf(k), state.profile);
  /** @param {Record<string, unknown>} values  null clears @param {{ profile?: string | null }} [o] */
  function apply(values, o = {}) {
    const before = Object.fromEntries([...cfg.specs.keys()].map(k => [k, get(k)]));
    for (const [k, v] of Object.entries(values)) { if (v === null) delete state.saved[k]; else state.saved[k] = v; }
    if ('profile' in o) state.profile = o.profile ?? null;
    try { sessionStorage.setItem(KEPT, JSON.stringify(state)); } catch { /* kept for this page only */ }
    const changed = [...cfg.specs.keys()].filter(k => JSON.stringify(get(k)) !== JSON.stringify(before[k]));
    for (const k of changed) all.forEach(fn => fn(get(k), k));
    if (!changed.length && 'profile' in o) all.forEach(fn => fn(undefined, ''));
    return changed;
  }
  const spec = (/** @type {string} */ k) => { const s = cfg.specs.get(k); if (!s) throw new Error(`${k} is not an option`); return s; };
  return {
    get: k => (spec(k), get(k)),
    async set(k, v) {
      const s = spec(k);
      if (v === null || v === undefined) { apply({ [k]: null }); return; }
      const c = s.clean(v);
      if (c === undefined) throw new Error(k === 'reminderHour' ? HOURS : `${k} refuses that value`);
      apply({ [k]: c });
    },
    watch(k, fn) {
      if (k !== null) spec(k);
      /** @param {any} v @param {string} key */
      const f = (v, key) => { if (k === null || key === k) fn(v, key); };
      all.add(f);
      return () => { all.delete(f); };
    },
    activeProfile: () => state.profile,
    async profile(id) {
      if (id !== null && !cfg.profiles.has(id)) throw new Error(`${JSON.stringify(id)} is not a profile`);
      apply(Object.fromEntries([...cfg.governed].map(k => [k, null])), { profile: id });
    },
    isCustom: () => isCustom(cfg, state.profile, savedOf),
    profiles: () => [...cfg.profiles.values()].map(({ id, label }) => ({ id, label })),
    exportFile: () => JSON.stringify(writeFile(cfg, state.saved, state.profile), null, 2),
    async importFile(text) {
      const f = readFile(cfg, text);
      const changed = apply(f.settings, f.profile ? { profile: f.profile } : {});
      return { changed, dropped: f.dropped };
    },
    follow: () => () => {},
  };
}

const settings = fakeSettings();
// a stand-in update api: the first check finds nothing, the next one updates (window.kit.retries counts the retries)
let checks = 0;
const update = { versionLabel: async () => '1.2.3', checkNow: async () => ++checks % 2 === 0, retryUpdate: () => { kit.retries++; } };
const kit = { settings, stop: () => {}, retries: 0 };
const stop = settingsScreen(/** @type {HTMLElement} */ (document.getElementById('screen')), {
  settings,
  file: 'plants-settings.json',
  sections: [
    { title: 'Plants', rows: [
      { key: 'sort', label: 'Sort the list by', choices: [['due', 'Next watering'], ['name', 'Name'], ['room', 'Room']] },
      { key: 'units', label: 'Units', sub: 'For pot sizes and water', choices: [['metric', 'Litres and cm'], ['imperial', 'Cups and inches']] },
    ] },
    { title: 'Reminders', reset: true, rows: [
      { key: 'reminders', label: 'Watering reminders', more: 'Reminders arrive once a day, at the hour below, and only for plants that are due.' },
      { key: 'reminderHour', label: 'Remind at', sub: 'Hour of the day, 0 to 23', min: 0, max: 23, step: 1 },
    ] },
    { title: 'This device', rows: [
      { key: 'photos', label: 'Keep photos on this phone', sub: 'Only here, not on your other devices' },
    ], mount: host => themeSwitch(host) },
  ],
  about: { name: 'Plants', update, licences: {} },
});
kit.stop = stop;
Object.assign(window, { kit });
