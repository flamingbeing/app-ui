// The settings screen gallery (/kit/settings/): ui/settings-screen.js on a made-up plant app's options, held by a
// stand-in for @core/settings on the page. The list of what is covered is docs/kit-tests.md, "Settings screen".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const PAGE = '/ui/0.0.0-dev/kit/settings/';
const get = (page, key) => page.evaluate(k => window.kit.settings.get(k), key);
const row = (page, label) => page.locator('.ui-setting', { hasText: label });

for (const width of [390, 1280]) {
  for (const look of ['a', 'b', 'c']) {
    test(`at ${width} px look ${look}: grouped rows, one level-1 heading, axe clean, nothing wider than the screen`, async ({ sized }) => {
      const page = await sized(width);
      await page.goto(`${PAGE}?look=${look}`);
      await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
      expect(await page.locator('.ui-settings-title').allTextContents())
        .toEqual(['Profile', 'Plants', 'Reminders', 'This device', 'Settings file']);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.ui-settings .theme-switch')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const c of await page.locator('.ui-setting select, .ui-setting input:not([hidden]), .ui-setting button').all())
        expect((await c.boundingBox()).height).toBeGreaterThanOrEqual(24);
      expect(await AxeBuilder(page)).toEqual([]);
    });
  }
}

test('a switch, a choice and a number save to the settings and show what is in force; kept after reload', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  const sw = row(page, 'Watering reminders').locator('input[role=switch]');
  await expect(sw).toBeChecked();
  await row(page, 'Watering reminders').locator('label').click();   // the whole row's label flips it
  await expect(sw).not.toBeChecked();
  expect(await get(page, 'reminders')).toBe(false);
  await row(page, 'Sort the list by').locator('select').selectOption({ label: 'Room' });
  expect(await get(page, 'sort')).toBe('room');
  const hour = row(page, 'Remind at').locator('input');
  await hour.fill('19');
  await hour.press('Enter');
  await expect.poll(() => get(page, 'reminderHour')).toBe(19);
  await page.reload();
  await expect(row(page, 'Watering reminders').locator('input')).not.toBeChecked();
  await expect(row(page, 'Sort the list by').locator('select option:checked')).toHaveText('Room');
  await expect(row(page, 'Remind at').locator('input')).toHaveValue('19');
});

test('a refused value says why and the control shows the value in force again', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  const hour = row(page, 'Remind at').locator('input');
  await hour.fill('30');
  await hour.press('Enter');
  await expect(page.locator('.ui-settings-status')).toHaveText('Pick an hour from 0 to 23');
  await expect(page.locator('.ui-settings-status')).toHaveClass(/error/);
  await expect(hour).toHaveValue('8');
  expect(await get(page, 'reminderHour')).toBe(8);
  await hour.fill('6');
  await hour.press('Enter');
  await expect(page.locator('.ui-settings-status')).toHaveText('');
});

test('a profile sets its own defaults; a change by hand shows the note; picking it again clears it', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  const pick = row(page, 'Start from').locator('select');
  const note = row(page, 'Start from').locator('.ui-row-sub');
  await expect(note).toBeHidden();
  await pick.selectOption({ label: 'Office plants' });
  await expect(row(page, 'Sort the list by').locator('select option:checked')).toHaveText('Name');
  await expect(row(page, 'Watering reminders').locator('input')).not.toBeChecked();
  await expect(note).toBeHidden();
  await row(page, 'Sort the list by').locator('select').selectOption({ label: 'Next watering' });
  await expect(note).toHaveText('Changed by hand from the profile');
  await expect(note).toBeVisible();
  await pick.selectOption({ label: 'Balcony garden' });
  await expect(note).toBeHidden();
  await expect(row(page, 'Sort the list by').locator('select option:checked')).toHaveText('Room');
  await expect(row(page, 'Remind at').locator('input')).toHaveValue('7');
});

test('a change made elsewhere (another device, the app) shows at once', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  await page.evaluate(() => window.kit.settings.set('units', 'imperial'));
  await expect(row(page, 'Units').locator('select option:checked')).toHaveText('Cups and inches');
  await page.evaluate(() => window.kit.settings.set('photos', true));
  await expect(row(page, 'Keep photos').locator('input')).toBeChecked();
});

test('the settings file: Export downloads it (account options only); Import says what changed or why not', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  await page.evaluate(() => Promise.all([window.kit.settings.set('units', 'imperial'), window.kit.settings.set('photos', true)]));
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
  expect(download.suggestedFilename()).toBe('plants-settings.json');
  const file = JSON.parse(await (await download.createReadStream()).toArray().then(b => Buffer.concat(b).toString()));
  expect(file.settings).toEqual({ units: 'imperial' });   // photos stays on the device

  const input = page.locator('.ui-setting-buttons input[type=file]');
  const put = (name, text) => input.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  const status = page.locator('.ui-settings-status');
  await put('s.json', JSON.stringify({ kind: 'core-settings', version: 1, settings: { sort: 'name', reminders: false, colour: 'red' } }));
  await expect(status).toHaveText('Imported: 2 changes, 1 left out');
  await expect(row(page, 'Sort the list by').locator('select option:checked')).toHaveText('Name');
  await expect(row(page, 'Watering reminders').locator('input')).not.toBeChecked();
  await put('s.json', JSON.stringify({ kind: 'core-settings', version: 1, settings: { sort: 'name' } }));
  await expect(status).toHaveText('Nothing to change');
  await put('notes.txt', 'not json');
  await expect(status).toHaveText('That isn’t a settings file (not JSON)');
  await expect(status).toHaveClass(/error/);
});

test('the switch: keyboard flips it, it is named by its row, and Less motion stills it', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PAGE);
  const sw = page.getByRole('switch', { name: /Keep photos on this phone/ });
  await sw.focus();
  await page.keyboard.press('Space');
  await expect(sw).toBeChecked();
  expect(await get(page, 'photos')).toBe(true);
  expect(await sw.evaluate(e => getComputedStyle(e).transitionDuration)).not.toBe('0s');
  await page.evaluate(() => { document.documentElement.dataset.motion = 'still'; });
  expect(await sw.evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s');
});
