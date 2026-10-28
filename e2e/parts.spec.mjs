// The reference parts on the /kit/parts/ gallery (undo toast, loading and error states, About sheet): behaviour,
// axe in each state, at phone and laptop widths. The list is docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const PARTS = '/ui/0.0.0-dev/kit/parts/';

// a finger, through the DevTools protocol (Playwright's own touchscreen only taps)
async function drag(page, x0, y0, x1, y1) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await send('touchStart', x0, y0);
  for (let i = 1; i <= 8; i++) { await send('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await page.waitForTimeout(16); }
  await send('touchEnd', 0, 0);
}

for (const width of [390, 1280]) {
  test.describe(`at ${width} px`, () => {
    test('undo toast: Undo puts the row back where it was; one toast at a time', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      const names = () => page.locator('#fruit li').evaluateAll(rows => rows.map(r => r.dataset.name));
      await page.locator('#fruit li[data-name="Pear"] button').click();
      expect(await names()).toEqual(['Apple', 'Plum', 'Fig']);
      await expect(page.locator('.toast')).toHaveText(/Deleted Pear/);
      expect(await AxeBuilder(page), 'axe with a toast').toEqual([]);
      await page.locator('#fruit li[data-name="Fig"] button').click();
      await expect(page.locator('.toast')).toHaveCount(1);
      await expect(page.locator('.toast')).toHaveText(/Deleted Fig/);
      await page.getByRole('button', { name: 'Undo' }).click();
      expect(await names()).toEqual(['Apple', 'Plum', 'Fig']);
      await expect(page.locator('.toast')).toHaveCount(0);
    });

    test('loading: skeleton rows, then the list; a failure shows the error and Try again recovers', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#load-fail').click();
      await expect(page.locator('.load-row')).toHaveCount(3);
      await expect(page.locator('#load-host')).toHaveAttribute('aria-busy', 'true');
      expect(await AxeBuilder(page), 'axe while loading').toEqual([]);
      await expect(page.locator('.load-error')).toHaveText('Could not load the list.');
      await expect(page.locator('#load-host')).not.toHaveAttribute('aria-busy', 'true');
      expect(await AxeBuilder(page), 'axe with the error').toEqual([]);
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.locator('#loaded li')).toHaveText(['Rose', 'Tulip']);
      await expect(page.locator('.load-state')).toBeHidden();
    });

    test('About: version, the newest-version check and the outside code from the import map; Esc closes', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#about-open').click();
      const sheet = page.locator('dialog.about-sheet');
      await expect(sheet).toContainText('Version 1.2.3');
      await expect(sheet.locator('li')).toHaveText(['demo-markdown · 4.2.1 · MIT', 'demo-zip · 1.0.0 · MIT']);
      expect(await AxeBuilder(page), 'axe with the sheet').toEqual([]);
      await sheet.getByRole('button', { name: 'Get the newest version' }).click();
      await expect(sheet.locator('[role=status]')).toContainText('This is the newest version');
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(page.locator('#about-open')).toBeFocused();
    });

    test('drafts: typing is kept and a reload finds it; Send clears it', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#draft-text').fill('half a thought');
      await expect(page.locator('#draft-state')).toHaveText('Draft kept on this device.');
      await page.reload();
      await expect(page.locator('#draft-text')).toHaveValue('half a thought');
      await expect(page.locator('#draft-state')).toHaveText('Draft restored.');
      await page.locator('#draft-send').click();
      await page.reload();
      await expect(page.locator('#draft-text')).toHaveValue('');
      expect(await AxeBuilder(page), 'axe').toEqual([]);
    });

    test('drag to reorder: dragging the grip down moves the row', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      const grip = page.locator('#drag-list li').first().locator('.ui-grip');
      await grip.scrollIntoViewIfNeeded();
      const box = await grip.boundingBox();
      const rowH = (await page.locator('#drag-list li').nth(1).boundingBox())?.height ?? 40;
      await drag(page, box.x + box.width / 2, box.y + box.height / 2, box.x + box.width / 2, box.y + box.height / 2 + rowH * 2.6);
      await expect(page.locator('#drag-order')).toHaveText('Order: Pear, Plum, Apple, Fig');
      expect(await AxeBuilder(page), 'axe').toEqual([]);
    });

    test('share out: Copy says so; Share without a share sheet copies', async ({ sized, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
      const page = await sized(width);
      await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
      await page.goto(PARTS);
      await page.locator('#share-copy').click();
      await expect(page.locator('.toast').last()).toHaveText(/Copied|Could not copy/);
      await page.locator('#share-send').click();
      await expect(page.locator('.toast').last()).toHaveText(/Copied: paste it|Could not copy/);
    });

    test('Back closes the top dialog first, then the next; the page stays', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#back-open').click();
      await page.locator('#back-second').click();
      await expect(page.locator('#back-dialog-2')).toHaveAttribute('open', '');
      await page.goBack();
      await expect(page.locator('#back-dialog-2')).not.toHaveAttribute('open', '');
      await expect(page.locator('#back-dialog')).toHaveAttribute('open', '');
      await page.goBack();
      await expect(page.locator('#back-dialog')).not.toHaveAttribute('open', '');
      await expect(page.locator('#back-state')).toHaveText('Dialog closed.');
      expect(page.url()).toContain('/kit/parts/');
    });

    test('hide mode: a tap hides a button or card; the main button and inputs stay; Show all brings them back', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#hide-on').check();
      await expect(page.locator('#hide-page .hide-cand')).toHaveCount(3);   // the weather button, the weather card, the tips card
      await page.getByRole('button', { name: 'Refresh weather' }).click();
      await expect(page.locator('#hide-list')).toHaveText('Hidden: Refresh weather');
      await expect(page.getByRole('button', { name: 'Refresh weather' })).toBeHidden();
      await page.getByRole('heading', { name: 'Tips' }).click();
      await expect(page.locator('#hide-list')).toHaveText('Hidden: Refresh weather, Tips');
      await page.getByRole('button', { name: 'Save notes' }).click({ force: true });
      await expect(page.getByRole('button', { name: 'Save notes' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Tips' })).toBeHidden();
      await page.locator('#hide-all').click();
      await expect(page.getByRole('heading', { name: 'Tips' })).toBeVisible();
      await expect(page.locator('#hide-list')).toHaveText('Nothing hidden.');
    });
  });
}

for (const width of [390, 1280]) {
  test(`prose at ${width} px: task boxes sit on their line, code is not the accent, the measure holds`, async ({ sized }) => {
    const page = await sized(width);
    await page.goto(PARTS);
    const prose = page.locator('#prose');
    const task = prose.locator('li').filter({ has: page.locator('input[type=checkbox]') }).first();
    expect(await task.evaluate(li => getComputedStyle(li).listStyleType)).toBe('none');
    const box = await task.locator('input').boundingBox(), li = await task.boundingBox();
    expect(box && li && box.y >= li.y - 1 && box.y + box.height <= li.y + li.height + 1, 'the box is on the row').toBe(true);
    expect(box && li && box.x < li.x, 'the box hangs left of the words').toBe(true);
    const [pre, accent] = await page.evaluate(() => {
      const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; document.body.append(probe);
      const a = getComputedStyle(probe).color; probe.remove();
      return [getComputedStyle(document.querySelector('#prose pre')).backgroundColor, a];
    });
    expect(pre).not.toBe(accent);
    const w = await prose.evaluate(el => el.getBoundingClientRect().width);
    expect(w).toBeLessThanOrEqual(42 * 16 + 1);
    const btn = await page.locator('#icon-close').boundingBox();
    expect(btn && Math.abs(btn.width - btn.height) < 2).toBe(true);
    expect(await AxeBuilder(page)).toEqual([]);
  });
}
