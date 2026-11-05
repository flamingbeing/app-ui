// Share this screen (shareLink, qrSheet) and ask first (askFirst) on the /kit/parts/ gallery: the QR sheet draws a
// code once the encoder has loaded, Copy link says so in the sheet, and the sheet goes once closed; ask first answers
// at once when the browser already allows, shows the app's reason otherwise, keeps Not now, asks the browser on
// Allow and says how to turn a blocked one back on. docs/kit-tests.md, "Share this screen" and "Ask first".
import AxeBuilder from './axe.mjs';
import { test, expect, BASE } from './fixtures.mjs';

const PARTS = `${BASE}kit/parts/`;

test('the QR sheet: a code of the link, the link written out, Copy link; gone once closed', async ({ phone }) => {
  const page = await phone();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const loaded = [];
  page.on('request', r => { if (/\/ui\/qr\.js$/.test(r.url())) loaded.push(r.url()); });
  await page.goto(PARTS);
  await page.waitForLoadState('load');
  expect(loaded, 'the encoder is not on startup').toEqual([]);
  await page.locator('#link-qr').click();
  const sheet = page.locator('dialog.ui-qr-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.ui-qr svg path')).toHaveCount(1);
  expect(loaded.length).toBe(1);
  const url = await page.evaluate(() => location.href);
  await expect(sheet.locator('.ui-qr-url')).toHaveText(url);
  await expect(sheet.locator('.ui-qr')).toHaveAttribute('aria-label', 'QR code for Parts gallery');
  // big enough to scan: at least 3 CSS px a module, dark on a light tile
  const tile = await sheet.locator('.ui-qr').evaluate(t => {
    const n = Number(t.querySelector('svg')?.getAttribute('viewBox')?.split(' ')[2]);
    return { px: t.getBoundingClientRect().width / n, paper: getComputedStyle(t).backgroundColor, ink: getComputedStyle(/** @type {Element} */ (t.querySelector('path'))).fill };
  });
  expect(tile.px).toBeGreaterThanOrEqual(3);
  expect(tile.paper).toBe('rgb(255, 255, 255)');
  expect(tile.ink).toBe('rgb(0, 0, 0)');
  await sheet.locator('.ui-qr-copy').click();
  await expect(sheet.locator('.ui-qr-said')).toHaveText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  expect(await AxeBuilder(page), 'axe').toEqual([]);
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('dialog.ui-qr-sheet')).toHaveCount(0);
  await expect(page.locator('#link-state')).toHaveText('QR sheet closed.');
  // dark mode: still dark modules on a light (softer) tile
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.locator('#link-qr').click();
  await expect(page.locator('.ui-qr svg')).toBeVisible();
  expect(await page.locator('.ui-qr').evaluate(t => getComputedStyle(t).backgroundColor)).toBe('rgb(230, 230, 230)');
});

test('ask first: allowed already answers at once; otherwise the reason, Not now kept, Allow asks the browser', async ({ phone }) => {
  const page = await phone();
  // a browser where notifications are not yet asked (headless says blocked), the camera is blocked and the
  // microphone works (the test machine has neither)
  await page.addInitScript(() => {
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = d => (d.name === 'camera' ? Promise.resolve(/** @type {any} */ ({ state: 'denied' }))
      : d.name === 'microphone' ? Promise.resolve(/** @type {any} */ ({ state: window.__mic ?? 'prompt' })) : query(d));
    Object.defineProperty(Notification, 'permission', { get: () => 'default', configurable: true });
    window.__stopped = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__mic = 'granted'; return /** @type {any} */ ({ getTracks: () => [{ stop: () => { window.__stopped++; } }] }); };
  });
  await page.goto(PARTS);
  await page.context().grantPermissions(['geolocation'], { origin: new URL(page.url()).origin });
  const state = page.locator('#ask-state');

  await page.locator('[data-ask="location"]').click();
  await expect(state).toHaveText('location: granted.');
  await expect(page.locator('dialog.ui-ask-sheet')).toHaveCount(0);

  // Not now: kept, and the next ask answers 'later' with no sheet
  await page.locator('[data-ask="notifications"]').click();
  const sheet = page.locator('dialog.ui-ask-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h2')).toHaveText('Allow notifications?');
  await expect(sheet.locator('.ui-ask-why')).toHaveText('To tell you when a plant is due for water.');
  await expect(sheet.locator('.ui-ask-icon svg')).toHaveCount(1);
  expect(await AxeBuilder(page), 'axe').toEqual([]);
  await sheet.getByRole('button', { name: 'Not now' }).click();
  await expect(state).toHaveText('notifications: later.');
  await expect(page.locator('dialog.ui-ask-sheet')).toHaveCount(0);
  const until = await page.evaluate(() => JSON.parse(localStorage.getItem('ui-ask-later') ?? '{}').notifications - Date.now());
  expect(until).toBeGreaterThan(6.9 * 86_400_000);
  await page.locator('[data-ask="notifications"]').click();
  await expect(state).toHaveText('notifications: later.');
  await expect(page.locator('dialog.ui-ask-sheet')).toHaveCount(0);

  // Allow asks the browser itself, and lets go of the microphone at once
  await page.locator('[data-ask="microphone"]').click();
  await page.locator('dialog.ui-ask-sheet').getByRole('button', { name: 'Allow' }).click();
  await expect(state).toHaveText('microphone: granted.');
  expect(await page.evaluate(() => window.__stopped)).toBe(1);

  // blocked: how to turn it back on, then 'denied'
  await page.locator('[data-ask="camera"]').click();
  const off = page.locator('dialog.ui-ask-sheet');
  await expect(off.locator('h2')).toHaveText('Turned off for this app');
  await expect(off.locator('p')).toContainText('camera');
  expect(await AxeBuilder(page), 'axe').toEqual([]);
  await off.getByRole('button', { name: 'OK' }).click();
  await expect(state).toHaveText('camera: denied.');
  await expect(page.locator('dialog.ui-ask-sheet')).toHaveCount(0);
});
