// The conflict "pick one" sheet: a button (#attention) while this phone holds saves that met an edit from another
// device, opening a sheet (#conflicts) with both versions of each side by side, when each changed (SGT) and who changed
// it (name, device). Keep mine / keep theirs for the whole record; with several clashing fields, one pick per field too.
import { el, button, plural } from './dom.js';

/** @param {unknown} v */
const asWords = v => v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');

/** @param {string} title @param {import('./types').Side} side @param {string} words */
function sideBox(title, side, words) {
  const meta = [side.when, [side.by, side.device].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  return el('div', {}, el('h3', {}, title), el('p', {}, `“${words}”`), el('p', { class: 'ui-small small' }, meta || 'time and author unknown'));
}

/** @param {import('./types').Side} side @param {(v: unknown) => string} format */
const sideWords = (side, format) => `“${format(side.value)}”${side.when ? ` (${side.when})` : ''}`;

/**
 * @param {import('./types').SyncApi} sync
 * @param {import('./types').Conflict} c
 * @param {Record<string, import('./types').Pick>} picks  kept by the caller, so a redraw keeps the choices made
 * @param {Record<string, import('./types').ConflictField>} fields
 */
function fieldPicks(sync, c, picks, fields) {
  const keep = button('Keep these choices', () => sync.resolve(c.key, picks));
  keep.disabled = c.fields.some(x => !picks[x.path]);
  const rows = c.fields.map(f => {
    /** @param {import('./types').Pick} which */
    const pick = which => () => { picks[f.path] = which; keep.disabled = c.fields.some(x => !picks[x.path]); };
    const { label = f.path, format = asWords } = fields[f.path] ?? {};
    return el('div', { class: 'ui-inline row' },
      el('p', { class: 'ui-small small' }, `${label}: yours ${sideWords(f.mine, format)} · theirs ${sideWords(f.theirs, format)}`),
      button('Mine', pick('mine')), button('Theirs', pick('theirs')));
  });
  return [el('div', {}, ...rows), keep];
}

/**
 * @param {HTMLElement} host  the button and the sheet are added here
 * @param {{ sync: import('./types').SyncApi, text?: (value: unknown) => string, idPrefix?: string,
 *   fields?: Record<string, import('./types').ConflictField> }} o
 *   idPrefix: put before each of the part's ids (two on one page, or ids the app already uses)
 *   text: one side's record in words (default: as JSON)
 *   fields: per field path, the words shown for it in the per-field picks (label, default the path) and its value in
 *   words (format, default as JSON), e.g. { 'shift.start': { label: 'Start time', format: v => hhmm(v) } }
 * @returns {() => void} stop: unsubscribes and removes both
 */
export function conflictSheet(host, { sync, text = asWords, idPrefix = '', fields = {} }) {
  const open = el('button', { id: `${idPrefix}attention`, type: 'button', class: 'ui-attention attention' });
  const list = el('ul', { id: `${idPrefix}conflict-list`, class: 'ui-conflict-list' });
  const sheet = el('dialog', { id: `${idPrefix}conflicts`, 'aria-labelledby': `${idPrefix}conflicts-title` },
    el('h2', { id: `${idPrefix}conflicts-title` }, 'Changed on another device'),
    el('p', { class: 'ui-small small' }, 'Choose which version to keep. Nothing is lost until you choose.'),
    list,
    el('form', { method: 'dialog' }, el('button', {}, 'Close')));
  host.append(open, sheet);

  /** @type {Map<string, Record<string, import('./types').Pick>>} per-field choices, kept across redraws */
  const chosen = new Map();
  /** @param {string} key */
  const picksOf = key => { let p = chosen.get(key); if (!p) chosen.set(key, p = {}); return p; };
  /** @param {import('./types').Conflict} c */
  const item = c => el('li', {},
    el('div', { class: 'ui-sides sides' },
      sideBox('Yours', c.mine, c.deleted.mine ? '(deleted)' : text(c.mine.value)),
      sideBox('Other device', c.theirs, c.deleted.theirs ? '(deleted)' : text(c.theirs.value))),
    el('div', { class: 'ui-inline row' }, button('Keep mine', () => sync.resolve(c.key, 'mine')), button('Keep theirs', () => sync.resolve(c.key, 'theirs'))),
    ...(c.fields.length > 1 ? fieldPicks(sync, c, picksOf(c.key), fields) : []));
  const held = () => sync.conflicts().map(c => sync.describe(c.key)).filter(d => d !== null);
  const drawList = () => {
    const now = held();
    for (const k of chosen.keys()) if (!now.some(c => c.key === k)) chosen.delete(k);
    list.replaceChildren(...now.map(item));
  };
  const draw = () => {
    const n = sync.conflicts().length;
    open.hidden = !n;
    open.textContent = `${plural(n, 'change')} met an edit from another device: choose`;
    if (!n && sheet.open) sheet.close();
    if (sheet.open) drawList();
  };
  open.addEventListener('click', () => { drawList(); sheet.showModal(); });
  const off = sync.queue.onChange(draw);
  draw();
  return () => { off(); open.remove(); sheet.remove(); };
}
