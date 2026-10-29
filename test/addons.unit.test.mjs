// theme/addons: the logbook add-ons' pure parts (wallpaper sums, fonts, custom CSS, colour grid, icon sets, the
// per-device choice, saved themes and the theme-link codec), with a made-up look schema.
// node --test test/addons.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanWall, dimOf, patternCss, patternSamples, minDim, scrimFor, frostAlpha, FROST, cssHex,
  fontStack, logChoice, cleanFontName, STACKS,
  checkCss, parseSettings, settingsCss, cleanValues,
  GRID, gridIndex, snap, isSnapped, bits18, fromBits18, pushRecent,
  cleanIconSet, cleanIconPicks, iconSetPath,
  cleanAddons, wallPaint,
  savedThemes, themeLinks,
} from '../theme/addons/index.js';

const PAL = { bg: '#ffffff', surface: '#f4f4f4', text: '#111111', muted: '#555555', accent: '#1a56db' };

test('wallpaper: choices, dim and the backing text needs', () => {
  assert.equal(cleanWall('dots'), 'dots');
  assert.equal(cleanWall('photo'), 'photo');
  assert.equal(cleanWall('nope'), null);
  assert.equal(dimOf({ wallpaper: 'photo' }), 40);
  assert.equal(dimOf({ wallpaper: 'dots', wallDim: 15 }), 15);
  assert.equal(dimOf({ wallpaper: 'dots', wallDim: 13 }), 0, 'not a step of 5');
  assert.match(patternCss({ wallpaper: 'grid' }), /--wall: linear-gradient/);
  assert.match(patternCss({ wallpaper: 'dots' }), /var\(--text\)/, 'ink is the kit text colour');
  assert.equal(patternCss({}), '');
  assert.equal(patternSamples('dots', PAL, 6).length, 2);
  // a dark photo under dark text: the page needs dimming; text on the bare page gets the rest as backing
  const floor = minDim(['#000000', '#202020'], PAL);
  assert.ok(floor > 0.5 && floor <= 1);
  assert.equal(scrimFor(floor, floor), 0);
  const s = scrimFor(floor, 0.2);
  assert.ok(1 - (1 - 0.2) * (1 - s) >= floor - 1e-9);
  assert.ok(frostAlpha(['#000000'], 0.2, PAL) >= FROST);
  assert.equal(cssHex(' rgb(255, 0, 16) '), '#ff0010');
  assert.equal(cssHex('#abc'), '#aabbcc');
});

test('fonts: stacks, typed names and the writing font', () => {
  assert.equal(fontStack('default'), '');
  assert.equal(fontStack('mono'), STACKS.mono);
  assert.match(fontStack('named', 'My Font"; x', 'ui'), /^"My Font x", /);
  assert.match(fontStack('file', '', 'log'), /^"Own font \(writing\)"/);
  assert.equal(fontStack('brand', '', 'ui', { brand: '"Brand Sans", sans-serif' }), '"Brand Sans", sans-serif');
  assert.equal(logChoice({ fontLog: 'same' }), null);
  assert.equal(logChoice({ fontLog: 'serif' }), 'serif');
  assert.equal(cleanFontName('a<b>{c}'), 'abc');
});

test('custom CSS: nothing that loads from elsewhere; @settings become variables', () => {
  assert.equal(checkCss('.x { color: red }').ok, true);
  for (const bad of ['.x { background: url(https://example.test/a) }', '@import "x.css";', '.x { }}']) assert.equal(checkCss(bad).ok, false, bad);
  const css = '/* @settings\nslider --gap 0 24 2 8px  Gap\ncolour --mark #ffcc00  Mark\nswitch --round 4px 999px  Round\n*/\n.x { gap: var(--gap) }';
  const { settings, problems } = parseSettings(css);
  assert.deepEqual(problems, []);
  assert.deepEqual(settings.map(s => s.kind), ['slider', 'colour', 'switch']);
  const vals = cleanValues(settings, { '--gap': 12, '--mark': 'red; x', '--round': true });
  assert.deepEqual(vals, { '--gap': 12, '--round': true });
  assert.match(settingsCss(settings, vals), /--gap: 12px;[\s\S]*--mark: #ffcc00;[\s\S]*--round: 999px;/);
});

test('colour grid: snap, 18-bit codes and recents', () => {
  const i = gridIndex(GRID[5].c);
  assert.equal(i, 5);
  assert.equal(gridIndex('#123457'), -1);
  const s = snap('#123457');
  assert.equal(isSnapped(s), true);
  assert.equal(fromBits18(bits18(s)), s);
  assert.deepEqual(pushRecent(['#111111', '#222222'], '#222222'), ['#222222', '#111111']);
});

test('icon sets and per-tab icons', () => {
  assert.equal(cleanIconSet('line'), null, 'the default is no mark');
  assert.equal(cleanIconSet('ios'), 'thin', 'the logbook name reads as the same set');
  assert.equal(cleanIconSet('x'), null);
  assert.equal(iconSetPath('home', 'M0 0', 'thin', { thin: { home: 'M1 1' } }), 'M1 1');
  assert.equal(iconSetPath('home', 'M0 0', 'sharp', { thin: { home: 'M1 1' } }), 'M0 0');
  assert.deepEqual(cleanIconPicks({ b: 'star', a: 'pen', C: 'pen', d: 'nope' }, ['pen', 'star']), { a: 'pen', b: 'star' });
});

test('the per-device choice: off unless chosen, odd values dropped', () => {
  assert.deepEqual(cleanAddons(null), {});
  assert.deepEqual(cleanAddons({ wallpaper: 'dots', wallDim: 20, wallFrost: true, fontUi: 'default', icons: 'line' }), { wallpaper: 'dots', wallDim: 20, wallFrost: true });
  assert.deepEqual(cleanAddons({ wallDim: 20, fontUi: 'named', fontUiName: '' }), {}, 'a dim without a wallpaper, a name without text');
  assert.deepEqual(cleanAddons({ css: '.x { background: url(x) }', icons: 'soft' }), { icons: 'soft' });
  const p = wallPaint({ wallpaper: 'dots', wallFrost: true }, PAL);
  assert.equal(p.dim, 0);
  assert.ok(p.frost >= FROST && p.frost <= 1);
  assert.deepEqual(wallPaint({}, PAL), { dim: 0, floor: 0, scrim: 0, frost: 1 });
});

// a made-up app: three look settings and two colour tokens
const FIELDS = { spacing: { kind: 'enum', values: ['tight', 'normal', 'roomy'] }, round: { kind: 'int', min: 0, step: 2 }, flat: { kind: 'bool' } };
const lookOf = (/** @type {any} */ d) => {
  /** @type {Record<string, any>} */ const out = {};
  if (FIELDS.spacing.values.includes(d.spacing)) out.spacing = d.spacing;
  if (Number.isInteger(d.round) && d.round >= 0 && d.round <= 20 && d.round % 2 === 0) out.round = d.round;
  if (d.flat === true) out.flat = true;
  const c = d.colours;
  if (c && typeof c === 'object') {
    /** @type {Record<string, Record<string, string>>} */ const col = {};
    for (const side of ['light', 'dark']) for (const k of ['bg', 'text']) if (/^#[0-9a-f]{6}$/.test(c[side]?.[k])) (col[side] ||= {})[k] = c[side][k];
    if (Object.keys(col).length) out.colours = col;
  }
  return out;
};
const PRESETS = [{ id: 'calm', name: 'Calm', look: { spacing: 'roomy', round: 8 } }];
const KEYS = ['spacing', 'round', 'flat', 'light.bg', 'light.text', 'dark.bg', 'dark.text'];

test('saved themes: keep, match, export and import', () => {
  const s = savedThemes({ lookOf, fileKind: 'demo-themes', presets: PRESETS, keys: ['spacing', 'round', 'flat', 'colours'], max: 3 });
  let list = s.saveMine([], 'Night', { spacing: 'tight', round: 4, other: 1 }, 'dark', 'a1');
  assert.deepEqual(list, [{ id: 'a1', name: 'Night', look: { spacing: 'tight', round: 4 }, mode: 'dark' }]);
  assert.equal(s.matchMine(list, { spacing: 'tight', round: 4 })?.id, 'a1');
  assert.deepEqual(s.minePatch(list[0]), { theme: null, spacing: 'tight', round: 4, flat: null, colours: null });
  const file = s.exportText(list);
  assert.throws(() => s.importText(file.replace('demo-themes', 'other'), []), /No themes/);
  const back = s.importText(file, [{ id: 'b2', name: 'Day', look: {} }]);
  assert.deepEqual(back.list.map(t => t.name), ['Night', 'Day']);
  assert.throws(() => s.saveMine(back.list.concat([{ id: 'c3', name: 'Three', look: {} }]), 'Four', {}), /Up to 3/);
  assert.equal(s.lookNow({ nightTheme: 'calm', spacing: 'tight' }, true).spacing, 'roomy');
  assert.equal(s.lookNow({ nightTheme: 'calm', spacing: 'tight' }, false).spacing, 'tight');
  assert.equal(s.nightRef({ nightTheme: 'mine:a1', myThemes: list })?.name, 'Night');
});

test('theme links: a look goes out and comes back the same', () => {
  const field = (/** @type {string} */ k) => /** @type {any} */ (FIELDS)[k];
  const L = themeLinks({ keys: KEYS, field, lookOf, presets: PRESETS, known: KEYS.length });
  const t = { name: 'Late shift', look: { spacing: 'tight', round: 6, flat: true, colours: { light: { bg: '#fafafa', text: '#101010' }, dark: { bg: '#000000', text: '#ffffff' } } }, mode: 'dark' };
  const link = L.themeLink('https://app.test/', t);
  const hash = link.split('#')[1];
  assert.ok(L.isThemeLink('#' + hash));
  assert.deepEqual(L.themeFromLink('#' + hash), { name: t.name, look: lookOf(t.look), mode: 'dark' });
  const preset = L.themeLink('https://app.test/', { name: 'Calm', look: PRESETS[0].look });
  assert.deepEqual(L.themeFromLink('#' + preset.split('#')[1]), { name: 'Calm', look: lookOf(PRESETS[0].look) });
  assert.ok(preset.length < link.length, 'a bundled theme goes by its id');
  assert.throws(() => L.themeFromLink('#t=3zzz'), Error);
  assert.equal(L.themeFromLink('#x=1'), null);
});
