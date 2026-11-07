// A single-pane shell's menu button (e2e/pages/side-menu.html, as the Trips app): from 600 px it hides and shows the
// side bar (the bar and screens take the room, kept over a reload); on a phone it still opens the drawer. docs/kit-tests.md.
import { test, expect } from './fixtures.mjs';

const PAGE = '/test/side-menu.html';
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
async function load(sized, width) {
  const page = await sized(width);
  await page.goto(PAGE);
  await expect.poll(() => page.evaluate(() => !!window.app)).toBe(true);
  return page;
}

for (const width of [700, 1280]) {
  test(`at ${width} px the menu button hides and shows the side bar, kept over a reload`, async ({ sized }) => {
    const page = await load(sized, width);
    const menu = page.locator('#menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const before = await page.locator('.ui-bar').boundingBox();
    await menu.click();
    await expect(page.locator('html')).toHaveAttribute('data-side-hidden', '');
    await settled(page);
    await expect(page.locator('.ui-sidebar')).toBeHidden();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    const after = await page.locator('.ui-bar').boundingBox();
    expect(after.x).toBeLessThan(2);
    expect(after.width).toBeGreaterThan(before.width + 100);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!window.app)).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-side-hidden', '');
    await expect(page.locator('.ui-sidebar')).toBeHidden();
    await page.locator('#menu').click();
    await settled(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-side-hidden');
    await expect(page.locator('.ui-sidebar')).toBeVisible();
    await expect(page.locator('#menu')).toHaveAttribute('aria-expanded', 'true');
  });
}

test('at 390 px the menu button still opens the drawer, and nothing is hidden or kept', async ({ sized }) => {
  const page = await load(sized, 390);
  await page.locator('#menu').click();
  await expect(page.locator('.ui-shell')).toHaveClass(/is-drawer-open/);
  await expect(page.locator('html')).not.toHaveAttribute('data-side-hidden');
  expect(await page.evaluate(() => localStorage.getItem('ui-side-hidden'))).toBeNull();
});
