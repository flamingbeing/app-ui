/**
 * The value one step away, kept in [min, max] and rounded to the step's decimals (0.1 + 0.2 is 0.3, not 0.30000000004).
 * An empty field starts at `start` (when given) rather than stepping from it.
 * @param {string} value  the field's text @param {number} dir  +1 or -1
 * @param {{ step?: number, min?: number, max?: number, start?: number }} [o]
 * @returns {string}
 */
export function stepValue(value: string, dir: number, { step, min, max, start }?: {
    step?: number;
    min?: number;
    max?: number;
    start?: number;
}): string;
/** @param {HTMLElement} box  a .ui-stepper with [data-step] buttons and one input @returns {() => void} stop */
export function stepper(box: HTMLElement): () => void;
/** @param {HTMLElement} bar  a [role=toolbar] @returns {() => void} stop */
export function toolbar(bar: HTMLElement): () => void;
/** @param {HTMLElement} group  a .ui-segmented[data-clearable] @returns {() => void} stop */
export function clearableSegments(group: HTMLElement): () => void;
/**
 * Starts every layout part under root (steppers, toolbars, clearable segmented controls).
 * @param {ParentNode} [root]
 * @returns {{ stop: () => void }}
 */
export function startLayout(root?: ParentNode): {
    stop: () => void;
};
