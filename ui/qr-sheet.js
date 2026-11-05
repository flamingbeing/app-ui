// Share this screen in person: a sheet with a QR code of a link (drawn as inline SVG, big enough to scan from another
// phone; dark modules on a light tile in every theme, as scanners need, a softer tile in dark mode), the link written
// out, and Copy link. The encoder (qr.js) loads with import() the first time a sheet opens, so it is never on an app's
// startup; until it comes, the tile holds its place. Words: LABELS (qrTitle, qrFor, qrHint, qrFailed, copyLink,
// linkCopied, done), overridable with labels. Nothing runs on import.
import { LABELS } from './labels.js';
import { el } from './dom.js';
import { icon, copy } from '../icons/lucide.js';
import { copyText } from './share.js';
import { popSheet } from './pop-sheet.js';

const NS = 'http://www.w3.org/2000/svg';
/** The light edge round the code, in modules (the standard asks for 4). */
export const QR_QUIET = 4;

/** @param {string} s @param {Record<string, string>} v */
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

/**
 * @param {{ url?: string, title?: string, labels?: Record<string, string> }} [o]
 *   url: the link (default the page's own address); title: the screen's name (the sheet's title, and the code's
 *   name for screen readers); labels: words over LABELS
 * @returns {Promise<void>}  resolves once the sheet is closed
 */
export function qrSheet({ url = globalThis.location?.href ?? '', title = '', labels = {} } = {}) {
  const words = { ...LABELS, ...labels };
  const tile = el('div', { class: 'ui-qr', role: 'img', 'aria-label': fill(words.qrFor, { title: title || url }) });
  const said = el('p', { class: 'ui-qr-said ui-small small', role: 'status' });
  const copyBtn = el('button', { type: 'button', class: 'ui-qr-copy' }, icon(copy), words.copyLink);
  copyBtn.addEventListener('click', async () => {
    // said in the sheet (a toast would sit under it)
    said.textContent = await copyText(url, { labels }) ? words.linkCopied : words.copyFailed;
  });
  const { closed } = popSheet({
    title: title || words.qrTitle,
    done: words.done,
    className: 'ui-qr-sheet',
    body: [tile, el('p', { class: 'ui-qr-hint' }, words.qrHint), el('p', { class: 'ui-qr-url ui-small small' }, url), copyBtn, said],
  });
  import('./qr.js').then(({ qrCode, qrPath }) => {
    const code = qrCode(url);
    const n = code.size + QR_QUIET * 2;
    const svg = document.createElementNS(NS, 'svg');
    for (const [k, v] of Object.entries({ viewBox: `0 0 ${n} ${n}`, 'shape-rendering': 'crispEdges', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, v);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', qrPath(code, QR_QUIET));
    svg.append(path);
    tile.append(svg);
    tile.dataset.version = String(code.version);
  }).catch(() => {
    tile.classList.add('is-failed');
    tile.textContent = words.qrFailed;
  });
  return closed;
}
