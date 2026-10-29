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

    test('follow the finger: the knob goes with a finger, glides to the end it was let go nearer, and saves after', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      const knob = page.locator('#motion-knob');
      await knob.scrollIntoViewIfNeeded();
      const k = await knob.boundingBox(), t = await page.locator('#motion-track').boundingBox();
      const y = k.y + k.height / 2;
      await drag(page, k.x + k.width / 2, y, k.x + k.width / 2 + (t.width - k.width) * .7, y);
      await expect(page.locator('#motion-state')).toHaveText('At the right.');
      await expect(page.locator('#motion-saved')).toHaveText('Saved 1 time.');
      const end = await knob.boundingBox();
      expect(Math.abs(end.x + end.width - (t.x + t.width - 4))).toBeLessThan(2);
      // back, a short move: it glides back to the right
      await drag(page, end.x + end.width / 2, y, end.x + end.width / 2 - 30, y);
      await expect(page.locator('#motion-saved')).toHaveText('Saved 2 times.');
      await expect(page.locator('#motion-state')).toHaveText('At the right.');
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

test('a hover card shows after the mouse rests on a link, and goes when it leaves; a touch screen gets none', async ({ browser, sized }) => {
  const touch = await sized(390);   // (no hover there: a tap keeps doing what it did)
  await touch.goto(PARTS);
  await touch.locator('#prose a.note-link').tap();
  await touch.waitForTimeout(700);
  await expect(touch.locator('.ui-hover-card')).toHaveCount(0);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });   // a mouse: no touch
  const page = await context.newPage();
  await page.goto(PARTS);
  const link = page.locator('#prose a.note-link'), card = page.locator('.ui-hover-card');
  await link.hover();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Watering');
  expect(await link.getAttribute('aria-describedby')).toBe(await card.getAttribute('id'));
  const [l, c] = [await link.boundingBox(), await card.boundingBox()];
  expect(l && c && c.y >= l.y + l.height, 'below the link').toBe(true);
  expect(await AxeBuilder(page)).toEqual([]);
  await page.mouse.move(5, 5);
  await expect(card).toHaveCount(0);
  await context.close();
});

test('conflict sheet: per-field picks survive a queue change while the sheet is open', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PARTS);
  await page.evaluate(async () => {
    const { conflictSheet } = await import('/ui/0.0.0-dev/ui/conflict-sheet.js');
    const side = v => ({ value: v, when: '10:00' });
    const c = { key: 'k1', mine: side({ a: 1, b: 1 }), theirs: side({ a: 2, b: 2 }), deleted: {},
      fields: [{ path: 'a', mine: side(1), theirs: side(2) }, { path: 'b', mine: side(1), theirs: side(2) }] };
    let changed = () => {};
    window.resolved = [];
    window.queueChanged = () => changed();
    conflictSheet(document.body, { idPrefix: 't-', sync: { conflicts: () => [c], describe: () => c,
      resolve: (k, p) => window.resolved.push([k, { ...p }]), queue: { onChange: fn => { changed = fn; return () => {}; } } } });
  });
  await page.locator('#t-attention').click();
  const sheet = page.locator('#t-conflicts');
  await sheet.getByRole('button', { name: 'Mine', exact: true }).first().click();
  await page.evaluate(() => window.queueChanged());   // another save goes out meanwhile: the list redraws
  await sheet.getByRole('button', { name: 'Theirs', exact: true }).nth(1).click();
  await sheet.getByRole('button', { name: 'Keep these choices' }).click();
  expect(await page.evaluate(() => window.resolved)).toEqual([['k1', { a: 'mine', b: 'theirs' }]]);
});

test('conflict sheet: per-field labels and formatters; the field path and JSON stay the default', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(PARTS);
  await page.evaluate(async () => {
    const { conflictSheet } = await import('/ui/0.0.0-dev/ui/conflict-sheet.js');
    const side = (v, when) => ({ value: v, when });
    const c = { key: 'k2', mine: side({}), theirs: side({}), deleted: {},
      fields: [{ path: 'shift.start', mine: side(480, '10:00'), theirs: side(540) }, { path: 'note', mine: side('a'), theirs: side('b') }] };
    conflictSheet(document.body, { idPrefix: 'f-', fields: { 'shift.start': { label: 'Start', format: v => `${v / 60}:00` } },
      sync: { conflicts: () => [c], describe: () => c, resolve: () => {}, queue: { onChange: () => () => {} } } });
  });
  await page.locator('#f-attention').click();
  const sheet = page.locator('#f-conflicts');
  await expect(sheet.getByText('Start: yours “8:00” (10:00) · theirs “9:00”', { exact: true })).toBeVisible();
  await expect(sheet.getByText('note: yours “a” · theirs “b”', { exact: true })).toBeVisible();
});

test('toast: Dismiss and the action are at least 24 px (axe target-size); --ui-toast-bottom and the bottom option lift it', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/test/plain.html');
  await expect(page.locator('#signed-out')).toBeVisible();
  await page.evaluate(async () => {
    const { toaster } = await import('@core/ui');
    window.t = toaster(document.body);
    window.t.show('Saved', { action: { label: 'Undo', run: () => {} } });
  });
  const toast = page.locator('.toast', { hasText: 'Saved' });
  await expect(toast).toBeVisible();
  for (const b of await toast.getByRole('button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(24);
  expect((await AxeBuilder(page)).filter(v => v.startsWith('target-size')), 'axe target-size with a toast').toEqual([]);
  const bottom = async () => { const r = await page.locator('.toasts').first().boundingBox(); return 844 - (r.y + r.height); };
  // an app's own tab bar (not the kit's): the app names its height
  await page.evaluate(() => document.documentElement.style.setProperty('--ui-toast-bottom', '80px'));
  expect(Math.round(await bottom())).toBe(80);
  await page.evaluate(async () => {
    document.documentElement.style.removeProperty('--ui-toast-bottom');
    window.t.stop();
    const { toaster } = await import('@core/ui');
    toaster(document.body, { bottom: '64px' }).show('Moved');
  });
  expect(Math.round(await bottom())).toBe(64);
});
