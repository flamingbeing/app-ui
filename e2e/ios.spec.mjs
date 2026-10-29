// The iOS look's gallery (kit/ios/) in Chromium and WebKit (the stand-in for an iPhone): the segmented control's thumb
// slides; the switch, the large title and the sheet's detents; axe in light and dark. The list is docs/kit-tests.md,
// "iOS look".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const IOS = '/ui/0.0.0-dev/kit/ios/';

/** the page, once its gestures have started */
async function load(phone) {
  const page = await phone();
  await page.goto(IOS);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  return { page };
}

test('the segmented control: its thumb slides to the pick and the rows filter; the switch turns green; the title folds into the bar', async ({ phone }) => {
  const { page } = await load(phone);
  const thumb = () => page.locator('#show').evaluate(e => new DOMMatrix(getComputedStyle(e, '::before').transform).m41);
  expect(await thumb()).toBe(0);
  await page.locator('#show label', { hasText: 'Due' }).click();
  await expect.poll(thumb, 'one segment along').toBeGreaterThan(100);
  await expect(page.locator('#todo > li:not([hidden])')).toHaveCount(2);
  await page.locator('#show label', { hasText: 'All' }).click();
  await expect(page.locator('#todo > li:not([hidden])')).toHaveCount(5);
  const feeding = page.locator('#reminders .ui-switch').nth(1);
  await feeding.click();
  await expect(feeding).toBeChecked();
  await expect.poll(() => feeding.evaluate(e => getComputedStyle(e).backgroundColor)).toMatch(/rgb\(52, 199, 89\)|rgb\(48, 209, 88\)/);
  await page.evaluate(() => scrollTo(0, 300));
  await expect(page.locator('.ui-bar')).toHaveClass(/is-collapsed/);
});

test('the sheet opens at its half detent from Add, the grabber takes it to full; Done closes it', async ({ phone }) => {
  const { page } = await load(phone);
  await page.locator('#add').click();
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await page.locator('#sheet .ui-sheet-grabber').click();
  await expect(sheet).toHaveAttribute('data-detent', 'large');
  await page.locator('#sheet .ui-sheet-head .ui-primary').click();
  await expect(sheet).not.toHaveAttribute('open', '');
});

for (const scheme of ['light', 'dark']) {
  test(`axe, ${scheme}: the page and the sheet`, async ({ phone }) => {
    const { page } = await load(phone);
    await page.emulateMedia({ colorScheme: scheme });
    expect(await AxeBuilder(page), 'the page').toEqual([]);
    await page.locator('#add').click();
    expect(await AxeBuilder(page, { within: '#sheet' }), 'the sheet').toEqual([]);
  });
}
