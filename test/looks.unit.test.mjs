// @core/theme's looks (looks.js: token sets + variants, data only) and the glass guard's verdict (guard.js).
// node --test app/test/looks.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, LOOK_IDS, VARIANTS, DEFAULT_LOOK, lookOf } from '../theme/looks.js';
import { verdict, median, MEMORY_FLOOR, SLOW_FRAME_MS, PROBE_FRAMES } from '../theme/guard.js';
import { placeSheetMenu } from '../ui/hold-menu.js';

test('every look: a unique id, a name, every variant picked from VARIANTS, the same token keys', () => {
  assert.deepEqual(LOOK_IDS, ['a', 'b', 'c', 'd', 'e', 'ios']);
  assert.equal(new Set(LOOK_IDS).size, LOOKS.length);
  const keys = Object.keys(LOOKS[0].tokens).sort();
  for (const look of LOOKS) {
    assert.ok(look.name && look.desc, look.id);
    assert.deepEqual(Object.keys(look.variants).sort(), Object.keys(VARIANTS).sort(), `${look.id}: every variant named`);
    for (const [k, v] of Object.entries(look.variants)) assert.ok(/** @type {Record<string, string[]>} */ (VARIANTS)[k].includes(v), `${look.id} ${k}=${v}`);
    assert.deepEqual(Object.keys(look.tokens).sort(), keys, `${look.id}: the same tokens as ${LOOKS[0].id}`);
    for (const [k, v] of Object.entries(look.tokens)) assert.match(`${k}: ${v}`, /^[a-z-]+: [^;{}<>]+$/, `${look.id} ${k}: one plain value`);
  }
});

test('the look shown: the picked one, else the app\'s, else A', () => {
  assert.equal(DEFAULT_LOOK, 'a');
  assert.equal(lookOf('b').id, 'b');
  assert.equal(lookOf('', 'c').id, 'c');
  assert.equal(lookOf('b', 'c').id, 'b');
  assert.equal(lookOf('zz', 'yy').id, 'a');
  assert.equal(lookOf().id, 'a');
});

test('the looks differ where the canvas does: A glass + floating tab bar, B a band + sheets, C glass on pills only', () => {
  const [a, b, c] = LOOKS;
  assert.deepEqual([a.variants.glass, b.variants.glass, c.variants.glass], ['bars', 'none', 'pill']);
  assert.equal(b.variants.header, 'band');
  assert.equal(b.variants.menu, 'sheet');
  assert.equal(b.variants.tick, 'square');
  assert.equal(a.variants.tabbar, 'float');
  assert.equal(c.tokens['card-r'], '0px', 'C: flush lists');
});

test('look D "Slim": the bar always shows the name, lists as inset cards, an edge tab bar, no band or glass', () => {
  const d = lookOf('d');
  assert.equal(d.name, 'Slim');
  assert.deepEqual(d.variants, { header: 'slim', menu: 'popover', glass: 'none', tick: 'round', tabbar: 'edge' });
  assert.ok(VARIANTS.header.includes('slim'));
  assert.equal(d.tokens['card-r'], 'var(--radius-l)', 'rows rounded like cards');
  assert.equal(d.tokens['list-inset'], 'var(--gap)', 'and inset from the screen edges');
  assert.equal(d.tokens['list-bg'], 'var(--surface)');
});

test('look E "Workspace": flat (no glass), slim bar, flush lists on the page, menus as sheets', () => {
  const e = lookOf('e');
  assert.equal(e.name, 'Workspace');
  assert.deepEqual(e.variants, { header: 'slim', menu: 'sheet', glass: 'none', tick: 'round', tabbar: 'edge' });
  assert.equal(e.tokens['list-inset'], '0', 'flush with the screen edges');
  assert.equal(e.tokens['list-bg'], 'transparent', 'rows on the page, no card');
});

test('glass guard: little memory turns glass down at once; slow frames on the first scroll do; fast ones keep it', () => {
  assert.equal(MEMORY_FLOOR, 4);
  assert.deepEqual(verdict({ memory: 2 }), { solid: true, why: 'memory' });
  assert.deepEqual(verdict({ memory: 4 }), { solid: true, why: 'memory' });
  assert.equal(verdict({ memory: 8 }), null, 'plenty of memory proves nothing: wait for the probe');
  assert.equal(verdict({}), null);
  assert.equal(verdict({ frames: [30, 30] }), null, 'too few frames: no verdict');
  const slow = Array(PROBE_FRAMES).fill(SLOW_FRAME_MS + 8), fast = Array(PROBE_FRAMES).fill(16.7);
  assert.deepEqual(verdict({ memory: 8, frames: slow }), { solid: true, why: 'frames' });
  assert.deepEqual(verdict({ memory: 8, frames: fast }), { solid: false, why: '' });
  // one long frame (a scroll that started a decode) does not decide it: the median does
  assert.deepEqual(verdict({ frames: [...fast.slice(1), 400] }), { solid: false, why: '' });
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), 0);
});

test('a sheet menu sits on the bottom edge, never above the top one', () => {
  assert.deepEqual(placeSheetMenu({ h: 300 }, { h: 800 }), { top: 492 });
  assert.deepEqual(placeSheetMenu({ h: 900 }, { h: 800 }), { top: 8 });
});

test('look iOS: large title, glass bars, a floating tab bar, grouped grounds and system blue, only as fallbacks', async () => {
  const { palettes, accentOf } = await import('../theme/palette-css.js');
  const ios = lookOf('ios');
  assert.equal(ios.name, 'iOS');
  assert.deepEqual(ios.variants, { header: 'plain', menu: 'popover', glass: 'bars', tick: 'round', tabbar: 'float' });
  assert.equal(ios.tokens['list-sep'], 'var(--ios-separator)');
  assert.equal(accentOf({ look: 'ios' }), '#007aff', 'iOS blue when nobody names an accent');
  assert.equal(accentOf({ look: 'ios' }, { accent: '#0f766e' }), '#0f766e', 'the app\'s own accent wins');
  assert.equal(accentOf({ look: 'ios', accent: '#aa3355' }, { accent: '#0f766e' }), '#aa3355', 'the device\'s wins over both');
  assert.equal(accentOf({}, { look: 'ios' }), '#007aff', 'an app opting in by its look');
  assert.equal(palettes({ look: 'ios' }).light.bg, '#f2f2f7', 'grouped grey ground');
  assert.equal(palettes({ look: 'ios' }).dark.bg, '#000000');
  assert.notEqual(palettes({ look: 'a' }).light.bg, '#f2f2f7', 'other looks keep their ground');
});
