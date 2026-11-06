// The photo viewer (ui/photo-viewer.js) on /kit/parts/ at 390 px, with a finger (or two) through the DevTools protocol:
// it loads on the first tap, swipes between photos, zooms by pinch and double-tap, pans a zoomed photo, and closes by
// a swipe down, the X, Esc and Back; axe in light and dark. The list is docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const PARTS = '/ui/0.0.0-dev/kit/parts/';

/** fingers through the DevTools protocol: each step is the list of points down (one or two) */
async function fingers(page, steps, gap = 16) {
  const c = await page.context().newCDPSession(page);
  const pts = (/** @type {number[][]} */ s) => s.map(([x, y], id) => ({ x, y, id }));
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(steps[0]) });
  for (const s of steps.slice(1)) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(s) }); await page.waitForTimeout(gap); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
}
const line = (x0, y0, x1, y1, n = 8) => Array.from({ length: n + 1 }, (_, i) => [[x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]]);
const tap = (page, x, y) => fingers(page, [[[x, y]]]);
/** the photo shown: its zoom (from its transform) and the track's place */
const shown = page => page.evaluate(() => {
  const dlg = /** @type {HTMLDialogElement} */ (document.getElementById('viewer'));
  const track = /** @type {HTMLElement} */ (dlg.querySelector('.ui-pv-track'));
  const t = new DOMMatrixReadOnly(getComputedStyle(track).transform);
  const i = Math.round(-t.e / dlg.clientWidth) || 0;   // (no -0)
  const img = dlg.querySelectorAll('.ui-pv-slide img')[i];
  const m = img ? new DOMMatrixReadOnly(getComputedStyle(img).transform) : new DOMMatrixReadOnly();
  return { open: dlg.open, i, track: t.e || 0, scale: Math.hypot(m.a, m.b), x: m.e, y: m.f, zoomed: dlg.classList.contains('is-zoomed'), cap: dlg.querySelector('.ui-pv-cap')?.textContent };
});
// (finite animations only: the page has endless ones, such as a skeleton's sweep)
const settle = page => page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime)));

async function openAt(phone, n = 0, scheme = 'light') {
  const page = await phone();
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(PARTS);
  const before = await page.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('photo-viewer.js')));
  expect(before, 'the viewer is not loaded before the first tap').toBe(false);
  await page.locator('.photo-thumb').nth(n).scrollIntoViewIfNeeded();
  await page.locator('.photo-thumb').nth(n).click();
  await expect(page.locator('#viewer')).toHaveJSProperty('open', true);
  await settle(page);
  return page;
}

for (const scheme of ['light', 'dark']) {
  test(`opens full screen on the tapped photo with its caption; axe (${scheme})`, async ({ phone }) => {
    const page = await openAt(phone, 1, scheme);
    const s = await shown(page);
    expect(s.i).toBe(1);
    expect(s.cap).toBe('A tower at dusk  ·  2 / 3');
    const box = await page.locator('#viewer').boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: 390, height: 844 });
    await expect(page.locator('#viewer'), 'square to the screen, whatever the look rounds dialogs to').toHaveCSS('border-top-left-radius', '0px');
    await expect(page.locator('#viewer').getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(page.locator('#photo-state')).toHaveText('Showing 2 of 3.');
    expect(await AxeBuilder(page), 'axe with the viewer open').toEqual([]);
  });
}

test('a swipe goes to the next photo and back; at the first one it stretches and stays', async ({ phone }) => {
  const page = await openAt(phone, 0);
  await fingers(page, line(300, 420, 80, 420));
  await settle(page);
  expect((await shown(page)).i).toBe(1);
  expect((await shown(page)).track).toBe(-390);
  await expect(page.locator('#photo-state')).toHaveText('Showing 2 of 3.');
  await fingers(page, line(80, 420, 300, 420));
  await settle(page);
  expect((await shown(page)).i).toBe(0);
  // at the first photo a swipe right only stretches (rubber band) and springs back
  await fingers(page, line(80, 420, 300, 420));
  await settle(page);
  expect(await shown(page)).toMatchObject({ i: 0, track: 0 });
  // a short slow move goes back to the same photo
  await fingers(page, line(250, 420, 200, 420), 40);
  await settle(page);
  expect(await shown(page)).toMatchObject({ i: 0, track: 0 });
});

test('double-tap zooms in where tapped and out again; a zoomed photo pans instead of swiping', async ({ phone }) => {
  const page = await openAt(phone, 0);
  await tap(page, 120, 420); await page.waitForTimeout(80); await tap(page, 120, 420);
  await settle(page);
  let s = await shown(page);
  expect(s.zoomed).toBe(true);
  expect(s.scale).toBeCloseTo(2.5, 1);
  expect(s.x, 'the tapped side (left of centre) comes towards the middle').toBeGreaterThan(0);
  await expect(page.locator('.ui-pv-cap')).toHaveCSS('opacity', '0');
  // a drag pans the photo; the track stays on this photo
  const x0 = s.x;
  await fingers(page, line(200, 420, 120, 420));
  s = await shown(page);
  expect(s.track).toBe(0);
  expect(s.x).toBeLessThan(x0);
  await tap(page, 200, 420); await page.waitForTimeout(80); await tap(page, 200, 420);
  await settle(page);
  s = await shown(page);
  expect(s).toMatchObject({ zoomed: false, x: 0, y: 0 });
  expect(s.scale).toBeCloseTo(1, 2);
});

test('two fingers pinch it bigger and it stays; pinched small it springs back to fit', async ({ phone }) => {
  const page = await openAt(phone, 0);
  const apart = Array.from({ length: 9 }, (_, i) => [[195 - 30 - i * 12, 420], [195 + 30 + i * 12, 420]]);
  await fingers(page, apart);
  await settle(page);
  let s = await shown(page);
  expect(s.zoomed).toBe(true);
  expect(s.scale).toBeGreaterThan(2);
  expect(s.track).toBe(0);
  // pinched in below its fitted size: back to 1 on let-go
  const together = Array.from({ length: 9 }, (_, i) => [[195 - 130 + i * 14, 420], [195 + 130 - i * 14, 420]]);
  await fingers(page, together);
  await settle(page);
  s = await shown(page);
  expect(s.zoomed).toBe(false);
  expect(s.scale).toBeCloseTo(1, 2);
});

test('closes by a swipe down, the X, Esc and Back; a short drag down springs back', async ({ phone }) => {
  const page = await openAt(phone, 2);
  await fingers(page, line(195, 300, 195, 360), 40);
  await settle(page);
  expect(await shown(page)).toMatchObject({ open: true, y: 0 });
  expect((await shown(page)).scale).toBeCloseTo(1, 2);
  await fingers(page, line(195, 300, 195, 600));
  await expect(page.locator('#viewer')).toHaveJSProperty('open', false);
  await expect(page.locator('#photo-state')).toHaveText('Closed.');
  // the page's history step went with it: Back now leaves nothing of the viewer's
  const depth = await page.evaluate(() => history.length);
  await page.locator('.photo-thumb').nth(0).click();
  await page.locator('#viewer').getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('#viewer')).toHaveJSProperty('open', false);
  await page.locator('.photo-thumb').nth(0).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).toHaveJSProperty('open', false);
  await page.locator('.photo-thumb').nth(0).click();
  await expect(page.locator('#viewer')).toHaveJSProperty('open', true);
  await page.goBack();
  await expect(page.locator('#viewer')).toHaveJSProperty('open', false);
  expect(await page.evaluate(() => location.pathname)).toBe(PARTS);
  expect(await page.evaluate(() => history.length)).toBeGreaterThanOrEqual(depth);
});

test('under Still the fingers still swipe; a double-tap zooms at once', async ({ phone }) => {
  const page = await phone();
  await page.addInitScript(() => { document.documentElement.dataset.motion = 'still'; });
  await page.goto(PARTS);
  await page.evaluate(() => { document.documentElement.dataset.motion = 'still'; });
  await page.locator('.photo-thumb').nth(0).click();
  await fingers(page, line(300, 420, 80, 420));
  await settle(page);
  expect((await shown(page)).i).toBe(1);
  await tap(page, 195, 420); await page.waitForTimeout(80); await tap(page, 195, 420);
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target?.matches?.('.ui-pv-slide img')).length)).toBe(0);
  expect((await shown(page)).scale).toBeCloseTo(2.5, 1);
});
