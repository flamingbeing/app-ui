// A sheet made on the spot (qrSheet, askFirst): a dialog.ui-sheet as tall as what it holds, with a grabber, a head
// (its title, and Done if given) and a body. It opens at once; the sheet part (detent-sheet.js) gives it the drag down,
// Back, Esc and the backdrop to close it, and it is removed once closed. Not exported from @core/ui (the parts that
// use it are). Nothing runs on import.
import { el } from './dom.js';
import { detentSheet } from './detent-sheet.js';

let made = 0;

/**
 * @param {{ title: string, body: (Node | string)[], done?: string, className?: string }} o
 *   done: the head's close word (left out: no head button); className: added to the sheet
 * @returns {{ sheet: HTMLDialogElement, close: () => void, closed: Promise<void> }}  closed: resolves once it is shut and gone
 */
export function popSheet({ title, body, done, className = '' }) {
  const id = `ui-pop-sheet-${++made}`;
  const head = el('div', { class: 'ui-sheet-head' }, el('h2', { id: `${id}-title` }, title));
  if (done) head.append(el('button', { type: 'button', 'data-close': '' }, done));
  const sheet = /** @type {HTMLDialogElement} */ (el('dialog', { id, class: `ui-sheet ui-sheet-fit ${className}`.trim(), 'data-detents': 'medium', 'aria-labelledby': `${id}-title` },
    el('div', { class: 'ui-sheet-grabber', 'aria-hidden': 'true' }), head, el('div', { class: 'ui-sheet-body' }, ...body)));
  document.body.append(sheet);
  const part = detentSheet(sheet);
  /** @type {Promise<void>} */
  const closed = new Promise(resolve => {
    sheet.addEventListener('close', () => { part.stop(); sheet.remove(); resolve(); }, { once: true });
  });
  part.open(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  return { sheet, close: part.close, closed };
}
