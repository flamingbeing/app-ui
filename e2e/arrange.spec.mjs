// The settings menu and arrange tabs (/kit/settings/?menu): settingsScreen's menu (search, a row per page, Back closes
// a page) and tabArranger over a made-up tab bar. The list of what is covered is docs/kit-tests.md, "Settings menu".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const PAGE = '/ui/0.0.0-dev/kit/settings/?menu';
const shown = page => page.locator('.kit-tabs-preview > .kit-tab:not([data-off-bar])').allTextContents();

test('the menu: a row per page under its group; a row opens its page; Back and the Back button go to the menu', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  const menu = page.locator('.ui-settings-menu');
  expect(await menu.locator('.ui-settings-title').allTextContents()).toEqual(['Your plants', 'This device', 'This app']);
  await expect(page.locator('.ui-settings-group:not([hidden])')).toHaveCount(0);
  expect(await AxeBuilder(page)).toEqual([]);
  await menu.getByRole('button', { name: /Reminders/ }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator('.ui-setting', { hasText: 'Watering reminders' })).toBeVisible();
  await page.goBack();
  await expect(menu).toBeVisible();
  await expect(page.locator('.ui-setting', { hasText: 'Watering reminders' })).toBeHidden();
  await menu.getByRole('button', { name: /Settings file/ }).click();
  await page.locator('.ui-settings-group:not([hidden]) .ui-settings-back').click();
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('search finds a row on its page and opens it there', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('remind at');
  const hit = page.locator('.ui-settings-results .ui-settings-go');
  await expect(hit).toHaveCount(1);
  await expect(hit).toContainText('Reminders');
  await hit.click();
  await expect(page.locator('.ui-setting', { hasText: 'Remind at' })).toBeVisible();
  await page.goBack();
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('zzz');
  await expect(page.getByText('No setting matches')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('arrange');
  await expect(page.locator('.ui-settings-results .ui-settings-go')).toContainText('Tab bar');
});

test('arrange tabs: move, take off, a full bar asks which tab it replaces; kept after reload', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  await page.locator('.ui-settings-menu').getByRole('button', { name: /Tab bar/ }).click();
  expect(await shown(page)).toEqual(['Plants', 'Rooms', 'Calendar', 'Settings']);
  await page.getByRole('button', { name: 'Move down: Plants' }).click();
  expect(await shown(page)).toEqual(['Rooms', 'Plants', 'Calendar', 'Settings']);
  await page.getByRole('switch', { name: 'On the tab bar: Calendar' }).click();
  expect(await shown(page)).toEqual(['Rooms', 'Plants', 'Settings']);
  await expect(page.getByRole('switch', { name: 'On the tab bar: Settings' })).toBeDisabled();
  await page.getByRole('switch', { name: 'On the tab bar: Shop' }).click();
  await page.getByRole('switch', { name: 'On the tab bar: Diary' }).click();
  const ask = page.getByRole('group', { name: 'The tab bar holds 4 tabs.' });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'Rooms' }).click();
  expect(await shown(page)).toEqual(['Diary', 'Plants', 'Shop', 'Settings']);
  expect(await AxeBuilder(page)).toEqual([]);
  await page.reload();
  await page.locator('.ui-settings-menu').getByRole('button', { name: /Tab bar/ }).click();
  expect(await shown(page)).toEqual(['Diary', 'Plants', 'Shop', 'Settings']);
});
