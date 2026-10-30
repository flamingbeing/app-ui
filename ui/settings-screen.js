// The settings screen: @core/settings' options as grouped rows (a switch, a choice or a number each), the profile
// picker and the settings file (export, import), in a host the page gives it. It reads only the settings api it is
// handed and follows it: a change on another device or by a profile shows at once. The app names the rows and their
// words; a section can also hold the app's own part (mount), such as @core/theme's themeSwitch for "This device".
// With about (the app's name and its update api), an About group comes last: the Version row, Check for updates and
// the About sheet; it also retries an owed reload once a field is left or a sheet closes (as updatePrompt does).
// With menu (from the logbook's Settings), the screen opens on a menu instead: a search box over every row, then one
// row per section (its icon, title and one line, ›) under the sections' group headings; a row opens that section as a
// page of its own with a Back button. Given steps (createTransients), each page is a history entry, so Back closes it.
// Styles: ui/gestures.css (lists), "settings screen".
import { el, button, plural } from './dom.js';
import { LABELS } from './labels.js';
import { aboutSheet } from './about-sheet.js';
import { gate } from './section-gate.js';
import { icon, info as infoIcon, chevronLeft, chevronRight } from '../icons/lucide.js';

/**
 * @typedef {import('../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ key: string, label: string, sub?: string, more?: string, choices?: [unknown, string][], min?: number,
 *   max?: number, step?: number }} SettingRow  sub: one line of help; more: the rest, behind an info button; choices:
 *   [value, word] pairs (a picker); a boolean default is a switch; a number one a number field (min, max, step)
 * @typedef {{ title: string, rows?: SettingRow[], reset?: boolean, mount?: (host: HTMLElement) => (() => void) | void,
 *   icon?: IconNodes, sub?: string, group?: string, find?: string, visible?: (() => boolean) | string }} SettingSection
 *   reset: adds "Reset this page", which puts this section's rows back to their defaults and offers Undo; with menu:
 *   icon, sub (its one line) and group (the menu heading it sits under), find: more words the search finds it by;
 *   visible: a function or an option key (read with settings.get): shown only while true, live (a key is watched, a
 *   function re-runs on any change); a hidden page leaves the menu and the search, and closes if open (default: shown)
 * @typedef {{ steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } },
 *   top?: (host: HTMLElement) => (() => void) | void, search?: boolean }} SettingsMenu
 *   steps: createTransients' api (Back closes a page); top: the app's own part above the menu (such as the tabs off
 *   the bar); search: the search box (default on)
 */

/** @type {Readonly<Record<string, string>>} */
export const SETTINGS_WORDS = Object.freeze({
  profile: 'Profile',
  profileRow: 'Start from',
  none: 'None',
  custom: 'Changed by hand from the profile',
  file: 'Settings file',
  fileRow: 'Save to a file or load one',
  fileSub: 'Your account settings, to keep or to move to another account',
  exportButton: 'Export',
  importButton: 'Import',
  imported: 'Imported',
  nothing: 'Nothing to change',
  left: 'left out',
  moreInfo: 'More about this setting',
  resetPage: 'Reset this page',
  resetDone: 'Back to the defaults',
  undo: 'Undo',
  about: 'About',
  version: 'Version',
  dev: 'dev',
  checkUpdates: 'Check for updates',
  aboutRow: 'About this app',
  aboutSub: 'The outside code it uses and their licences',
  open: 'Open',
  settings: 'Settings',
  search: 'Search settings',
  noMatch: 'No setting matches',
  appGroup: 'This app',
  profileSub: 'A starting set of settings',
  aboutSub2: 'Version, updates and licences',
});

/**
 * @param {HTMLElement} host  the screen is added here
 * @param {{ settings: import('../settings/types').SettingsApi, sections: SettingSection[], file?: string | false,
 *   labels?: Record<string, string>, about?: { name: string, update: import('./types').UpdateApi | null,
 *   licences?: Record<string, string>, importMap?: { imports?: Record<string, string> } | null },
 *   menu?: SettingsMenu | boolean }} o  file: the exported file's name (false: no file rows); labels: words over
 *   SETTINGS_WORDS (and LABELS); about: the About group (update null: the version reads "dev", no check); menu: open
 *   on the menu (true: with no steps)
 * @returns {() => void} stop: unwatches and removes the screen
 */
export function settingsScreen(host, { settings, sections, file = 'settings.json', labels = {}, about, menu }) {
  const words = { ...LABELS, ...SETTINGS_WORDS, ...labels };
  const box = el('div', { class: 'ui-settings' });
  const status = el('p', { class: 'ui-settings-status ui-small small', role: 'status', 'aria-live': 'polite' });
  /** @type {Map<string, (v: unknown) => void>} */
  const shows = new Map();
  /** @type {(() => void)[]} */
  const stops = [];
  let n = 0;
  const id = () => `ui-set-${++n}`;
  const say = (/** @type {string} */ text, bad = false) => { status.replaceChildren(text); status.classList.toggle('ui-error', bad); status.classList.toggle('error', bad); };

  /** @type {{ section: HTMLElement, meta: Partial<SettingSection> & { title: string }, shown: boolean }[]} */
  const pages = [];
  /** called when a page's `visible` flips (the menu sets it) @type {(p: typeof pages[number]) => void} */
  let gated = p => { p.section.hidden = !p.shown; };
  /** @param {string} title @param {HTMLElement} body @param {Partial<SettingSection>} [meta] */
  function group(title, body, meta = {}) {
    const h = el('h2', { class: 'ui-settings-title', id: id() }, title);
    const s = el('section', { class: 'ui-settings-group', 'aria-labelledby': h.id }, h, body);
    box.append(s);
    pages.push({ section: s, meta: { ...meta, title }, shown: true });
    return s;
  }
  /** @param {string} label @param {string | undefined} sub @param {HTMLElement} control @param {string} [more] */
  function row(label, sub, control, more) {
    control.id ||= id();
    const main = el('label', { class: 'ui-row-main', for: control.id }, label);
    if (sub) main.append(el('span', { class: 'ui-row-sub' }, sub));
    const li = el('li', { class: 'ui-row ui-setting' }, main, control);
    if (more) {
      const detail = el('p', { class: 'ui-row-more ui-small small', id: id(), hidden: '' }, more);
      const info = el('button', { type: 'button', class: 'ui-info', 'aria-label': `${words.moreInfo}: ${label}`, 'aria-expanded': 'false', 'aria-controls': detail.id }, icon(infoIcon));
      info.addEventListener('click', () => {
        detail.hidden = !detail.hidden;
        info.setAttribute('aria-expanded', String(!detail.hidden));
      });
      li.insertBefore(info, control);
      li.append(detail);
    }
    return li;
  }
  /** a save; refused (a value its clean refuses, an account option while signed out): the control shows the value in force again
   * @param {string} key @param {unknown} value */
  async function save(key, value) {
    try { await settings.set(key, value); say(''); }
    catch (e) { say(e instanceof Error ? e.message : String(e), true); shows.get(key)?.(settings.get(key)); }
  }

  /** @param {SettingRow} r */
  function control(r) {
    const now = settings.get(r.key);
    if (r.choices) {
      const pick = el('select', {});
      r.choices.forEach(([v, word], i) => pick.add(new Option(word, String(i))));
      const show = (/** @type {unknown} */ v) => { pick.value = String(r.choices?.findIndex(([c]) => Object.is(c, v)) ?? -1); };
      pick.addEventListener('change', () => { const c = r.choices?.[Number(pick.value)]; if (c) void save(r.key, c[0]); });
      return { node: pick, show, now };
    }
    if (typeof now === 'number') {
      const field = el('input', { type: 'number', inputmode: 'decimal', class: 'ui-setting-number' });
      for (const k of /** @type {const} */ (['min', 'max', 'step'])) if (r[k] !== undefined) field.setAttribute(k, String(r[k]));
      const show = (/** @type {unknown} */ v) => { field.value = v === undefined || v === null ? '' : String(v); };
      field.addEventListener('change', () => { void save(r.key, field.value === '' ? null : Number(field.value)); });
      return { node: field, show, now };
    }
    const sw = el('input', { type: 'checkbox', role: 'switch', class: 'ui-switch' });
    const show = (/** @type {unknown} */ v) => { sw.checked = v === true; };
    sw.addEventListener('change', () => { void save(r.key, sw.checked); });
    return { node: sw, show, now };
  }

  /** "Reset this page": forgets the saved values of these options (back to the profile's or the default), then offers
   * Undo, which saves the values they had. No "Are you sure?" (the kit's rule).
   * @param {string[]} keys */
  function resetRow(keys) {
    const link = button(words.resetPage, async () => {
      const before = keys.map(k => /** @type {const} */ ([k, settings.get(k)]));
      const results = await Promise.allSettled(keys.map(k => settings.set(k, null)));
      const failed = results.find(r => r.status === 'rejected');
      const undo = button(words.undo, async () => {
        const back = await Promise.allSettled(before.map(([k, v]) => settings.set(k, v)));
        const bad = back.find(r => r.status === 'rejected');
        if (bad) say(bad.reason instanceof Error ? bad.reason.message : String(bad.reason), true); else say('');
      }, { class: 'ui-undo' });
      // the offer goes with the next change to any option (a stale Undo would overwrite it)
      const gone = settings.watch(null, () => { gone(); if (status.contains(undo)) say(''); });
      if (failed) say(failed.reason instanceof Error ? failed.reason.message : String(failed.reason), true);
      else { status.classList.remove('ui-error', 'error'); status.replaceChildren(words.resetDone); }
      status.append(' ', undo);
    }, { class: 'ui-reset ui-small small' });
    return el('p', { class: 'ui-settings-part' }, link);
  }

  // the profile picker, when the app has profiles
  const profiles = settings.profiles();
  /** @type {(() => void) | null} */
  let showProfile = null;
  if (profiles.length) {
    const pick = el('select', {});
    pick.add(new Option(words.none, ''));
    for (const p of profiles) pick.add(new Option(p.label, p.id));
    const r = row(words.profileRow, undefined, pick);
    const note = el('span', { class: 'ui-row-sub' }, words.custom);
    r.querySelector('label')?.append(note);
    showProfile = () => { pick.value = settings.activeProfile() || ''; note.hidden = !settings.isCustom(); };
    pick.addEventListener('change', async () => {
      try { await settings.profile(pick.value || null); say(''); }
      catch (e) { say(e instanceof Error ? e.message : String(e), true); }
      showProfile?.();
    });
    group(words.profile, el('ul', { class: 'ui-list' }, r), { sub: words.profileSub });
  }

  for (const s of sections) {
    const list = el('ul', { class: 'ui-list' });
    for (const r of s.rows || []) {
      const c = control(r);
      c.show(c.now);
      shows.set(r.key, c.show);
      list.append(row(r.label, r.sub, c.node, r.more));
    }
    const g = group(s.title, list, s);
    if (s.visible !== undefined) {
      const p = /** @type {typeof pages[number]} */ (pages[pages.length - 1]);
      const gt = gate(settings, s.visible, v => { p.shown = v; gated(p); });
      stops.push(gt.stop);
      p.shown = gt.now();
      g.hidden = !p.shown;
    }
    if (!s.rows?.length) list.remove();
    if (s.reset && s.rows?.length) g.append(resetRow(s.rows.map(r => r.key)));
    if (s.mount) {
      const part = el('div', { class: 'ui-settings-part' });
      g.append(part);
      const stop = s.mount(part);
      if (typeof stop === 'function') stops.push(stop);
    }
  }

  // the settings file: export downloads it; import reads one and says what changed
  if (file !== false) {
    const picker = el('input', { type: 'file', accept: '.json,application/json', hidden: '' });
    const exp = button(words.exportButton, () => {
      const url = URL.createObjectURL(new Blob([settings.exportFile()], { type: 'application/json' }));
      const a = el('a', { href: url, download: file });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const imp = button(words.importButton, () => picker.click());
    picker.addEventListener('change', async () => {
      const f = picker.files?.[0];
      picker.value = '';
      if (!f) return;
      try {
        const { changed, dropped } = await settings.importFile(await f.text());
        say(changed.length || dropped.length
          ? `${words.imported}: ${plural(changed.length, 'change')}${dropped.length ? `, ${dropped.length} ${words.left}` : ''}`
          : words.nothing);
      } catch (e) { say(e instanceof Error ? e.message : String(e), true); }
    });
    const main = el('span', { class: 'ui-row-main' }, words.fileRow, el('span', { class: 'ui-row-sub' }, words.fileSub));
    group(words.file, el('ul', { class: 'ui-list' }, el('li', { class: 'ui-row ui-setting' }, main, el('span', { class: 'ui-setting-buttons' }, exp, imp, picker))), { sub: words.fileSub, group: words.appGroup });
  }

  // About: the version, Check for updates (its answer under it) and the About sheet
  if (about) {
    const { update } = about;
    const version = el('span', { class: 'ui-setting-value', id: id() }, update ? '…' : words.dev);
    const vrow = el('li', { class: 'ui-row ui-setting ui-version' }, el('span', { class: 'ui-row-main' }, words.version), version);
    const list = el('ul', { class: 'ui-list' }, vrow);
    if (update) {
      update.versionLabel().then(v => { version.textContent = v || words.notInstalled; }, () => { version.textContent = words.notInstalled; });
      const answer = el('span', { class: 'ui-row-sub', role: 'status' });
      const check = button(words.checkUpdates, async () => {
        answer.textContent = words.checking;
        try { answer.textContent = await update.checkNow() ? words.updated : words.newest; }
        catch { answer.textContent = words.checkFailed; }
      }, { class: 'ui-check-update' });
      list.append(el('li', { class: 'ui-row ui-setting' }, el('span', { class: 'ui-row-main' }, words.checkUpdates, answer), check));
      const retry = () => setTimeout(() => update.retryUpdate(), 0);
      document.addEventListener('focusout', retry);
      document.addEventListener('close', retry, true);   // a dialog closing ('close' doesn't bubble, so on the way down)
      stops.push(() => { document.removeEventListener('focusout', retry); document.removeEventListener('close', retry, true); });
    }
    const open = button(words.open, () => void aboutSheet({ name: about.name, update, licences: about.licences,
      importMap: about.importMap, labels }), { class: 'ui-about-open', 'aria-label': `${words.open} ${words.aboutRow.toLowerCase()}` });
    list.append(el('li', { class: 'ui-row ui-setting' },
      el('span', { class: 'ui-row-main' }, words.aboutRow, el('span', { class: 'ui-row-sub' }, words.aboutSub)), open));
    group(words.about, list, { sub: words.aboutSub2, group: words.appGroup });
  }

  box.append(status);
  if (menu) stops.push(pageMenu(menu === true ? {} : menu));
  showProfile?.();
  const off = settings.watch(null, (v, key) => { shows.get(key)?.(v); showProfile?.(); });
  host.append(box);
  return () => { off(); stops.forEach(s => s()); box.remove(); };

  /** The menu over the pages (each built above as a group); one shows at a time. @param {SettingsMenu} m */
  function pageMenu({ steps, top, search = true }) {
    const front = el('div', { class: 'ui-settings-menu' });
    /** @type {(() => void)[]} */
    const ends = [];
    if (top) {
      const part = el('div', { class: 'ui-settings-part ui-settings-top' });
      front.append(part);
      const stop = top(part);
      if (typeof stop === 'function') ends.push(stop);
    }
    const results = el('ul', { class: 'ui-list ui-settings-results', hidden: '' });
    const empty = el('p', { class: 'ui-settings-part ui-small small', hidden: '' }, words.noMatch);
    /** @type {HTMLInputElement | null} */
    let q = null;
    if (search) {
      const input = el('input', { type: 'search', class: 'ui-settings-search', placeholder: words.search, 'aria-label': words.search, autocomplete: 'off' });
      q = input;
      input.addEventListener('input', () => find(input.value));
      front.append(el('div', { class: 'ui-settings-part' }, input), results, empty);
    }
    const lists = el('div', { class: 'ui-settings-menu-groups' });
    front.append(lists);
    /** @type {Map<string, HTMLUListElement>} */
    const heads = new Map();
    /** @type {Map<HTMLElement, HTMLElement>} each page's menu button */
    const gos = new Map();
    for (const p of pages) {
      const name = p.meta.group || '';
      let list = heads.get(name);
      if (!list) {
        list = el('ul', { class: 'ui-list' });
        heads.set(name, list);
        if (name) { const h = el('h2', { class: 'ui-settings-title', id: id() }, name); list.setAttribute('aria-labelledby', h.id); lists.append(h); }
        lists.append(list);
      }
      const main = el('span', { class: 'ui-row-main' }, p.meta.title);
      if (p.meta.sub) main.append(el('span', { class: 'ui-row-sub' }, p.meta.sub));
      const go = el('button', { type: 'button', class: 'ui-row ui-settings-go' }, ...(p.meta.icon ? [icon(p.meta.icon, { class: 'ui-settings-icon' })] : []), main, icon(chevronRight, { class: 'ui-chev' }));
      go.addEventListener('click', () => open(p));
      gos.set(p.section, go);
      list.append(el('li', {}, go));
      // each page gets a Back to the menu, above its title
      const back = el('button', { type: 'button', class: 'ui-settings-back' }, icon(chevronLeft), words.settings);
      back.addEventListener('click', () => { if (step?.active) void step.close(); else shut(); });
      p.section.prepend(back);
      p.section.hidden = true;
      if (!p.shown) go.parentElement?.setAttribute('hidden', '');
    }
    gated = p => {
      const li = gos.get(p.section)?.parentElement;
      if (li) li.hidden = !p.shown;
      if (!p.shown && shown === p.section) { if (step?.active) void step.close(); else shut(); }
      if (!p.shown) p.section.hidden = true;
      if (q && q.value.trim()) find(q.value);
    };
    box.prepend(front);
    /** @type {{ readonly active: boolean, close: () => Promise<void> } | null} */
    let step = null;
    /** @type {HTMLElement | null} */
    let shown = null;
    /** @param {typeof pages[number]} p @param {Element | null} [row]  a search result's row: scrolled to */
    function open(p, row = null) {
      if (shown) { shown.hidden = true; } else step = steps ? steps.open(() => { step = null; shut(); }) : null;
      front.hidden = true;
      p.section.hidden = false;
      shown = p.section;
      (row || p.section).scrollIntoView?.({ block: row ? 'center' : 'nearest' });
      if (row) { row.classList.add('ui-found'); setTimeout(() => row.classList.remove('ui-found'), 1600); }
      /** @type {HTMLElement | null} */ (p.section.querySelector('.ui-settings-back'))?.focus({ preventScroll: true });
    }
    function shut() {
      const was = shown;
      if (shown) shown.hidden = true;
      shown = null;
      front.hidden = false;
      if (was) gos.get(was)?.focus({ preventScroll: true });
    }
    /** the rows whose words hold the query, as buttons to their page @param {string} text */
    function find(text) {
      const t = text.trim().toLowerCase();
      lists.hidden = !!t;
      results.hidden = !t;
      results.replaceChildren();
      if (!t) { empty.hidden = true; return; }
      for (const p of pages) {
        if (!p.shown) continue;
        const hits = /** @type {HTMLElement[]} */ ([...p.section.querySelectorAll('.ui-row')]).filter(r => r.textContent?.toLowerCase().includes(t));
        const pageHit = `${p.meta.title} ${p.meta.sub || ''} ${p.meta.find || ''}`.toLowerCase().includes(t);
        for (const r of hits.length ? hits : pageHit ? [null] : []) {
          const label = r ? (r.querySelector('.ui-row-main')?.firstChild?.textContent || r.textContent || '').trim() : p.meta.title;
          const go = el('button', { type: 'button', class: 'ui-row ui-settings-go' }, el('span', { class: 'ui-row-main' }, label, el('span', { class: 'ui-row-sub' }, p.meta.title)), icon(chevronRight, { class: 'ui-chev' }));
          go.addEventListener('click', () => open(p, r));
          results.append(el('li', {}, go));
        }
      }
      empty.hidden = results.childElementCount > 0;
    }
    return () => { ends.forEach(e => e()); if (step?.active) void step.close(); };
  }
}
