// The on-screen keyboard (ui/keyboard.js) on /kit/shell/ at 390 px, in Chromium and WebKit. No browser here shows a
// real keyboard, so it is played: with interactive-widget=resizes-content the page shrinks to the space above it (the
// viewport is made shorter); without it only the visible part shrinks (a stand-in visualViewport). The list is
// docs/kit-tests.md, "Keyboard".
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/';
const open = page => page.evaluate(() => document.documentElement.classList.contains('ui-keyboard-open'));
const lift = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-keyboard-h').trim());

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
  const box = await page.locator('#sheet').boundingBox();
  expect(Math.round(box.y + box.height), 'lifted to the keyboard’s top').toBe(500);
  await page.evaluate(() => document.activeElement.blur());
  await expect.poll(() => open(page)).toBe(false);
  expect(await lift(page)).toBe('0px');
});
