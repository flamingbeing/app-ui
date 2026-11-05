// Share out: some text (one item, or a list as plain text) through the system share sheet, or the clipboard where
// there is none; or a screen's link (shareLink), the same way. The page hands in its toaster to say what happened; the
// words are overridable like every part's. A QR code of a link to scan from another phone: qrSheet (qr-sheet.js).
import { LABELS } from './labels.js';

/**
 * @typedef {{ show: (message: string) => unknown }} Notes  the page's toaster
 * @typedef {{ toasts?: Notes, labels?: Record<string, string> }} ShareOptions
 */

/**
 * @param {string} text @param {ShareOptions & { what?: string }} [o]  what: the word shown after copying
 * @returns {Promise<boolean>} whether it was copied
 */
export async function copyText(text, { toasts, labels = {}, what } = {}) {
  const words = { ...LABELS, ...labels };
  try {
    await navigator.clipboard.writeText(text);
    toasts?.show(what ?? words.copied);
    return true;
  } catch {
    toasts?.show(words.copyFailed);
    return false;
  }
}

/**
 * The share sheet (messages, notes apps); the clipboard where there isn't one. A closed sheet is not an error.
 * @param {string} text @param {ShareOptions & { title?: string }} [o]
 * @returns {Promise<'shared' | 'copied' | 'cancelled' | 'failed'>}
 */
export async function shareText(text, { title = '', toasts, labels = {} } = {}) {
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title, text }); return 'shared'; }
    catch (err) { if (err instanceof Error && err.name === 'AbortError') return 'cancelled'; }
  }
  const words = { ...LABELS, ...labels };
  return await copyText(text, { toasts, labels, what: words.copiedPaste }) ? 'copied' : 'failed';
}

/**
 * Share this screen: its link through the system share sheet (with a title, and words if given), or the link copied
 * where there is no share sheet or it can't take a link. A closed sheet is not an error.
 * @param {ShareOptions & { url?: string, title?: string, text?: string }} [o]  url: default the page's own address
 * @returns {Promise<'shared' | 'copied' | 'cancelled' | 'failed'>}
 */
export async function shareLink({ url = globalThis.location?.href ?? '', title = '', text, toasts, labels = {} } = {}) {
  /** @type {ShareData} */
  const data = text ? { title, text, url } : { title, url };
  if (typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare(data))) {
    try { await navigator.share(data); return 'shared'; }
    catch (err) { if (err instanceof Error && err.name === 'AbortError') return 'cancelled'; }
  }
  const words = { ...LABELS, ...labels };
  return await copyText(url, { toasts, labels, what: words.linkCopied }) ? 'copied' : 'failed';
}
