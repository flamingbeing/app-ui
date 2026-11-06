// Opt-in options added to the core 2 Nov 2026 (all off unless an app asks): hide the tab bar on pushed screens
// (html[data-push-bar="hide"]), the tap menu with a title and nested lists, the slim bar's subtitle, tab swipe off
// through startGestures({ tabs }), the theme list. The list of what is covered is docs/kit-tests.md, "Options".
import { test, expect } from './fixtures.mjs';
import { BASE } from './fixtures.mjs';

test('screens mark how many are pushed (data-depth) and data-push-bar="hide" takes the tab bar off a pushed screen only', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  await expect.poll(() => page.evaluate(() => document.querySelector('.ui-screens')?.getAttribute('data-depth'))).toBe('0');
  await page.evaluate(() => document.documentElement.setAttribute('data-push-bar', 'hide'));
  const bar = page.locator('nav.ui-tabbar');
  const had = await bar.count();
  await page.locator('#plants .ui-row').first().click();
  await expect.poll(() => page.evaluate(() => document.querySelector('.ui-screens')?.getAttribute('data-depth'))).toBe('1');
  if (had) await expect(bar).toBeHidden();
  await page.goBack();
  await expect.poll(() => page.evaluate(() => document.querySelector('.ui-screens')?.getAttribute('data-depth'))).toBe('0');
  if (had) await expect(bar).toBeVisible();
});

test('the tap menu: a title, a nested list with Back, Esc steps out then closes, a pick runs and closes', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  await page.evaluate(async () => {
    const { openMenu } = await import(`${location.origin}/ui/0.0.0-dev/ui/tap-menu.js`);
    window.__picked = [];
    const b = Object.assign(document.createElement('button'), { id: 'tm-anchor', textContent: 'menu' });
    b.style.cssText = 'position:fixed;top:100px;right:20px;z-index:1';
    document.body.append(b);
    b.addEventListener('click', () => openMenu(b, [
      { label: 'Edit', run: () => window.__picked.push('edit') },
      { label: 'Colour', items: [{ label: 'Red', run: () => window.__picked.push('red') }, { label: 'Blue', run: () => window.__picked.push('blue') }] },
    ], { title: 'My Projects' }));
  });
  await page.locator('#tm-anchor').click();
  const menu = page.locator('.ui-menu');
  await expect(menu.locator('.ui-menu-title')).toHaveText('My Projects');
  // the layer (a popover) covers the screen, not the browser's fit-content box that clips the menu inside it
  expect(await page.evaluate(() => { const r = document.querySelector('.ui-menu-layer').getBoundingClientRect(); return [r.width, r.height]; }))
    .toEqual(await page.evaluate(() => [innerWidth, innerHeight]));
  await menu.getByRole('menuitem', { name: 'Colour' }).click();
  await expect(menu.getByRole('menuitem', { name: 'Red' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0);
  await menu.getByRole('menuitem', { name: 'Back' }).click();
  await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Colour' }).click();
  await page.keyboard.press('Escape');   // steps out of the nested list
  await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await page.keyboard.press('Escape');   // closes
  await expect(menu).toHaveCount(0);
  await page.locator('#tm-anchor').click();
  await page.locator('.ui-menu').getByRole('menuitem', { name: 'Colour' }).click();
  await page.locator('.ui-menu').getByRole('menuitem', { name: 'Blue' }).click();
  await expect(page.locator('.ui-menu')).toHaveCount(0);
  expect(await page.evaluate(() => window.__picked)).toEqual(['blue']);
});

test('the bar title shows data-sub under the name, and data-bar="slim" hides a large title whatever the look', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bar', 'slim');
    document.querySelector('.ui-bar-title')?.setAttribute('data-sub', '5 tasks');
  });
  const sub = await page.evaluate(() => getComputedStyle(document.querySelector('.ui-bar-title'), '::after').content);
  expect(sub).toContain('5 tasks');
  const big = await page.locator('.ui-large-title').first().boundingBox();
  expect(big.width).toBeLessThanOrEqual(2);
});

test('the theme list: a switch for Sync with system, a tick on the picked style, a pick changes the style', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  await page.evaluate(async () => {
    const { themeList } = await import(`${location.origin}/ui/0.0.0-dev/theme/index.js`);
    const host = Object.assign(document.createElement('div'), { id: 'tl' });
    document.body.append(host);
    themeList(host);
  });
  const list = page.locator('#tl');
  const sync = list.getByRole('switch');
  await expect(sync).toBeChecked();
  await list.getByRole('radio', { name: /^Flat/ }).click();
  await expect(list.getByRole('radio', { name: /^Flat/ })).toHaveAttribute('aria-checked', 'true');
  await expect(list.locator('.theme-tick')).toHaveCount(1);
  await sync.evaluate(el => el.click());
  await expect(sync).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).not.toBe('auto');
});

test('the settings screen: a { heading } row is a small title with no control; about.rows adds a link and a button to About', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/settings/`);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  const sub = page.locator('.ui-setting-subhead');
  await expect(sub).toHaveText('Daily');
  await expect(sub.locator('input, button')).toHaveCount(0);
  await expect(page.locator('.ui-setting', { hasText: 'Watering reminders' })).toBeVisible();
  const about = page.locator('.ui-about-extra');
  await expect(about).toHaveCount(2);
  await expect(about.first().locator('a')).toHaveAttribute('href', '#privacy');
  await about.nth(1).getByRole('button', { name: 'Rate' }).click();
  expect(await page.evaluate(() => window.kit.rated)).toBe(true);
});
