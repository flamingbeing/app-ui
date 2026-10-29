// The Android look (look M, data-family="android"; ui/gestures/android.css) on the /kit/ gallery at phone width: Material
// colour roles from the accent, the Roboto stack, the top app bar's tone on scroll, the navigation bar's pill, the
// switch, the sheet's handle, the action button; axe in light and dark. Moves are transform and opacity only (the
// jank gate times them). The list is docs/kit-tests.md, "Android look".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';
import { fromDemo } from './demo.mjs';

const KIT = '/ui/0.0.0-dev/kit/?edge=always&look=m';
const PARTS = '/ui/0.0.0-dev/kit/parts/?look=m';
const settled = page => page.evaluate(async () => {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {})));
});
/** @param {import('@playwright/test').Page} page @param {string} sel @param {string} prop @param {string} [pseudo] */
const style = (page, sel, prop, pseudo) => page.locator(sel).first().evaluate((e, [p, ps]) => getComputedStyle(e, ps).getPropertyValue(p), [prop, pseudo]);
const token = (page, name) => page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

for (const scheme of ['light', 'dark']) {
  test(`Android look, ${scheme}: Material roles, Roboto first, the bar, the navigation pill, clean (axe)`, async ({ sized }) => {
    const page = await sized(390);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(KIT);
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-family', 'android');
    // the roles are there, and the accent is the primary
    for (const r of ['--m3-primary', '--m3-on-primary', '--m3-secondary-container', '--m3-surface-container', '--m3-outline'])
      expect(await token(page, r), r).toMatch(/^#[0-9a-f]{6}$/);
    expect(await token(page, '--accent')).toBe(await token(page, '--m3-primary'));
    expect(await style(page, 'body', 'font-family')).toMatch(/^"Roboto Flex", Roboto/);
    // no glass anywhere: solid bars
    expect(await style(page, '.ui-tabbar', 'backdrop-filter')).toBe('none');
    // the navigation bar: 80 px at the edge, a pill on the current tab only, shown by opacity and transform
    const bar = await page.locator('.ui-tabbar').boundingBox();
    expect(bar.height).toBeGreaterThanOrEqual(80);
    const cur = '.ui-tabbar .ui-tab[aria-current="page"]', other = '.ui-tabbar .ui-tab:not([aria-current="page"]):not(.ui-tab-action)';
    await settled(page);
    expect(await style(page, cur, 'opacity', '::before')).toBe('1');
    expect(await style(page, other, 'opacity', '::before')).toBe('0');
    expect(await style(page, cur, 'transition-property', '::before')).toMatch(/^(opacity|transform)(, (opacity|transform))*$/);
    // the top app bar takes its tone when the page scrolls under it, by its layer's opacity
    expect(await style(page, '.ui-bar', 'opacity', '::before')).toBe('0');
    await page.mouse.wheel(0, 400);
    await expect(page.locator('.ui-bar')).toHaveClass(/is-collapsed/);
    await settled(page);
    expect(await style(page, '.ui-bar', 'opacity', '::before')).toBe('1');
    await page.evaluate(() => scrollTo(0, 0));
    await settled(page);
    expect(await AxeBuilder(page), `Android ${scheme}`).toEqual([]);
  });
}

test('Android look: the sheet has a 32 x 4 handle and 28 px corners; the hold menu has 16 px corners', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(KIT);
  await fromDemo(page, '#open-sheet');
  const sheet = page.locator('dialog.ui-sheet[open]').first();
  await expect(sheet).toBeVisible();
  await settled(page);
  const handle = await sheet.locator('.ui-sheet-grabber').evaluate(e => { const s = getComputedStyle(e, '::before'); return [s.width, s.height]; });
  expect(handle).toEqual(['32px', '4px']);
  expect(await sheet.evaluate(e => getComputedStyle(e).borderTopLeftRadius)).toBe('28px');
  expect(await AxeBuilder(page, { within: 'dialog.ui-sheet[open]' })).toEqual([]);
});

test('Android look: the switch is Material\'s (52 x 32, the thumb grows when on), the action button a rounded square at the bottom end', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PARTS);
  const on = page.locator('#water'), off = page.locator('#frost');
  const box = await on.boundingBox();
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([52, 32]);
  await settled(page);
  const scale = async l => l.evaluate(e => new DOMMatrix(getComputedStyle(e, '::before').transform).a);
  expect(await scale(on)).toBeGreaterThan(await scale(off));
  expect(await on.evaluate(e => getComputedStyle(e, '::before').transitionProperty)).toMatch(/^(transform|background-color|opacity)(, (transform|background-color|opacity))*$/);
  await off.click();
  await expect(off).toBeChecked();
  const fab = page.locator('#fab');
  await expect(fab).toBeVisible();
  expect(await fab.evaluate(e => getComputedStyle(e).borderTopLeftRadius)).toBe('16px');
  expect(await fab.evaluate(e => getComputedStyle(e).backgroundColor)).toBe(await page.evaluate(() => {
    const d = document.createElement('div'); d.style.color = getComputedStyle(document.documentElement).getPropertyValue('--m3-primary-container');
    document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c;
  }));
  const fb = await fab.boundingBox();
  expect(fb.x + fb.width).toBeGreaterThan(390 - 40);
  expect(await AxeBuilder(page, { within: '#fab-title + p + ul' })).toEqual([]);
  await page.locator('#fab-title').scrollIntoViewIfNeeded();
  expect(await AxeBuilder(page, { within: '#fab' })).toEqual([]);
});

test('every other look keeps the core family: no Material marks, no m3 tokens', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/ui/0.0.0-dev/kit/?edge=always');
  await expect(page.locator('html')).toHaveAttribute('data-family', 'core');
  expect(await token(page, '--m3-primary')).toBe('');
  expect(await style(page, 'body', 'font-family')).not.toMatch(/Roboto Flex/);
});

test('the action button in the default look: 56 px at the bottom end, with room under the page for it', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/ui/0.0.0-dev/kit/parts/');
  const fab = await page.locator('#fab').boundingBox();
  expect(Math.round(fab.height)).toBe(56);
  expect(fab.x + fab.width).toBeGreaterThan(390 - 40);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const last = await page.locator('#frost-row').boundingBox();
  const now = await page.locator('#fab').boundingBox();
  expect(last.y + last.height, 'the last row clear of the button').toBeLessThanOrEqual(now.y);
});
