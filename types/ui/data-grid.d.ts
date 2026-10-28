/** @typedef {{ row: number, col: number }} GridPos  row: index among the shown rows; col: the first column a cell covers */
/** @typedef {{ cell: HTMLTableCellElement, row: number, col: number, rowKey?: string, colKey?: string }} GridPick */
/**
 * The first column of each cell in each row, from the rows' colspans.
 * @param {number[][]} spans  per row, each cell's colspan @returns {number[][]}
 */
export function gridStarts(spans: number[][]): number[][];
/**
 * Where a key moves to in the grid, or null for a key the grid doesn't use. Up and down keep to `want` (the column the
 * last sideways move left the focus in), so passing a wide group row comes back to the same column.
 * @param {number[][]} starts  gridStarts() @param {GridPos} at @param {string} key  KeyboardEvent.key
 * @param {{ ctrl?: boolean, want?: number, page?: number }} [o]  page: rows a PageUp / PageDown moves (default 10)
 * @returns {GridPos | null}
 */
export function gridMove(starts: number[][], at: GridPos, key: string, { ctrl, want, page }?: {
    ctrl?: boolean;
    want?: number;
    page?: number;
}): GridPos | null;
/**
 * @param {HTMLTableElement} table  a table.ui-data-grid (in a .ui-data-grid-box to scroll both ways)
 * @param {{ onSelect?: (pick: GridPick) => void }} [o]
 * @returns {{ stop: () => void, select: (cell: HTMLTableCellElement | null) => void, selected: () => HTMLTableCellElement | null,
 *   focus: (cell?: HTMLTableCellElement) => void }}
 *   select: mark a cell (null clears; fires nothing); focus: move the Tab stop to a cell (default the current one) and
 *   focus it
 */
export function dataGrid(table: HTMLTableElement, { onSelect }?: {
    onSelect?: (pick: GridPick) => void;
}): {
    stop: () => void;
    select: (cell: HTMLTableCellElement | null) => void;
    selected: () => HTMLTableCellElement | null;
    focus: (cell?: HTMLTableCellElement) => void;
};
/** @type {WeakMap<HTMLTableElement, () => void>} the grids started, so a second start (startLayout's, then the app's own) replaces the first */
export const runningGrids: WeakMap<HTMLTableElement, () => void>;
/**
 * row: index among the shown rows; col: the first column a cell covers
 */
export type GridPos = {
    row: number;
    col: number;
};
export type GridPick = {
    cell: HTMLTableCellElement;
    row: number;
    col: number;
    rowKey?: string;
    colKey?: string;
};
