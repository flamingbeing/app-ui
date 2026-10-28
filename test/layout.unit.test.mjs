// The layout parts' pure step (ui/layout.js) and the extra-dense floor (ui/layout.css). node --test app/test/layout.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stepValue } from '../ui/layout.js';
import { gridMove, gridStarts } from '../ui/data-grid.js';

test('a step stays in min/max and keeps the step\'s decimals', () => {
  assert.equal(stepValue('36.6', 1, { step: 0.1 }), '36.7');
  assert.equal(stepValue('0.2', 1, { step: 0.1 }), '0.3');
  assert.equal(stepValue('41.95', 1, { step: 0.1, max: 42 }), '42.0');
  assert.equal(stepValue('220', 1, { step: 1, min: 20, max: 220 }), '220');
  assert.equal(stepValue('20', -1, { step: 1, min: 20, max: 220 }), '20');
  assert.equal(stepValue('21', 1, { step: 0.5 }), '21.5');
});

test('a typed value finer than the step moves by exactly one step', () => {
  assert.equal(stepValue('2.5', 1, { step: 1 }), '3.5');
  assert.equal(stepValue('0.25', 1, { step: 0.5 }), '0.75');
  assert.equal(stepValue('2.5', -1, { step: 0.5 }), '2.0');
});

test('an empty or unreadable box starts at its start value, else at 0 kept in range', () => {
  assert.equal(stepValue('', 1, { step: 0.5, start: 21 }), '21.0');
  assert.equal(stepValue('', -1, { step: 0.1, start: 36.5 }), '36.5');
  assert.equal(stepValue('', 1, { min: 20, max: 220 }), '20');
  assert.equal(stepValue('abc', -1, {}), '0');
});

test('extra-dense never takes a target under 24 px', () => {
  const css = fs.readFileSync(new URL('../ui/layout.css', import.meta.url), 'utf8');
  const sizes = [...css.matchAll(/--(?:tap|tap-s|row):\s*(\d+)px/g)].map(m => Number(m[1]));
  assert.ok(sizes.length >= 6, 'extra-dense sets its sizes in px');
  for (const px of sizes) assert.ok(px >= 24, `${px}px is under the 24 px floor`);
});

test('data grid: colspans give each cell its first column', () => {
  assert.deepEqual(gridStarts([[1, 1, 1], [3], [1, 2]]), [[0, 1, 2], [0], [0, 1]]);
  assert.deepEqual(gridStarts([[0, undefined, 1]]), [[0, 1, 2]]);   // a missing span counts as 1
});

test('data grid: arrows, Home/End, Ctrl+Home/End and PageUp/PageDown; the edges hold; a group row keeps the column', () => {
  // a header row, a group row (one wide cell), two body rows: four columns
  const s = gridStarts([[1, 1, 1, 1], [4], [1, 1, 1, 1], [1, 1, 1, 1]]);
  assert.deepEqual(gridMove(s, { row: 2, col: 1 }, 'ArrowRight'), { row: 2, col: 2 });
  assert.deepEqual(gridMove(s, { row: 2, col: 3 }, 'ArrowRight'), { row: 2, col: 3 });
  assert.deepEqual(gridMove(s, { row: 2, col: 0 }, 'ArrowLeft'), { row: 2, col: 0 });
  assert.deepEqual(gridMove(s, { row: 0, col: 2 }, 'ArrowUp'), { row: 0, col: 2 });
  assert.deepEqual(gridMove(s, { row: 3, col: 2 }, 'ArrowDown'), { row: 3, col: 2 });
  // down into the group row lands on its one cell; on down again the column the move started in comes back
  assert.deepEqual(gridMove(s, { row: 0, col: 2 }, 'ArrowDown'), { row: 1, col: 0 });
  assert.deepEqual(gridMove(s, { row: 1, col: 0 }, 'ArrowDown', { want: 2 }), { row: 2, col: 2 });
  assert.deepEqual(gridMove(s, { row: 2, col: 2 }, 'Home'), { row: 2, col: 0 });
  assert.deepEqual(gridMove(s, { row: 2, col: 1 }, 'End'), { row: 2, col: 3 });
  assert.deepEqual(gridMove(s, { row: 2, col: 1 }, 'Home', { ctrl: true }), { row: 0, col: 0 });
  assert.deepEqual(gridMove(s, { row: 0, col: 1 }, 'End', { ctrl: true }), { row: 3, col: 3 });
  assert.deepEqual(gridMove(s, { row: 0, col: 1 }, 'PageDown', { page: 2 }), { row: 2, col: 1 });
  assert.deepEqual(gridMove(s, { row: 3, col: 1 }, 'PageUp', { page: 10 }), { row: 0, col: 1 });
  assert.equal(gridMove(s, { row: 0, col: 0 }, 'a'), null);
  assert.equal(gridMove([], { row: 0, col: 0 }, 'ArrowDown'), null);
});
