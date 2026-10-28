// @core/ui's modal focus trap (the pure part) and the default words. node --test app/test/ui-parts.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapIndex } from '../ui/modal.js';
import { LABELS } from '../ui/labels.js';
import { undoToast } from '../ui/undo-toast.js';
import { packagesFromImportMap } from '../ui/about-sheet.js';

test('Tab moves on and wraps at the last control', () => {
  assert.equal(wrapIndex(3, 0, false), 1);
  assert.equal(wrapIndex(3, 2, false), 0);
});

test('Shift+Tab moves back and wraps at the first control', () => {
  assert.equal(wrapIndex(3, 2, true), 1);
  assert.equal(wrapIndex(3, 0, true), 2);
});

test('focus outside the dialog comes in at the first control; nothing focusable gives -1', () => {
  assert.equal(wrapIndex(3, -1, false), 0);
  assert.equal(wrapIndex(3, -1, true), 2);
  assert.equal(wrapIndex(0, -1, false), -1);
});

test('the modal and toast words have defaults', () => {
  for (const k of ['ok', 'cancel', 'dismiss']) assert.ok(LABELS[k]);
});

test('the reference parts have default words', () => {
  for (const k of ['undo', 'loading', 'retry', 'close', 'getNewest', 'licences']) assert.ok(LABELS[k]);
});

/** a toaster that records what it shows and lets the test dismiss or press Undo */
function fakeToasts() {
  const shown = [];
  return { shown, show(message, o) { const t = { message, o, gone: false }; shown.push(t); return () => { t.gone = true; }; } };
}

test('undoToast shows the message with an Undo that runs the undo', () => {
  const toasts = fakeToasts(), ran = [];
  undoToast(toasts).show('Deleted a', () => ran.push('a'));
  const [t] = toasts.shown;
  assert.equal(t.message, 'Deleted a');
  assert.equal(t.o.action.label, 'Undo');
  assert.equal(t.o.ms, 6000);
  t.o.action.run();
  assert.deepEqual(ran, ['a']);
});

test('undoToast keeps one at a time: a new one dismisses the one showing', () => {
  const toasts = fakeToasts(), undo = undoToast(toasts, { ms: 3000, labels: { undo: 'Put back' } });
  undo.show('one', () => {});
  undo.show('two', () => {});
  assert.deepEqual(toasts.shown.map(t => t.gone), [true, false]);
  assert.equal(toasts.shown[1].o.action.label, 'Put back');
  assert.equal(toasts.shown[1].o.ms, 3000);
  undo.stop();
  assert.equal(toasts.shown[1].gone, true);
});

test('packagesFromImportMap lists outside packages with versions and known licences, not the app\'s own files', () => {
  const map = { imports: {
    marked: 'https://cdn.example/marked@12.0.2/lib/marked.esm.js',
    '@core/ui': 'https://core.example/ui/1.0.0-rc.9/ui/index.js',
    xlsx: '/vendor/xlsx.mjs',
    '@core/files': './files/index.js',
    'app/': './src/',
    plain: 'https://cdn.example/plain/index.js',
  } };
  assert.deepEqual(packagesFromImportMap(map, { marked: 'MIT' }), [
    { name: 'marked', version: '12.0.2', licence: 'MIT' },
    { name: '@core/ui', version: '1.0.0-rc.9', licence: '' },
    { name: 'plain', version: '', licence: '' },
  ]);
  assert.deepEqual(packagesFromImportMap(null), []);
});

test('a hover card goes below its link, above it when the window has no room below, and stays inside the window', async () => {
  const { placeCard } = await import('../ui/hover-card.js');
  const view = { width: 400, height: 600 }, card = { width: 300, height: 200 };
  assert.deepEqual(placeCard({ left: 20, top: 100, bottom: 120 }, card, view), { left: 20, top: 126 });
  assert.deepEqual(placeCard({ left: 20, top: 500, bottom: 520 }, card, view), { left: 20, top: 294 });
  assert.deepEqual(placeCard({ left: 350, top: 100, bottom: 120 }, card, view).left, 94);
  assert.deepEqual(placeCard({ left: 20, top: 150, bottom: 170 }, { width: 300, height: 500 }, view).top, 176);   // no room either way: below
});
