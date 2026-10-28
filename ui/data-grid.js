// Data grid: a table of small cells (people by day, readings by time) in a box that scrolls both ways, the header row,
// the first column and any footer row kept in view (ui/layout.css), with the ARIA grid pattern: one Tab stop; arrow
// keys, Home / End (the row), Ctrl+Home / Ctrl+End (the grid), PageUp / PageDown move between cells; a tap, Enter or
// Space on a body cell (td) selects it (aria-selected) and fires onSelect and a bubbling 'ui-grid-select' event.
// A cell holding one button or link: Enter clicks it (its click selects as a tap does). Hidden rows are skipped and a
// colspan counts as the columns it covers. The app owns the markup and may redraw any of it at any time:
//   <div class="ui-data-grid-box"><table class="ui-data-grid" data-size="dense|extra" aria-label="…">
//     <thead><tr><th scope="col">…</th><th scope="col" data-key="…">…</th>…</tr></thead>
//     <tbody><tr data-key="…"><th scope="row">…</th><td>…</td>…</tr>
//            <tr data-group><th colspan="…" scope="colgroup"><span>a group's name</span></th></tr>…</tbody>
//     <tfoot>…totals…</tfoot></table></div>
// Sizes: no data-size = the screen's tap size; dense = 32 px cells; extra = 24 px, the floor for a target.

/** @typedef {{ row: number, col: number }} GridPos  row: index among the shown rows; col: the first column a cell covers */
/** @typedef {{ cell: HTMLTableCellElement, row: number, col: number, rowKey?: string, colKey?: string }} GridPick */

/**
 * The first column of each cell in each row, from the rows' colspans.
 * @param {number[][]} spans  per row, each cell's colspan @returns {number[][]}
 */
export function gridStarts(spans) {
  return spans.map(r => { let c = 0; return r.map(s => { const at = c; c += Math.max(1, s || 1); return at; }); });
}

/**
 * Where a key moves to in the grid, or null for a key the grid doesn't use. Up and down keep to `want` (the column the
 * last sideways move left the focus in), so passing a wide group row comes back to the same column.
 * @param {number[][]} starts  gridStarts() @param {GridPos} at @param {string} key  KeyboardEvent.key
 * @param {{ ctrl?: boolean, want?: number, page?: number }} [o]  page: rows a PageUp / PageDown moves (default 10)
 * @returns {GridPos | null}
 */
export function gridMove(starts, at, key, { ctrl = false, want = at.col, page = 10 } = {}) {
  const last = starts.length - 1;
  if (last < 0) return null;
  /** the cell of a row covering a column (the last that starts at or before it) @param {number} r @param {number} col */
  const cover = (r, col) => { const s = starts[r]; let c = s[0] ?? 0; for (const x of s) if (x <= col) c = x; return { row: r, col: c }; };
  const row = starts[at.row] ?? [];
  const i = row.indexOf(at.col);
  switch (key) {
    case 'ArrowRight': return i < row.length - 1 ? { row: at.row, col: row[i + 1] } : at;
    case 'ArrowLeft': return i > 0 ? { row: at.row, col: row[i - 1] } : at;
    case 'ArrowDown': return cover(Math.min(last, at.row + 1), want);
    case 'ArrowUp': return cover(Math.max(0, at.row - 1), want);
    case 'PageDown': return cover(Math.min(last, at.row + page), want);
    case 'PageUp': return cover(Math.max(0, at.row - page), want);
    case 'Home': return ctrl ? { row: 0, col: starts[0][0] ?? 0 } : { row: at.row, col: row[0] ?? 0 };
    case 'End': { const r = ctrl ? last : at.row; const s = starts[r]; return { row: r, col: s[s.length - 1] ?? 0 }; }
    default: return null;
  }
}

/** @type {WeakMap<HTMLTableElement, () => void>} the grids started, so a second start (startLayout's, then the app's own) replaces the first */
export const runningGrids = new WeakMap();

const FIELD = 'input, select, textarea, [contenteditable]';
const CONTROL = 'button, a[href], input, select, textarea, [tabindex]:not(td):not(th)';

/**
 * @param {HTMLTableElement} table  a table.ui-data-grid (in a .ui-data-grid-box to scroll both ways)
 * @param {{ onSelect?: (pick: GridPick) => void }} [o]
 * @returns {{ stop: () => void, select: (cell: HTMLTableCellElement | null) => void, selected: () => HTMLTableCellElement | null,
 *   focus: (cell?: HTMLTableCellElement) => void }}
 *   select: mark a cell (null clears; fires nothing); focus: move the Tab stop to a cell (default the current one) and
 *   focus it
 */
export function dataGrid(table, { onSelect } = {}) {
  runningGrids.get(table)?.();
  table.setAttribute('role', 'grid');
  const box = /** @type {HTMLElement | null} */ (table.closest('.ui-data-grid-box'));
  /** @type {HTMLTableCellElement | null} */ let current = null;
  /** @type {HTMLTableCellElement | null} */ let chosen = null;
  let want = 0;

  const shown = () => [...table.rows].filter(r => !r.hidden && r.closest('table') === table && !r.parentElement?.hidden);
  /** @param {HTMLTableRowElement[]} rows */
  const startsOf = rows => gridStarts(rows.map(r => [...r.cells].map(c => c.colSpan)));
  /** @param {HTMLTableCellElement} cell @param {HTMLTableRowElement[]} rows @returns {GridPos} */
  const posOf = (cell, rows) => {
    const r = /** @type {HTMLTableRowElement} */ (cell.parentElement);
    const row = rows.indexOf(r);
    return { row, col: row < 0 ? 0 : startsOf([r])[0][[...r.cells].indexOf(cell)] };
  };
  /** @param {HTMLTableRowElement[]} rows @param {GridPos} p */
  const cellAt = (rows, p) => {
    const r = rows[p.row];
    if (!r) return null;
    const i = startsOf([r])[0].indexOf(p.col);
    return /** @type {HTMLTableCellElement | undefined} */ (r.cells[i]) ?? null;
  };
  /** @param {EventTarget | null} t */
  const cellOf = t => {
    const c = /** @type {HTMLTableCellElement | null} */ (t instanceof Element ? t.closest('td, th') : null);
    return c && c.closest('table') === table ? c : null;
  };

  // one Tab stop: the current cell; the controls inside cells are reached through it
  const tame = () => {
    for (const el of table.querySelectorAll(CONTROL)) if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1');
    if (!current || !current.isConnected || !shown().includes(/** @type {HTMLTableRowElement} */ (current.parentElement))) {
      const rows = shown();
      // the first body cell, else the first cell
      const first = /** @type {HTMLTableCellElement | null} */ (rows.find(r => r.querySelector('td'))?.querySelector('td') ?? rows[0]?.cells[0] ?? null);
      setCurrent(first);
    }
    if (chosen && !chosen.isConnected) chosen = null;
  };
  /** @param {HTMLTableCellElement | null} cell */
  const setCurrent = cell => {
    if (current && current !== cell) current.removeAttribute('tabindex');
    current = cell;
    if (cell) cell.tabIndex = 0;
  };
  // keep the cell clear of the sticky header row, first column and footer
  /** @param {HTMLTableCellElement} cell */
  const reveal = cell => {
    if (box) {
      // the sticky first column: the row's first cell, when it is a one-column header
      const first = /** @type {HTMLTableRowElement} */ (cell.parentElement).cells[0];
      box.style.scrollPaddingTop = `${table.tHead?.offsetHeight ?? 0}px`;
      box.style.scrollPaddingBottom = `${table.tFoot?.offsetHeight ?? 0}px`;
      box.style.scrollPaddingLeft = first.tagName === 'TH' && first.colSpan === 1 && cell !== first ? `${first.offsetWidth}px` : '0px';
    }
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  /** @param {HTMLTableCellElement} [cell] */
  const focus = (cell = current ?? undefined) => {
    if (!cell) return;
    setCurrent(cell);
    cell.focus({ preventScroll: true });
    reveal(cell);
  };
  /** @param {HTMLTableCellElement | null} cell */
  const select = cell => {
    if (chosen && chosen !== cell) chosen.removeAttribute('aria-selected');
    chosen = cell;
    if (cell) cell.setAttribute('aria-selected', 'true');
  };
  /** @param {HTMLTableCellElement} cell */
  const pick = cell => {
    if (cell.tagName !== 'TD') return;
    select(cell);
    const rows = shown(), p = posOf(cell, rows);
    const head = table.tHead?.rows[0];
    const colHead = head ? cellAt([head], { row: 0, col: p.col }) : null;
    /** @type {GridPick} */
    const detail = { cell, row: p.row, col: p.col, rowKey: /** @type {HTMLElement} */ (cell.parentElement).dataset.key, colKey: colHead?.dataset.key };
    onSelect?.(detail);
    table.dispatchEvent(new CustomEvent('ui-grid-select', { bubbles: true, detail }));
  };

  /** @param {KeyboardEvent} e */
  function key(e) {
    const cell = cellOf(e.target);
    if (!cell || (e.target instanceof Element && e.target.matches(FIELD))) return;
    if (e.key === 'Enter' || e.key === ' ') {
      const inner = cell.querySelectorAll('button, a[href]');
      if (e.key === 'Enter' && inner.length === 1) { e.preventDefault(); /** @type {HTMLElement} */ (inner[0]).click(); return; }
      if (cell.tagName === 'TD') { e.preventDefault(); pick(cell); }
      return;
    }
    const rows = shown(), at = posOf(cell, rows);
    if (at.row < 0) return;
    const page = Math.max(1, Math.floor((box?.clientHeight ?? innerHeight) / Math.max(1, cell.offsetHeight)) - 2);
    const to = gridMove(startsOf(rows), at, e.key, { ctrl: e.ctrlKey || e.metaKey, want, page });
    if (!to) return;
    e.preventDefault();
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) want = to.col;   // up and down keep the column
    const next = cellAt(rows, to);
    if (next) focus(next);
  }
  /** @param {MouseEvent} e */
  function click(e) {
    const cell = cellOf(e.target);
    if (!cell) return;
    setCurrent(cell);
    // a tap focuses the cell (the arrows go on from there), unless a control in it took the focus
    if (!cell.contains(document.activeElement)) cell.focus({ preventScroll: true });
    want = posOf(cell, shown()).col;
    pick(cell);
  }
  /** @param {FocusEvent} e */
  function focusin(e) {
    const cell = cellOf(e.target);
    if (cell && cell !== current) { setCurrent(cell); want = posOf(cell, shown()).col; }
  }

  table.addEventListener('keydown', key);
  table.addEventListener('click', click);
  table.addEventListener('focusin', focusin);
  const watch = new MutationObserver(tame);
  watch.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  tame();
  const stop = () => {
    watch.disconnect(); table.removeEventListener('keydown', key); table.removeEventListener('click', click); table.removeEventListener('focusin', focusin);
    if (runningGrids.get(table) === stop) runningGrids.delete(table);
  };
  runningGrids.set(table, stop);
  return {
    stop,
    select,
    selected: () => chosen,
    focus,
  };
}
