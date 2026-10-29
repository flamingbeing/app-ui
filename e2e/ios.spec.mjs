// The iOS look's gallery (kit/ios/) in Chromium and WebKit (the stand-in for an iPhone): row swipe actions open, run
// and close; a full swipe runs the first action; the segmented control's thumb slides; the switch, the large title and
// the sheet's detents; axe in light and dark. In Chromium the finger is DevTools touch input (the real path); WebKit
// has none, so there it is pointer events sent from the page, one per frame. The list is docs/kit-tests.md, "iOS look".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const IOS = '/ui/0.0.0-dev/kit/ios/';

/** the page, and a finger on it: drag(x0, y, x1, frames), lifting at the end unless lift is false */
async function load(phone, browserName, query = '') {
  const page = await phone();
  await page.goto(IOS + query);
  await expect.poll(() => page.evaluate(() => !!window.kit?.swipe)).toBe(true);
  /** @type {(type: string, x: number, y: number) => Promise<unknown>} */
  let send;
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const T = { down: 'touchStart', move: 'touchMove', up: 'touchEnd' };
    send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type: T[type], touchPoints: type === 'up' ? [] : [{ x, y }] });
  } else {
    await page.evaluate(() => {
      let clock = 0, target = null;
      window.__ptr = (type, x, y) => {
        if (type === 'down') { target = document.elementFromPoint(x, y); clock = Math.max(clock, performance.now()); }
        clock += type === 'down' ? 0 : 1000 / 60;
        const e = new PointerEvent(`pointer${type}`, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
          bubbles: true, cancelable: true, composed: true, button: type === 'move' ? -1 : 0 });
        Object.defineProperty(e, 'timeStamp', { value: clock });
        target.dispatchEvent(e);
        if (type === 'up') target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      };
    });
    send = (type, x, y) => page.evaluate(([t, a, b]) => window.__ptr(t, a, b), [type, x, y]);
  }
  const frame = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(undefined))));
  const drag = async (x0, y, x1, n = 10, { lift = true } = {}) => {
    await send('down', x0, y);
    for (let i = 1; i <= n; i++) { await frame(); await send('move', x0 + (x1 - x0) * i / n, y); }
    if (lift) { for (let i = 0; i < 4; i++) { await frame(); await send('move', x1, y); } await send('up', x1, y); }
  };
  const tap = async (x, y) => { await send('down', x, y); await send('up', x, y); };
  const settled = () => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const rowX = name => page.locator(`[data-plant="${name}"]`).evaluate(e => Math.round(e.getBoundingClientRect().x - e.parentElement.getBoundingClientRect().x));
  const middle = async name => { const b = await page.locator(`[data-plant="${name}"]`).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  return { page, drag, tap, settled, rowX, middle };
}

test('a row swiped left past half its actions stays open on Flag and Delete; a tap on Flag runs it and closes', async ({ phone, browserName }) => {
  const { page, drag, tap, settled, rowX, middle } = await load(phone, browserName);
  const [x, y] = await middle('Fern');
  await drag(x + 60, y, x - 60);
  await settled();
  expect(await rowX('Fern'), 'open on the two actions, 74 px each').toBe(-148);
  const flag = page.locator('[data-plant="Fern"] .ui-swipe-action[data-action="flag"]');
  await expect(flag).toBeVisible();
  const fb = await flag.boundingBox();
  expect(Math.round(fb.x + fb.width), 'Flag sits flush with the row').toBeLessThanOrEqual(Math.round(await page.locator('#todo').evaluate(e => e.getBoundingClientRect().right)) + 1);
  await tap(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await settled();
  await expect.poll(() => page.evaluate(() => window.kit.done)).toEqual(['flag:Fern']);
  expect(await rowX('Fern'), 'closed again').toBe(0);
  await expect(page.locator('[data-plant="Fern"]')).toHaveAttribute('data-flagged', '');
  await expect(page.locator('.ui-swipe-tray')).toHaveCount(0);
});

test('a short swipe springs back; a tap on an open row only closes it; Escape closes', async ({ phone, browserName }) => {
  const { page, drag, tap, settled, rowX, middle } = await load(phone, browserName);
  const [x, y] = await middle('Basil');
  await drag(x, y, x - 40, 8);
  await settled();
  expect(await rowX('Basil'), 'short of half: closed').toBe(0);
  await drag(x + 60, y, x - 80);
  await settled();
  expect(await rowX('Basil')).toBe(-148);
  await tap(x - 160, y);
  await settled();
  expect(await rowX('Basil'), 'the tap closed it').toBe(0);
  expect(await page.evaluate(() => window.kit.done), 'and ran nothing').toEqual([]);
  await drag(x + 60, y, x - 80);
  await settled();
  await page.keyboard.press('Escape');
  await settled();
  expect(await rowX('Basil')).toBe(0);
});

test('a full swipe left runs Delete at once (the row goes); a swipe right marks it done', async ({ phone, browserName }) => {
  const { page, drag, settled, rowX, middle } = await load(phone, browserName);
  const [x, y] = await middle('Orchid');
  await drag(x + 150, y, x - 160, 14, { lift: false });
  await expect(page.locator('[data-plant="Orchid"] .ui-swipe-action[data-action="delete"]'), 'armed: Delete takes the width').toHaveClass(/is-full/);
  await drag(x - 160, y, x - 165, 1);
  await settled();
  await expect.poll(() => page.evaluate(() => window.kit.done)).toEqual(['delete:Orchid']);
  await expect(page.locator('[data-plant="Orchid"]')).toHaveCount(0);
  const [x2, y2] = await middle('Monstera');
  await drag(x2 - 60, y2, x2 + 60);
  await settled();
  expect(await rowX('Monstera'), 'open on Done').toBe(74);
  await page.locator('[data-plant="Monstera"] .ui-swipe-action[data-action="done"]').click();
  await expect.poll(() => page.evaluate(() => window.kit.done)).toEqual(['delete:Orchid', 'done:Monstera']);
  await expect(page.locator('[data-plant="Monstera"]')).toHaveAttribute('data-done', '');
});

test('a finger going up the page scrolls, never swipes the row; one in the edge strip is the Back swipe\'s', async ({ phone, browserName }) => {
  const { page, drag, settled, rowX, middle } = await load(phone, browserName);
  const [x, y] = await middle('Fern');
  await drag(10, y, 120);
  await settled();
  expect(await rowX('Fern'), 'from the edge strip: not the row\'s').toBe(0);
  await expect(page.locator('.ui-swipe-tray')).toHaveCount(0);
  const vertical = await page.evaluate(([a, b]) => new Promise(res => {
    // a finger that goes mostly up: drag() hands it to the page at once (swipeIntent)
    const list = document.getElementById('todo');
    const fire = (t, cx, cy) => list.querySelector('[data-plant="Fern"]').dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: cy, bubbles: true }));
    fire('pointerdown', a, b); fire('pointermove', a - 4, b - 30); fire('pointermove', a - 8, b - 60); fire('pointerup', a - 8, b - 60);
    requestAnimationFrame(() => res(document.querySelectorAll('.ui-swipe-tray').length));
  }), [x, y]);
  expect(vertical).toBe(0);
});

test('the segmented control: its thumb slides to the pick and the rows filter; the switch turns green; the title folds into the bar', async ({ phone, browserName }) => {
  const { page } = await load(phone, browserName);
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

test('the sheet opens at its half detent from Add, the grabber takes it to full; Done closes it', async ({ phone, browserName }) => {
  const { page } = await load(phone, browserName);
  await page.locator('#add').click();
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await page.locator('#sheet .ui-sheet-grabber').click();
  await expect(sheet).toHaveAttribute('data-detent', 'large');
  await page.locator('#sheet .ui-sheet-head .ui-primary').click();
  await expect(sheet).not.toHaveAttribute('open', '');
});

for (const scheme of ['light', 'dark']) {
  test(`axe, ${scheme}: the page, a row open on its actions and the sheet`, async ({ phone, browserName }) => {
    const { page, drag, settled, middle } = await load(phone, browserName);
    await page.emulateMedia({ colorScheme: scheme });
    expect(await AxeBuilder(page), 'the page').toEqual([]);
    const [x, y] = await middle('Fern');
    await drag(x + 60, y, x - 60);
    await settled();
    expect(await AxeBuilder(page, { within: '#todo' }), 'the actions').toEqual([]);
    await page.keyboard.press('Escape');
    await page.locator('#add').click();
    expect(await AxeBuilder(page, { within: '#sheet' }), 'the sheet').toEqual([]);
  });
}
