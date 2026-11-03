// Toasts: a short note ("Saved") in a live region, gone by itself after a few seconds or when dismissed.
import { LABELS } from './labels.js';
import { el } from './dom.js';
import { still } from './gesture.js';
import { icon, x } from '../icons/lucide.js';

/**
 * @param {HTMLElement} host  the region is added here (once per page)
 * @param {{ ms?: number, labels?: Record<string, string>, bottom?: string, exit?: number }} [o]  exit: ms a toast fades out
 *   (ease-in) before it goes (default 0 = hard cut; 300 matches the Material snackbar); every toast fades in over 150 ms
 *   (--d-toast-in), none when Still or Reduce Motion is on; ms: how long a toast stays (default 4000);
 *   labels: words over LABELS; bottom: a CSS length the toasts sit above (an app's own tab bar, say
 *   'calc(56px + env(safe-area-inset-bottom))'), the same as setting --ui-toast-bottom (default: the page bottom, or
 *   over the kit tab bar)
 * @returns {{ show: (message: string, o?: { ms?: number, swap?: boolean, action?: { label: string, run: () => void } }) => () => void, stop: () => void }}
 *   swap: true changes the toast already showing in place (its text cross-fades over 80 ms, the timer restarts) instead of adding another;
 *   show returns that toast's dismiss (action: a button such as Undo, which runs and dismisses); stop removes the region
 */
export function toaster(host, { ms = 4000, labels = {}, bottom, exit = 0 } = {}) {
  const words = { ...LABELS, ...labels };
  const region = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  if (bottom) region.style.setProperty('--ui-toast-bottom', bottom);
  host.append(region);
  /** @type {{ note: HTMLElement, text: HTMLElement, set: (m: string, o: any) => void, dismiss: () => void } | null} */
  let current = null;
  return {
    show(message, o = {}) {
      if (o.swap && current?.note.isConnected && !current.note.classList.contains('is-leaving')) {
        const c = current;
        c.set(message, o);
        return c.dismiss;
      }
      const text = el('span', {}, message);
      const note = el('div', { class: 'toast' }, text);
      const close = el('button', { type: 'button', 'aria-label': words.dismiss }, icon(x));
      /** @type {ReturnType<typeof setTimeout>} */
      let timer;
      /** @type {HTMLElement | null} */
      let actionBtn = null;
      const addAction = (/** @type {{ label: string, run: () => void } | undefined} */ act) => {
        actionBtn?.remove(); actionBtn = null;
        if (!act) return;
        actionBtn = el('button', { type: 'button', class: 'toast-action' }, act.label);
        actionBtn.addEventListener('click', () => { dismiss(); act.run(); });
        note.insertBefore(actionBtn, close);
      };
      const gone = () => { if (current?.note === note) current = null; note.remove(); };
      const dismiss = () => {
        clearTimeout(timer);
        if (!exit || still() || note.classList.contains('is-leaving')) return gone();
        note.style.setProperty('--d-toast-out', `${exit}ms`);
        note.classList.add('is-leaving');
        note.addEventListener('animationend', gone, { once: true });
        setTimeout(gone, exit + 120);   // (no animationend on a hidden page)
      };
      const arm = (/** @type {number | undefined} */ t) => { clearTimeout(timer); timer = setTimeout(dismiss, t ?? ms); };
      /** @param {string} m @param {any} oo */
      const set = (m, oo) => {
        arm(oo.ms);
        addAction(oo.action);
        if (still() || typeof text.animate !== 'function') { text.textContent = m; return; }
        // cross-fade in place: the old words fade out, the new ones in (40 + 40 ms, linear), the bar does not move
        const out = text.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 40, easing: 'linear', fill: 'forwards' });
        out.onfinish = () => {
          text.textContent = m; out.cancel();
          text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 40, easing: 'linear' });
        };
      };
      note.append(close);
      addAction(o.action);
      arm(o.ms);
      close.addEventListener('click', dismiss);
      region.append(note);
      current = { note, text, set, dismiss };
      return dismiss;
    },
    stop() { region.remove(); },
  };
}
