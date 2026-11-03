// The on-screen keyboard (ui/keyboard.js) on /kit/shell/ at 390 px, in Chromium and WebKit. No browser here shows a
// real keyboard, so it is played: with interactive-widget=resizes-content the page shrinks to the space above it (the
// viewport is made shorter); without it only the visible part shrinks (a stand-in visualViewport). The list is
// docs/kit-tests.md, "Keyboard".
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/';
const open = page => page.evaluate(() => document.documentElement.classList.contains('ui-keyboard-open'));
const lift = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-keyboard-h').trim());
// the sheet glides onto the keyboard's top (rc.87): measure where it lands
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));

async function sheetField(page) {
  await page.goto(SHELL);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  await page.locator('nav.ui-tabbar [data-open-sheet="#sheet"]').tap();
  await expect(page.locator('#sheet')).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  await page.locator('#sheet-name').tap();
  await expect(page.locator('#sheet-name')).toBeFocused();
}

test('resizes-content: a tapped field and a page 344 px shorter: keyboard open, the tab bar hides, the sheet fits above; gone again after', async ({ sized }) => {
  const page = await sized(390);
  await sheetField(page);
  expect(await open(page), 'a field alone is no keyboard').toBe(false);
  await page.setViewportSize({ width: 390, height: 500 });
  await expect.poll(() => open(page)).toBe(true);
  expect(await lift(page), 'the page already shrank: nothing to lift').toBe('0px');
  await expect(page.locator('nav.ui-tabbar')).toBeHidden();
  await settled(page);
  const box = await page.locator('#sheet').boundingBox();
  expect(box.y + box.height, 'the sheet sits on the keyboard').toBeLessThanOrEqual(501);
  expect(box.y).toBeGreaterThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => open(page)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('nav.ui-tabbar')).toBeVisible();
});

test('only the visible part shrinks (no resizes-content): --ui-keyboard-h lifts the sheet over the keyboard; a blur ends it', async ({ sized }) => {
  const page = await sized(390);
  // a stand-in visual viewport the page sizes (each read is live, as the real one is)
  await page.context().addInitScript(() => {
    const vv = new EventTarget();
    Object.assign(vv, { height: innerHeight, offsetTop: 0, width: innerWidth, scale: 1 });
    Object.defineProperty(vv, 'height', { get: () => window.__vvh ?? innerHeight });
    Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
    window.__vv = h => { window.__vvh = h; vv.dispatchEvent(new Event('resize')); };
  });
  await sheetField(page);
  await page.evaluate(() => window.__vv(500));
  await expect.poll(() => open(page)).toBe(true);
  expect(await lift(page)).toBe('344px');
  await settled(page);
  const box = await page.locator('#sheet').boundingBox();
  expect(Math.round(box.y + box.height), 'lifted to the keyboard’s top').toBe(500);
  await page.evaluate(() => document.activeElement.blur());
  await expect.poll(() => open(page)).toBe(false);
  expect(await lift(page)).toBe('0px');
});

test('the sheet rides on the keyboard (rc.87): from its old bottom to the keyboard\'s top over 190 ms by translate, and back down on close; Reduce Motion: at once', async ({ sized }) => {
  const page = await sized(390);
  await page.context().addInitScript(() => {
    const vv = new EventTarget();
    Object.assign(vv, { height: innerHeight, offsetTop: 0, width: innerWidth, scale: 1 });
    Object.defineProperty(vv, 'height', { get: () => window.__vvh ?? innerHeight });
    Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
    window.__vv = h => { window.__vvh = h; vv.dispatchEvent(new Event('resize')); };
  });
  await sheetField(page);
  const play = h => page.evaluate(async h => {
    const s = document.querySelector('#sheet'), frame = () => new Promise(res => requestAnimationFrame(() => res(undefined)));
    const from = s.getBoundingClientRect().bottom;
    window.__vv(h);
    const t0 = performance.now(), bottoms = [];
    while (performance.now() - t0 < 320) { bottoms.push(Math.round(s.getBoundingClientRect().bottom)); await frame(); }
    return { from: Math.round(from), bottoms, translate: getComputedStyle(s).translate };
  }, h);
  const up = await play(500);
  expect(up.from).toBeGreaterThan(700);
  expect(up.bottoms[up.bottoms.length - 1]).toBe(500);
  const moving = up.bottoms.filter(b => b < up.from - 1 && b > 501);
  expect(moving.length, `glides over several frames: ${up.bottoms.join(',')}`).toBeGreaterThanOrEqual(8);
  expect(up.bottoms.every((b, i) => !i || b <= up.bottoms[i - 1]), 'never back down on the way up').toBe(true);
  expect(up.translate === 'none' || up.translate === '0px', 'nothing left over').toBe(true);
  const down = await page.evaluate(async () => {
    const s = document.querySelector('#sheet'), frame = () => new Promise(res => requestAnimationFrame(() => res(undefined)));
    document.activeElement.blur();
    window.__vv(innerHeight);
    const t0 = performance.now(), bottoms = [];
    while (performance.now() - t0 < 320) { bottoms.push(Math.round(s.getBoundingClientRect().bottom)); await frame(); }
    return bottoms;
  });
  expect(down[down.length - 1]).toBe(up.from);
  expect(down.filter(b => b > 501 && b < up.from - 1).length, `drops with it: ${down.join(',')}`).toBeGreaterThanOrEqual(5);
  // Reduce Motion: no glide
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#sheet-name').tap();
  const still = await play(500);
  expect(still.bottoms[0]).toBe(500);
});
