// The vault shell's menu sheet: rows in grouped rounded cards on a grey sheet that rises from the bottom, for an
// item's menu, an app menu or a picker. A row has an icon, a label, and may carry a tick (an on-state), a radio (one of
// a choice), a chevron (opens another list), a hint, a second line, a button of its own at the end, or be red (a
// delete). An optional Close row sits in its own card at the start or the end.
// Back (given `steps`, the page's createTransients), Esc, a tap on the shade, the Close row or a drag of the top down
// closes it. A tapped row closes the sheet first, its history step with it, and then runs, so a page or sheet the row
// opens lands on the page as it was. The step it takes is an ordinary transient, so the page's own entry under it keeps
// tabBack's close guard: closing a sheet never says "Press Back again to close".
// Moves only by transform and opacity, on the kit's spring (glide) and drag; with less motion it just shows and goes.
// Styles: ui/vault/vault.css. Nothing runs on import.
import { drag, glide } from '../motion.js';
import { still } from '../gesture.js';
import { check, chevronRight, circle, circleDot, x } from '../../icons/lucide.js';
import { vaultIcon } from './icons.js';

/**
 * @typedef {import('../../icons/lucide.js').IconNodes} IconNodes
 * @typedef {{ id?: string, icon?: IconNodes, label: string, run?: () => unknown, ticked?: boolean, radio?: boolean,
 *   danger?: boolean, next?: boolean, hint?: string, sub?: string, disabled?: boolean,
 *   aside?: { id?: string, icon: IconNodes, label: string, run: () => unknown } }} MenuRow
 *   ticked: an on-state (a tick at the end, aria-pressed); radio: one of a choice (a radio at the end, filled on the one
 *   chosen); next: opens another list (a chevron); danger: red (a delete); hint: a few faint words at the end; sub: a
 *   second, smaller line; disabled: shown, not tappable (the hint says why); aside: a button of its own at the end (a
 *   tab's close) that keeps the sheet open and draws it again
 * @typedef {{ title?: string, rows: MenuRow[] }} MenuCard
 *   title: what the card is for (read by screen readers, not shown)
 * @typedef {{ open: () => void, close: (v?: number) => Promise<void>, refill: () => void, isOpen: () => boolean,
 *   el: HTMLDialogElement, destroy: () => void }} MenuSheet
 */

/** @type {HTMLElement | null} */
let shade = null;
/** the one shade behind every menu sheet (below the top layer: the sheet's own transparent backdrop takes the taps) */
const shadeEl = () => {
  if (!shade || !shade.isConnected) {
    shade = Object.assign(document.createElement('div'), { className: 'ui-vault-shade' });
    shade.setAttribute('aria-hidden', 'true');
    document.body.append(shade);
  }
  return shade;
};

/**
 * @param {{ id: string, label: string | (() => string), cards: MenuCard[] | (() => MenuCard[]), heading?: string | (() => string),
 *   steps?: { open: (dismiss: () => void) => { readonly active: boolean, close: () => Promise<void> } },
 *   close?: boolean | { label?: string, at?: 'start' | 'end' } }} o
 *   id: the dialog's id (row ids are the app's); label: what the sheet is for (its accessible name); cards: what it
 *   shows, read each time it opens; heading: a title over the cards; steps: the page's createTransients(), so Back
 *   closes it (without it, Back leaves it be); close: a Close row in a card of its own (true: "Close" at the end;
 *   or { label, at: 'start' | 'end' }; default none)
 * @returns {MenuSheet}
 */
export function menuSheet(o) {
  const named = () => (typeof o.label === 'function' ? o.label() : o.label);
  const cardsNow = () => (typeof o.cards === 'function' ? o.cards() : o.cards);
  const headingNow = () => (typeof o.heading === 'function' ? o.heading() : o.heading || '');
  const closeRow = o.close ? { label: (o.close !== true && o.close.label) || 'Close', at: (o.close !== true && o.close.at) || 'end' } : null;

  const d = document.createElement('dialog');
  d.id = o.id;
  d.className = 'ui-vault-sheet';
  d.setAttribute('aria-label', named());
  const grab = Object.assign(document.createElement('div'), { className: 'ui-vault-grab' });
  grab.setAttribute('aria-hidden', 'true');
  const body = Object.assign(document.createElement('div'), { className: 'ui-vault-sheet-body' });
  d.append(grab, body);
  document.body.append(d);

  const height = () => d.getBoundingClientRect().height || innerHeight / 2;
  /** @type {ReturnType<typeof glide> | null} */
  let run = null;
  let y = 0;
  /** @param {number} at  px down from open */
  const put = at => {
    y = at;
    d.style.transform = `translateY(${Math.max(0, at)}px)`;
    shadeEl().style.opacity = String(Math.max(0, 1 - at / height()));
  };
  /** glide to `to` (px down from open) at speed v @param {number} to @param {number} [v] */
  const move = async (to, v = 0) => {
    const from = run ? run.stop() : y;
    run = null;
    if (still()) { put(to); return; }
    const h = height();
    const g = glide([[d, at => ({ transform: `translateY(${Math.max(0, at)}px)` })], [shadeEl(), at => ({ opacity: String(Math.max(0, 1 - at / h)) })]], from, to, v);
    run = g;
    await g.done;
    if (run === g) { run = null; put(to); g.stop(); }
  };

  /** @type {{ readonly active: boolean, close: () => Promise<void> } | null} */
  let step = null;
  /** @type {Promise<void> | null} */
  let shut = null;
  /** slide out and close (the history step already gone or on its way) @param {number} [v] */
  const hide = (v = 0) => (shut ||= (async () => {
    await move(height(), v);
    d.close();
    shadeEl().classList.remove('is-on');
    shut = null;
  })());

  /** @param {MenuRow} r */
  const rowEl = r => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'ui-vault-row' });
    if (r.id) b.id = r.id;
    if (r.danger) b.classList.add('is-danger');
    if (r.icon) b.append(vaultIcon(r.icon));
    const name = Object.assign(document.createElement('span'), { className: 'ui-vault-row-label', textContent: r.label });
    if (r.sub !== undefined) {
      const two = Object.assign(document.createElement('span'), { className: 'ui-vault-row-two' });
      two.append(name, Object.assign(document.createElement('span'), { className: 'ui-vault-row-sub', textContent: r.sub }));
      b.append(two);
    } else b.append(name);
    if (r.hint) {
      const h = Object.assign(document.createElement('span'), { className: 'ui-vault-row-hint', textContent: r.hint });
      b.append(h);
    }
    if (r.ticked !== undefined) {
      b.setAttribute('aria-pressed', String(r.ticked));
      if (r.ticked) b.append(vaultIcon(check, 'ui-vault-tick'));
    }
    if (r.radio !== undefined) {
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(r.radio));
      b.append(vaultIcon(r.radio ? circleDot : circle, `ui-vault-radio${r.radio ? ' is-on' : ''}`));
    }
    if (r.disabled) b.disabled = true;
    if (r.next) b.append(vaultIcon(chevronRight, 'ui-vault-next'));
    b.addEventListener('click', async () => { await close(); r.run?.(); });
    if (!r.aside) return b;
    const a = r.aside;
    const side = Object.assign(document.createElement('button'), { type: 'button', className: 'ui-vault-row-aside' });
    if (a.id) side.id = a.id;
    side.setAttribute('aria-label', a.label);
    side.append(vaultIcon(a.icon));
    side.addEventListener('click', async () => { await a.run(); if (d.open && !shut) refill(); });
    const wrap = Object.assign(document.createElement('div'), { className: 'ui-vault-row-wrap' });
    wrap.append(b, side);
    return wrap;
  };
  /** @param {MenuCard} c */
  const cardEl = c => {
    const card = Object.assign(document.createElement('div'), { className: 'ui-vault-card' });
    card.setAttribute('role', c.rows.some(r => r.radio !== undefined) ? 'radiogroup' : 'group');
    if (c.title) card.setAttribute('aria-label', c.title);
    card.append(...c.rows.map(rowEl));
    return card;
  };
  const title = Object.assign(document.createElement('h2'), { className: 'ui-vault-sheet-title', id: `${o.id}-title` });
  const fill = () => {
    const shown = cardsNow().filter(c => c.rows.length);
    if (closeRow) {
      const row = { id: `${o.id}-close`, icon: x, label: closeRow.label };
      if (closeRow.at === 'start') shown.unshift({ rows: [row] }); else shown.push({ rows: [row] });
    }
    const words = headingNow();
    title.textContent = words;
    body.replaceChildren(...(words ? [title] : []), ...shown.map(cardEl));
  };

  /** drawn again while open (its cards read again; focus kept near where it was) */
  const refill = () => {
    d.setAttribute('aria-label', named());
    const at = [...body.querySelectorAll('button')].indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    fill();
    const all = [...body.querySelectorAll('button')];
    all[Math.min(Math.max(at, 0), all.length - 1)]?.focus({ preventScroll: true });
  };
  const open = () => {
    if (d.open && !shut) return;
    d.setAttribute('aria-label', named());
    fill();
    shadeEl().classList.add('is-on');
    if (!d.open) d.showModal();
    put(height());
    step = o.steps ? o.steps.open(() => { step = null; void hide(); }) : null;
    void move(0);
    /** @type {HTMLElement | null} */ (body.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
  };
  /** closed (its Back step taken back too) -> once it is gone @param {number} [v] */
  const close = async (v = 0) => {
    const s = step;
    step = null;
    await Promise.all([s?.close(), hide(v)]);
  };
  d.addEventListener('cancel', e => { e.preventDefault(); void close(); });
  // a tap on the shade: the dialog's backdrop, outside its box
  d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right) void close();
  });
  // the top of the sheet dragged down: past a third (or flicked) it closes, else it settles back
  const stopDrag = drag(grab, {
    axis: 'y', mouse: true, name: 'sheet',
    start: () => { const at = run ? run.stop() : y; run = null; put(at); return at; },
    move: at => put(at),
    end: (at, v) => { if (at > height() / 3 || v > 0.5) void close(v); else void move(0, v); },
    bounds: () => [0, height()],
  });
  const destroy = () => { stopDrag(); if (d.open) d.close(); d.remove(); };
  return { open, close, refill, isOpen: () => d.open && !shut, el: d, destroy };
}
