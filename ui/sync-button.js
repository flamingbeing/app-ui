// The sync button (#sync-btn, one per page): the sync module's state as a cloud icon in a header bar, and a tap that
// syncs now. One colour (the bar's), the state in the icon's shape: a tick (synced), an arrow up that lifts (sending, at
// least MIN_SPIN_MS after a tap, with a count of what waits), struck (offline), an exclamation mark (not saved yet;
// needs you adds a dot), faded (connecting). The state's word is its label. The sync chip's tappable twin: an app shows one.
import { LABELS } from './labels.js';
import { el } from './dom.js';
import { icon, cloud, cloudCheck, cloudUpload, cloudOff, cloudAlert } from '../icons/lucide.js';

export const MIN_SPIN_MS = 700;   // a tap that finishes at once still shows it sending

// the icon each shown state draws
const ICONS = { synced: cloudCheck, syncing: cloudUpload, offline: cloudOff, attention: cloudAlert, 'at-risk': cloudAlert, unknown: cloud };

/**
 * What the button shows for a sync state (pure, for the tests)
 * @param {string} state  the sync module's state (synced, pending, offline, attention, at-risk, unknown)
 * @param {number} count  what waits (0: nothing)
 * @param {boolean} spinning  a tap's minimum spin is still running
 * @param {Record<string, string>} words  LABELS with the app's words over them
 * @returns {{ shown: string, label: string }}
 */
export function syncLook(state, count, spinning, words) {
  const shown = state === 'pending' || (spinning && state !== 'offline') ? 'syncing' : state;
  const word = (spinning && state !== 'offline' ? words.pending : words[state] || state) + (count ? ` (${count})` : '');
  return { shown, label: state === 'unknown' ? word : `${word}${/[.…!?]$/.test(word) ? '' : '.'} ${words.syncNow}` };
}

/**
 * @param {HTMLElement} host  a <button> becomes the sync button (the app's markup places it before the script runs);
 *   any other element gets one added
 * @param {{ sync: import('./types').SyncApi, syncNow?: () => unknown, labels?: Record<string, string>, idPrefix?: string }} o
 *   syncNow: what a tap does (default: the sync module's nudge('wake') then flush()); labels: words over LABELS;
 *   idPrefix: put before the button's id
 * @returns {() => void} stop: unsubscribes, and removes the button if this part added it
 */
export function syncButton(host, { sync, syncNow, labels = {}, idPrefix = '' }) {
  const words = { ...LABELS, ...labels };
  const own = !(host instanceof HTMLButtonElement);
  const btn = own ? el('button', { type: 'button' }) : host;
  btn.id ||= `${idPrefix}sync-btn`;
  btn.classList.add('ui-icon-btn', 'ui-sync-btn');
  if (own) host.append(btn);
  const now = syncNow || (() => { sync.nudge?.('wake'); return sync.flush?.(); });
  const badge = el('span', { class: 'ui-sync-badge', 'aria-hidden': 'true' });
  let state = 'unknown', count = 0, spinUntil = 0, timer = 0, drawn = '';
  const draw = () => {
    const look = syncLook(state, count, performance.now() < spinUntil, words);
    btn.dataset.state = look.shown;
    btn.setAttribute('aria-label', look.label);
    btn.title = look.label;
    // (the count is the badge's CSS content, not text: text inside the button would have to appear in its label word for word)
    if (count && look.shown !== 'attention') badge.dataset.count = String(count); else delete badge.dataset.count;
    if (drawn !== look.shown) {   // (a new icon only on a change, so the lift keeps going)
      drawn = look.shown;
      btn.replaceChildren(icon(ICONS[/** @type {keyof typeof ICONS} */ (look.shown)] || cloud), badge);
    }
  };
  const off = sync.status$(st => { state = st.state; count = st.count || 0; draw(); });
  const tap = async () => {
    spinUntil = performance.now() + MIN_SPIN_MS;
    clearTimeout(timer); timer = window.setTimeout(draw, MIN_SPIN_MS + 20);
    draw();
    try { await now(); } catch { /* the state shows it */ }
  };
  btn.addEventListener('click', tap);
  draw();
  return () => { off(); clearTimeout(timer); btn.removeEventListener('click', tap); if (own) btn.remove(); };
}
