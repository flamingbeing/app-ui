// The gallery's demo controls (look, density, Still, sync state, Open the sheet, Push a screen) live in one sheet
// behind the bar's Demo controls button (#demo): open it before using one.
import { expect } from './fixtures.mjs';

/** @param {import('@playwright/test').Page} page */
const still = page => page.evaluate(async () => {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {})));
});
/** Open the demo sheet and wait for it to come to rest. @param {import('@playwright/test').Page} page */
export async function openDemo(page) {
  await page.click('#demo');
  await expect(page.locator('#demo-sheet')).toBeVisible();
  await still(page);
}
/** @param {import('@playwright/test').Page} page */
export async function closeDemo(page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('#demo-sheet')).toBeHidden();
}
/** Press a demo button: the demo sheet closes first, then what the button opens follows.
 * @param {import('@playwright/test').Page} page @param {string} sel */
export async function fromDemo(page, sel) {
  await openDemo(page);
  await page.click(sel);
  await expect(page.locator('#demo-sheet')).toBeHidden();
  if (sel === '#open-sheet') await expect(page.locator('#sheet')).toBeVisible();
}
