// Drag a row of a list by its grip (a finger or a mouse). The row follows the pointer, with a tick (gesture.js haptic)
// as it picks up and as it passes each row; on release, onDrop(from, to) gets its old and new index among the list's
// rows. A cancelled drag (the browser took the touch) puts the row back. Style: ui/ui.css, "drag-reorder".
import { claim, haptic } from './gesture.js';

/**
 * Start the drag from a grip's pointerdown.
 * @param {PointerEvent} e  the grip's pointerdown (its currentTarget or target is the grip, inside an li of the list)
 * @param {HTMLElement} list  the ul or ol whose children are the rows
 * @param {(from: number, to: number) => void} onDrop
 */
export function gripDrag(e, list, onDrop) {
  e.preventDefault();
  const grip = /** @type {HTMLElement} */ (e.currentTarget || e.target);
  const row = /** @type {HTMLElement | null} */ (grip.closest('li'));
  if (!row || !claim('drag')) return;
  const rows = /** @type {HTMLElement[]} */ ([...list.children]), y0 = e.clientY;
  // where a drop at y would put the row (its new index)
  const slot = (/** @type {number} */ y) => rows.filter(r => r !== row && y > r.getBoundingClientRect().top + r.getBoundingClientRect().height / 2).length;
  let at = rows.indexOf(row);
  row.classList.add('dragging');
  haptic();
  grip.setPointerCapture?.(e.pointerId);
  const move = (/** @type {PointerEvent} */ ev) => {
    row.style.transform = `translateY(${ev.clientY - y0}px)`;
    const to = slot(ev.clientY);
    if (to !== at) { at = to; haptic(); }
  };
  const end = () => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    grip.removeEventListener('pointercancel', end);
    row.classList.remove('dragging');
    row.style.transform = '';
  };
  const up = (/** @type {PointerEvent} */ ev) => {
    end();
    const to = slot(ev.clientY);
    const from = rows.indexOf(row);
    if (to !== from) onDrop(from, to);
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
  grip.addEventListener('pointercancel', end);
}

/**
 * A list with one item moved: a new array.
 * @template T
 * @param {readonly T[]} list @param {number} from @param {number} to
 * @returns {T[]}
 */
export function moveIn(list, from, to) {
  const a = [...list];
  a.splice(to, 0, ...a.splice(from, 1));
  return a;
}
