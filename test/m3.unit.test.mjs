// Material 3 colour (theme/m3.js) for the Android look: tones land on their L*, roles sit at Material's tones, the
// palette the page gets passes every contrast floor in light, dark and OLED, and only look M takes it.
// node --test test/m3.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { oklch, toneOf, toneColour, tonalPalettes, roles, m3Palette } from '../theme/m3.js';
import { checkPalette, contrast, STATUS } from '../theme/colour.js';
import { palettes, paletteCss } from '../theme/palette-css.js';

const SEEDS = ['#6750a4', '#3a6390', '#1b6e3a', '#b3261e', '#f5c400', '#00a0b0', '#888888', '#000000', '#ffffff'];

test('a tone is its CIELAB L*, whatever the hue, and fits in sRGB', () => {
  for (const hue of [0, 27, 90, 145, 200, 265, 300]) {
    for (const tone of [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99]) {
      const c = toneColour(hue, 0.105, tone);
      assert.match(c, /^#[0-9a-f]{6}$/);
      assert.ok(Math.abs(toneOf(c) - tone) < 0.75, `hue ${hue} tone ${tone}: ${c} is L* ${toneOf(c).toFixed(2)}`);
    }
  }
  assert.equal(toneColour(200, 0.1, 0), '#000000');
  assert.equal(toneColour(200, 0.1, 100), '#ffffff');
});

test('the seed keeps its hue; tertiary turns 60 degrees; neutrals are near grey', () => {
  const [, , h] = oklch('#3a6390');
  const p = tonalPalettes('#3a6390');
  const hueOf = (/** @type {string} */ c) => oklch(c)[2];
  assert.ok(Math.abs(hueOf(p.primary(40)) - h) < 4, 'primary at the seed hue');
  assert.ok(Math.abs(((hueOf(p.tertiary(40)) - h + 360) % 360) - 60) < 6, 'tertiary 60 degrees on');
  assert.ok(oklch(p.neutral(50))[1] < 0.02, 'neutral nearly grey');
  assert.ok(oklch(p.primary(50))[1] > oklch(p.secondary(50))[1], 'secondary quieter than primary');
});

test("Material's baseline seed comes out near Material's own baseline colours", () => {
  const l = roles('#6750a4', false), d = roles('#6750a4', true);
  // (Material's: primary #6750A4, primary container #EADDFF, dark primary #D0BCFF, dark surface #141218)
  const near = (/** @type {string} */ a, /** @type {string} */ b) => contrast(a, b) < 1.12;
  assert.ok(near(l.primary, '#6750a4'), l.primary);
  assert.ok(near(l['primary-container'], '#eaddff'), l['primary-container']);
  assert.ok(near(d.primary, '#d0bcff'), d.primary);
  assert.ok(near(d.surface, '#141218'), d.surface);
});

test('roles at their tones: on-colours read on their colours (4.5:1), containers lighter in light, darker in dark', () => {
  for (const seed of SEEDS) {
    for (const dark of [false, true]) {
      const r = roles(seed, dark);
      for (const k of ['primary', 'secondary', 'tertiary', 'error']) {
        assert.ok(contrast(r[`on-${k}`], r[k]) >= 4.5, `${seed} ${dark ? 'dark' : 'light'} on-${k}`);
        assert.ok(contrast(r[`on-${k}-container`], r[`${k}-container`]) >= 4.5, `${seed} on-${k}-container`);
      }
      assert.ok(contrast(r['on-surface'], r.surface) >= 7, `${seed} text`);
      assert.ok(contrast(r['on-surface-variant'], r['surface-container-highest']) >= 4.5, `${seed} muted on the highest container`);
      const t = (/** @type {string} */ k) => toneOf(r[k]);
      const order = ['surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest'];
      for (let i = 1; i < order.length; i++) assert.ok(dark ? t(order[i]) > t(order[i - 1]) : t(order[i]) < t(order[i - 1]), `${seed} ${order[i]}`);
    }
  }
});

test('the page palette from Material roles passes every floor, light, dark and OLED, and carries the m3-* roles', () => {
  for (const seed of SEEDS) {
    for (const dark of ['dark', 'oled']) {
      const { light, dark: d } = palettes({ look: 'm', accent: seed, dark });
      assert.deepEqual(checkPalette(light), [], `${seed} light`);
      assert.deepEqual(checkPalette(d), [], `${seed} ${dark}`);
      assert.ok(light['m3-primary-container'] && d['m3-surface-container-high'], 'roles carried');
    }
  }
  const oled = m3Palette('#3a6390', { dark: true, oled: true, status: STATUS.dark });
  assert.equal(oled.bg, '#000000');
});

test('only look M takes Material colour: the other looks keep their palettes', () => {
  const choice = { accent: '#3a6390' };
  assert.equal(palettes({ ...choice, look: 'a' }).light['m3-primary'], undefined);
  assert.notEqual(palettes({ ...choice, look: 'm' }).light.bg, palettes({ ...choice, look: 'a' }).light.bg);
  assert.match(paletteCss({ ...choice, look: 'm' }), /--m3-secondary-container: #[0-9a-f]{6};/);
  assert.doesNotMatch(paletteCss({ ...choice, look: 'd' }), /--m3-/);
  assert.match(paletteCss({}, { look: 'm' }), /--m3-primary:/, "an app's own look M gets it too");
});
