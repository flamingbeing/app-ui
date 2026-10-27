// Loading and error states for a list: grey skeleton rows while it loads, or the error with a Retry button.
// The page says which (loading / failed / done); nothing is shown once done.
import { LABELS } from './labels.js';
import { el, button } from './dom.js';

/**
 * @param {HTMLElement} host  the block is added here, empty until loading() or failed()
 * @param {{ rows?: number, labels?: Record<string, string> }} [o]  rows: how many skeleton rows (default 4)
 * @returns {{ loading: () => void, failed: (message: string, retry: () => unknown) => void, done: () => void, stop: () => void }}
 */
export function loadState(host, { rows = 4, labels = {} } = {}) {
  const words = { ...LABELS, ...labels };
  const box = el('div', { class: 'load-state' });
  box.hidden = true;
  host.append(box);
  const done = () => { box.replaceChildren(); box.hidden = true; host.removeAttribute('aria-busy'); };
  return {
    loading() {
      const skeleton = Array.from({ length: rows }, () => el('div', { class: 'load-row' }));
      box.replaceChildren(el('p', { class: 'load-note', role: 'status' }, words.loading), ...skeleton);
      box.hidden = false;
      host.setAttribute('aria-busy', 'true');
    },
    failed(message, retry) {
      done();
      box.replaceChildren(el('p', { class: 'load-error', role: 'alert' }, message), button(words.retry, retry, { class: 'load-retry' }));
      box.hidden = false;
    },
    done,
    stop() { done(); box.remove(); },
  };
}
