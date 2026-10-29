// Press Back again to close (ui/tab-back.js, by tabPages on the kit's app shell): the first Back on the first tab stays
// and says so in a toast; a second within 2 s leaves; sheets and pushed screens still close first. Chromium and WebKit.
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';
const shown = page => page.evaluate(() => [...document.querySelectorAll('.ui-screens > .ui-screen')].filter(s => !s.hidden).map(s => s.id));
const len = page => page.evaluate(() => history.length);
const toast = page => page.locator('.toasts .toast', { hasText: 'Press Back again to close' });
const tab = (page, name) => page.locator('nav.ui-tabbar .ui-tab', { hasText: name }).dispatchEvent('click');
async function load(sized, reducedMotion = 'no-preference') {
  const page = await sized(390);
  await page.emulateMedia({ reducedMotion });
  await page.goto(SHELL);
  await expect.poll(() => shown(page)).toEqual(['home']);
  return page;
}
// Back as the phone's own button: the page's history goes one step (WebKit lands the popstate a little later)
const back = page => page.evaluate(() => new Promise(r => { addEventListener('popstate', () => setTimeout(r, 50), { once: true }); history.back(); }));

for (const motion of ['no-preference', 'reduce']) {
  test(`the first Back on the first tab stays and says so once; a second within 2 s leaves (motion ${motion})`, async ({ sized }) => {
    const page = await load(sized, motion);
    const start = await len(page);
    expect(await page.evaluate(() => history.state?.uiTabGuard), 'one guard entry at the start').toBe(1);
    const url = page.url();
    await back(page);
    await expect(toast(page)).toHaveCount(1);
    expect(page.url()).toBe(url);
    expect(await shown(page)).toEqual(['home']);
    expect(await len(page), 'no entry added').toBe(start);
    await page.goBack();
    await expect.poll(() => page.url(), 'the second Back leaves').not.toBe(url);
  });
}

test('after 2 s the guard is back: Back stays again, one toast at a time, and the entry count stays put', async ({ sized }) => {
  const page = await load(sized);
  const start = await len(page);
  await back(page);
  await expect(toast(page)).toHaveCount(1);
  await page.waitForTimeout(2300);
  await expect.poll(() => page.evaluate(() => history.state?.uiTabGuard)).toBe(1);
  expect(await len(page)).toBe(start);
  await back(page);
  await expect(toast(page)).toHaveCount(1);
  expect(await page.evaluate(() => location.pathname)).toContain('/kit/shell/');
});

test('Back on another tab goes to the first with no toast; the next Back asks; tabs add one entry at most', async ({ sized }) => {
  const page = await load(sized);
  const start = await len(page);
  await tab(page, 'Rooms');
  await expect.poll(() => shown(page)).toEqual(['rooms']);
  await tab(page, 'Jobs');
  await expect.poll(() => shown(page)).toEqual(['jobs']);
  expect(await len(page)).toBe(start + 1);
  await back(page);
  await expect.poll(() => shown(page)).toEqual(['home']);
  await expect(toast(page)).toHaveCount(0);
  await back(page);
  await expect(toast(page)).toHaveCount(1);
});

test('a sheet and a pushed screen still close first with Back, with no toast', async ({ sized }) => {
  const page = await load(sized);
  // the New sheet (the tab bar's centre action)
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'New' }).click();
  await expect(page.locator('#sheet')).toHaveAttribute('open', '');
  await back(page);
  await expect(page.locator('#sheet')).not.toHaveAttribute('open', '');
  await expect(toast(page)).toHaveCount(0);
  // a pushed screen (a plant's detail)
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await back(page);
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(0);
  await expect(toast(page)).toHaveCount(0);
  await back(page);
  await expect(toast(page)).toHaveCount(1);
});

test('after a reload on the first tab: still one guard, and Back still asks first', async ({ sized }) => {
  const page = await load(sized);
  const start = await len(page);
  await page.reload();
  await expect.poll(() => shown(page)).toEqual(['home']);
  expect(await len(page), 'no second guard').toBe(start);
  await back(page);
  await expect(toast(page)).toHaveCount(1);
});
