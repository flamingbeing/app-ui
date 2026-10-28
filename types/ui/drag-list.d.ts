/**
 * Start the drag from a grip's pointerdown.
 * @param {PointerEvent} e  the grip's pointerdown (its currentTarget or target is the grip, inside an li of the list)
 * @param {HTMLElement} list  the ul or ol whose children are the rows
 * @param {(from: number, to: number) => void} onDrop
 */
export function gripDrag(e: PointerEvent, list: HTMLElement, onDrop: (from: number, to: number) => void): void;
/**
 * A list with one item moved: a new array.
 * @template T
 * @param {readonly T[]} list @param {number} from @param {number} to
 * @returns {T[]}
 */
export function moveIn<T>(list: readonly T[], from: number, to: number): T[];
