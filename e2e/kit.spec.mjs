// The /kit/ gallery: every @core/ui gesture part with a real (emulated) finger, at phone, tablet and laptop widths,
// signed out, made-up plants. The list of what is covered is docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const KIT = '/ui/0.0.0-dev/kit/?edge=always';

// a finger, through the DevTools protocol (Playwright's own touchscreen only taps)
async function finger(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  return {
    down: (x, y) => send('touchStart', x, y),
    move: (x, y) => send('touchMove', x, y),
    up: () => send('touchEnd', 0, 0),
    /** a drag in steps, `ms` apart */
    async drag(x0, y0, x1, y1, { steps = 10, ms = 16 } = {}) {
      await send('touchStart', x0, y0);
      for (let i = 1; i <= steps; i++) {
        await send('touchMove', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps);
        await page.waitForTimeout(ms);
      }
      await send('touchEnd', 0, 0);
    },
  };
}
const centre = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
const depth = page => page.evaluate(() => window.kit.screens.depth());
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));

for (const width of [390, 820, 1280]) {
  test.describe(`at ${width} px`, () => {
    test('loads clean (axe), every part started', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
      expect(await page.evaluate(() => ({ menus: !!kit.menus, title: !!kit.title, screens: !!kit.screens, sheets: kit.sheets.size, selects: kit.selects.size })))
        .toEqual({ menus: true, title: true, screens: true, sheets: 1, selects: 1 });
      expect(await AxeBuilder(page)).toEqual([]);
    });

    test('hold: 500 ms opens the menu, lifting does not open the row; a tap does; moving cancels', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      const f = await finger(page);
      const row = page.locator('.ui-row', { hasText: 'Fern' });
      const { x, y } = await centre(row);
      await f.down(x, y);
      await page.waitForTimeout(250);
      await expect(page.locator('.ui-menu')).toHaveCount(0);   // not yet
      await page.waitForTimeout(400);
      await expect(page.locator('.ui-menu[role=menu]')).toBeVisible();
      await f.up();
      await page.waitForTimeout(200);
      expect(await depth(page)).toBe(0);   // the lift's click was swallowed
      await expect(page.locator('.ui-menu')).toBeFocused();
      expect(await AxeBuilder(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.locator('.ui-menu')).toHaveCount(0);

      await f.down(x, y);
      await f.move(x, y + 30);   // a scroll, not a hold
      await page.waitForTimeout(650);
      await f.up();
      await expect(page.locator('.ui-menu')).toHaveCount(0);

      await row.tap();
      await expect.poll(() => depth(page)).toBe(1);
      await expect(page.locator('#detail-title')).toHaveText('Fern');
    });

    test('right-click, the context-menu key and Shift+F10 open the same menu; keys move; Esc gives focus back', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      const row = page.locator('.ui-row', { hasText: 'Jade' });
      await row.click({ button: 'right' });
      await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.ui-menu')).toHaveCount(0);

      await row.focus();
      await page.keyboard.press('Shift+F10');
      await expect(page.getByRole('menuitem', { name: 'Open' })).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('menuitem', { name: 'Select' })).toBeFocused();
      await page.keyboard.press('End');
      await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('menuitem', { name: 'Open' })).toBeFocused();   // wraps
      await page.keyboard.press('Escape');
      await expect(row).toBeFocused();

      await page.keyboard.press('ContextMenu');
      await expect(page.locator('.ui-menu')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    test('a menu for a row near the bottom of the screen stays on screen', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      const h = page.viewportSize().height;
      // a row scrolled to just above the bottom: a menu opened under it would run off the screen
      const row = page.locator('.ui-row').nth(11);
      await row.evaluate((e, h) => scrollBy(0, e.getBoundingClientRect().top - (h - 130)), h);
      expect((await row.boundingBox()).y).toBeGreaterThan(h - 300);
      await row.click({ button: 'right' });
      await settled(page);
      const m = await page.locator('.ui-menu').boundingBox();
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y + m.height).toBeLessThanOrEqual(h);
      await page.keyboard.press('Escape');
    });

    test('Delete from the menu: gone, with a toast that puts it back (no "are you sure")', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      await page.locator('.ui-row', { hasText: 'Mint' }).click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.locator('#plants')).not.toContainText('Mint');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await page.locator('.toast').getByRole('button', { name: 'Undo' }).click();
      await expect(page.locator('.ui-row').nth(5)).toContainText('Mint');   // back in its place
    });

    test('select mode: tap ticks, a drag down the ticks takes a range, the action bar replaces the tab bar', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      await page.click('#select');
      await expect(page.locator('#plants')).toHaveAttribute('role', 'listbox');
      await expect(page.locator('.ui-action-bar')).toBeVisible();
      await expect(page.locator('.ui-tabbar')).toBeHidden();
      await expect(page.locator('#select')).toHaveText('Done');
      const rows = page.locator('.ui-row');
      await rows.nth(0).tap();
      await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('[data-select-count]')).toHaveText('1 selected');
      expect(await depth(page)).toBe(0);   // a tap ticks, it doesn't open

      // (rows 1–4 clear of the bottom edge, where a drag scrolls on: the look's title and list sizes move them)
      await rows.nth(1).evaluate(e => scrollBy(0, e.getBoundingClientRect().top - 160));
      const f = await finger(page);
      const list = await page.locator('#plants').boundingBox();
      const a = await centre(rows.nth(1)), b = await centre(rows.nth(4));
      await f.drag(list.x + 20, a.y, list.x + 20, b.y);
      for (const i of [1, 2, 3, 4]) await expect(rows.nth(i)).toHaveAttribute('aria-selected', 'true');
      await expect(rows.nth(5)).toHaveAttribute('aria-selected', 'false');
      await expect(page.locator('[data-select-count]')).toHaveText('5 selected');
      await expect(page.locator('#compare')).toBeDisabled();   // needs exactly 2
      await expect(page.locator('#delete-selected')).toBeEnabled();
      expect(await AxeBuilder(page)).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(page.locator('#plants')).toHaveAttribute('role', 'list');
      await expect(page.locator('.ui-tabbar')).toBeVisible();
      await expect(page.locator('.ui-action-bar')).toBeHidden();
    });

    test('hold on an iPhone (no navigator.vibrate): the haptic ticks and lifting still does not open the row', async ({ sized }) => {
      const page = await sized(width);
      await page.addInitScript(() => { delete Navigator.prototype.vibrate; });
      await page.goto(KIT);
      const f = await finger(page);
      const { x, y } = await centre(page.locator('.ui-row', { hasText: 'Fern' }));
      await f.down(x, y);
      await page.waitForTimeout(650);
      await expect(page.locator('.ui-menu[role=menu]')).toBeVisible();
      await f.up();
      await page.waitForTimeout(200);
      expect(await depth(page)).toBe(0);   // the lift's click was swallowed, not the haptic's own
      await expect(page.locator('.ui-haptic input')).toBeChecked();
    });

    test('the hold menu\'s Select starts select mode with that row ticked; no hold menu while selecting', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      const row = page.locator('.ui-row', { hasText: 'Orchid' });
      await row.click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Select' }).click();
      await expect(row).toHaveAttribute('aria-selected', 'true');
      const f = await finger(page);
      const { x, y } = await centre(row);
      await f.down(x, y);
      await page.waitForTimeout(650);
      await f.up();
      await expect(page.locator('.ui-menu')).toHaveCount(0);
    });

    test('sheet: the first drag has no long frame (transform only, no layout at the start)', async ({ sized }) => {
      test.skip(width >= 840, 'a centred dialog changes its height');
      const page = await sized(width);
      await page.goto(KIT);
      await page.click('#open-sheet');
      await settled(page);
      await page.evaluate(() => {
        const gaps = []; let last = performance.now(), on = true;
        const tick = t => { gaps.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        window.__frames = () => { on = false; return gaps; };
      });
      const g = await centre(page.locator('.ui-sheet-grabber'));
      await (await finger(page)).drag(g.x, g.y, g.x, g.y - 250, { steps: 20, ms: 16 });
      await settled(page);
      const gaps = await page.evaluate(() => window.__frames());
      expect(gaps.length, 'frames seen').toBeGreaterThan(10);
      expect(Math.max(...gaps.slice(0, 8)), 'worst of the first frames (ms)').toBeLessThan(80);
      expect(await page.locator('#sheet').evaluate(s => s.style.willChange || getComputedStyle(s).willChange)).not.toBe('transform');   // off again once still
    });

    test('sheet: opens at medium; dragged up to large, down to medium, down again to close; Back closes it', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      const sheet = page.locator('#sheet');
      await page.click('#open-sheet');
      await expect(sheet).toHaveAttribute('data-detent', 'medium');
      await settled(page);
      expect(await AxeBuilder(page)).toEqual([]);
      const f = await finger(page);
      const g = await centre(page.locator('.ui-sheet-grabber'));
      await f.drag(g.x, g.y, g.x, g.y - 250);
      await expect(sheet).toHaveAttribute('data-detent', 'large');
      await settled(page);
      const g2 = await centre(page.locator('.ui-sheet-grabber'));
      await f.drag(g2.x, g2.y, g2.x, g2.y + 250);
      await expect(sheet).toHaveAttribute('data-detent', 'medium');
      await settled(page);
      if (width >= 840) {   // a centred dialog
        const b = await sheet.boundingBox();
        expect(Math.abs(b.x + b.width / 2 - width / 2)).toBeLessThan(2);
        expect(b.y).toBeGreaterThan(8);
      } else {
        const b = await sheet.boundingBox();
        expect(Math.round(b.y + b.height)).toBe(page.viewportSize().height);   // on the bottom edge
      }
      // the grabber from the keyboard
      await page.locator('.ui-sheet-grabber').focus();
      await page.keyboard.press('Enter');
      await expect(sheet).toHaveAttribute('data-detent', 'large');
      await page.keyboard.press('Enter');
      await expect(sheet).toHaveAttribute('data-detent', 'medium');
      // down to close (only the narrow sheet closes by dragging: the centred one changes height)
      if (width < 840) {
        await settled(page);
        const g3 = await centre(page.locator('.ui-sheet-grabber'));
        await f.drag(g3.x, g3.y, g3.x, g3.y + 300);
        await expect(sheet).toBeHidden();
        await expect(page.locator('#open-sheet')).toBeFocused();
        await page.click('#open-sheet');
      }
      await page.goBack();
      await expect(sheet).toBeHidden();
      await expect(page).toHaveURL(/\/ui\/0\.0\.0-dev\/kit\//);
    });

    test('a field and a sideways scroller in the sheet keep the finger', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      await page.click('#open-sheet');
      const sheet = page.locator('#sheet');
      await settled(page);
      const f = await finger(page);
      // the same drags from the body would take the sheet up (or close it)
      for (const from of ['.kit-chips button', '#sheet-name']) {
        const p = await centre(page.locator(from).first());
        await f.drag(p.x, p.y, p.x, p.y - 200);
        await expect(sheet).toHaveAttribute('data-detent', 'medium');
        expect(await centre(page.locator(from).first())).toEqual(p);   // nothing moved, the body didn't scroll
        await f.drag(p.x, p.y, p.x, p.y + 250);
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveAttribute('data-detent', 'medium');
      }
      // and from the body it does
      const body = await centre(page.locator('.ui-sheet-body p').first());
      await f.drag(body.x, body.y, body.x, body.y - 200);
      await expect(sheet).toHaveAttribute('data-detent', 'large');
    });

    test('screens: push, Back pops with focus back on the pusher; the edge swipe goes back; the tab bar stays put', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      await page.click('#push');
      await expect.poll(() => depth(page)).toBe(1);
      await expect(page.locator('.ui-bar-title')).toHaveText('Details');
      await expect(page.locator('#select')).toBeHidden();
      await page.click('#push-more');
      await expect.poll(() => depth(page)).toBe(2);
      await page.goBack();
      await expect.poll(() => depth(page)).toBe(1);
      await expect(page.locator('#push-more')).toBeFocused();
      await settled(page);
      expect(await AxeBuilder(page)).toEqual([]);

      const tabs = await page.locator('.ui-tabbar').boundingBox();
      const f = await finger(page);
      const h = page.viewportSize().height;
      await f.down(4, h / 2);
      for (let x = 20; x <= 120; x += 20) { await f.move(x, h / 2 + 2); await page.waitForTimeout(16); }
      expect(await page.locator('#detail').evaluate(n => n.style.transform)).toMatch(/translateX\(1\d\dpx\)/);
      expect(await page.locator('.ui-tabbar').boundingBox()).toEqual(tabs);
      for (let x = 140; x <= width * 0.6; x += 40) { await f.move(x, h / 2 + 2); await page.waitForTimeout(16); }
      await f.up();
      await expect.poll(() => depth(page)).toBe(0);
      await expect(page.locator('#home')).toBeVisible();
      await expect(page.locator('#detail')).toBeHidden();
      await expect(page.locator('#push')).toBeFocused();

      // a short swipe springs back
      await page.click('#push');
      await expect.poll(() => depth(page)).toBe(1);
      await settled(page);
      await f.drag(4, h / 2, 60, h / 2 + 2, { steps: 4, ms: 60 });
      await settled(page);
      expect(await depth(page)).toBe(1);
      await expect(page.locator('#detail')).toBeVisible();
      await expect(page.locator('#home')).toBeHidden();
    });

    test('no edge swipe of its own where the phone has its own Back (Android, browsers)', async ({ sized }) => {
      const page = await sized(width);
      await page.goto('/ui/0.0.0-dev/kit/');
      await page.click('#push');
      await expect.poll(() => depth(page)).toBe(1);
      await settled(page);
      const f = await finger(page);
      const h = page.viewportSize().height;
      await f.down(4, h / 2);
      for (let x = 20; x <= 160; x += 20) { await f.move(x, h / 2 + 2); await page.waitForTimeout(16); }
      expect(await page.locator('#detail').evaluate(n => n.style.transform)).toBe('');   // the screen doesn't follow
      await expect(page.locator('.ui-swipe-shade')).toHaveCount(0);
      await f.up();
    });

    test('scrolling: the tab bar shrinks going down and comes back going up; the large title moves into the bar', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      const bar = page.locator('.ui-bar'), tabs = page.locator('.ui-tabbar');
      await expect(bar).not.toHaveClass(/is-collapsed/);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(max).toBeGreaterThan(120);
      for (let y = 25; y <= max; y += 25) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(20); }
      await expect(tabs).toHaveClass(/is-minimised/);
      await expect(bar).toHaveClass(/is-collapsed/);
      await expect(tabs.getByRole('link', { name: 'Rooms' })).toBeHidden();
      for (let y = max; y >= max - 80; y -= 20) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(20); }
      await expect(tabs).not.toHaveClass(/is-minimised/);
      await page.evaluate(() => scrollTo(0, 0));
      await expect(bar).not.toHaveClass(/is-collapsed/);
    });

    test('Still (this device): no lift, no slide; the switch is off until picked and kept', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(KIT);
      await expect(page.locator('#still')).not.toBeChecked();
      await page.check('#still');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'still');
      await page.locator('.ui-row').first().click({ button: 'right' });
      await page.waitForTimeout(100);
      await expect(page.locator('.ui-menu-preview')).not.toHaveClass(/is-lifted/);
      await page.keyboard.press('Escape');
      await page.click('#push');
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      await page.reload();
      await expect(page.locator('#still')).toBeChecked();
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'still');
    });
  });
}

test('the phone\'s own Reduce Motion counts as Still', async ({ sized }) => {
  const page = await sized(390);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(KIT);
  await page.click('#push');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('a page without the markup is left alone', async ({ phone }) => {
  const page = await phone();
  await page.goto('/test/plain.html');
  await expect(page.locator('#signed-out')).toBeVisible();
  const r = await page.evaluate(async () => { const { startGestures } = await import('@core/ui'); const g = startGestures(); const out = { menus: g.menus, screens: g.screens, sheets: g.sheets.size }; g.stop(); return out; });
  expect(r).toEqual({ menus: null, screens: null, sheets: 0 });
  await expect(page.locator('.ui-menu-layer')).toHaveCount(0);
});

test('an icon Select keeps its icon and name while off and says Done while on', async ({ phone }) => {
  const page = await phone();
  await page.goto('/test/plain.html');
  const r = await page.evaluate(async () => {
    const { selectMode, icon } = await import('@core/ui');
    document.body.insertAdjacentHTML('beforeend', '<button type="button" data-edit-for="#l" aria-label="Select"></button><ul id="l" class="ui-list" data-select><li class="ui-row">One</li></ul>');
    const b = /** @type {HTMLElement} */ (document.querySelector('[data-edit-for]'));
    b.append(icon([['path', { d: 'M20 6 9 17l-5-5' }]]));
    const m = selectMode(/** @type {HTMLElement} */ (document.getElementById('l')));
    const read = () => ({ text: b.textContent, svg: !!b.querySelector('svg'), name: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') });
    m.setEditing(true);
    const on = read();
    m.setEditing(false);
    const off = read();
    m.stop();
    return { on, off };
  });
  expect(r.on).toEqual({ text: 'Done', svg: false, name: null, pressed: 'true' });
  expect(r.off).toEqual({ text: '', svg: true, name: 'Select', pressed: 'false' });
});

// an open sheet or hold menu holds the page still: a wheel (or finger) on the backdrop doesn't scroll what is behind it
for (const width of [390, 1280]) {
  test(`at ${width} px an open sheet or hold menu keeps the page behind it still`, async ({ sized }) => {
    const page = await sized(width);
    await page.goto(KIT);
    await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
    const wheel = async () => { await page.mouse.move(width / 2, 40); await page.mouse.wheel(0, 600); await page.waitForTimeout(300); return page.evaluate(() => scrollY); };
    await page.click('#open-sheet');
    await expect(page.locator('#sheet')).toHaveJSProperty('open', true);
    expect(await wheel()).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#sheet')).toHaveJSProperty('open', false);
    // the menu's lifted preview stays on its row
    const row = page.locator('#plants .ui-row').first();
    await row.click({ button: 'right' });
    await expect(page.locator('.ui-menu')).toBeVisible();
    await settled(page);
    expect(await wheel()).toBe(0);
    const [p, r] = await page.evaluate(() => ['.ui-menu-preview', '#plants .ui-row'].map(s => document.querySelector(s).getBoundingClientRect().top));
    expect(Math.abs(p - r)).toBeLessThan(2);
    await page.keyboard.press('Escape');
    await expect(page.locator('.ui-menu')).toHaveCount(0);
    expect(await wheel()).toBeGreaterThan(0);   // closed: the page scrolls again
  });
}

// a phone with a home indicator (Chromium's safe-area override): sheets, the sheet menu and toasts clear it
test('at 390 px the sheet and the sheet menu clear the home indicator', async ({ sized }) => {
  const page = await sized(390);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34 } });
  await page.goto(`${KIT}&look=b`);   // look B: menus come up as a sheet
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  await page.click('#open-sheet');
  await page.locator('#sheet .ui-sheet-grabber').click();   // full height: the body's end is on screen
  await settled(page);
  const bodyEnd = await page.evaluate(() => { const b = document.querySelector('#sheet .ui-sheet-body'); b.scrollTop = b.scrollHeight;
    const last = b.lastElementChild.getBoundingClientRect().bottom; return innerHeight - last; });
  expect(bodyEnd).toBeGreaterThanOrEqual(34);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).toBeHidden();
  await settled(page);   // closed, the sheet hands focus back to its opener; only then focus the row
  const first = page.locator('#plants .ui-row').first();
  await first.focus();   // (Shift+F10: a mouse's right-click opens the menu at the pointer)
  await expect(first).toBeFocused();
  await page.keyboard.press('Shift+F10');
  await expect(page.locator('.ui-menu.is-sheet')).toBeVisible();
  await settled(page);
  expect(await page.evaluate(() => innerHeight - document.querySelector('.ui-menu').getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(34);
});

test('at 390 px a toast clears the home indicator on a page without a tab bar', async ({ sized }) => {
  const page = await sized(390);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34 } });
  await page.goto('/test/plain.html');
  await expect(page.locator('#signed-out')).toBeVisible();
  await page.evaluate(async () => { const { toaster } = await import('@core/ui'); toaster(document.body).show('Saved'); });
  const toast = page.locator('.toast', { hasText: 'Saved' });
  await expect(toast).toBeVisible();
  await settled(page);
  const box = await toast.boundingBox();
  expect(844 - (box.y + box.height)).toBeGreaterThanOrEqual(34 + 16);
});

// motion (owner's review 27 Oct): a push slides the new screen in over the old one, not below it; a phone sheet's drag
// and settle move it by transform only; menus and bars take the quick 340 ms, sheets keep 480; a press shows at once
test('at 390 px a push overlaps the screens; the sheet drags by transform only; quick and sheet durations', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(KIT);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  // scrolled down a little, then a push (clicked in the page, so nothing scrolls first); read mid-slide
  const mid = await page.evaluate(() => {
    scrollTo(0, Math.min(150, document.documentElement.scrollHeight - innerHeight));
    const y = scrollY, home = document.querySelector('#home'), title = document.querySelector('#home-title');
    const before = title.getBoundingClientRect().top;
    document.querySelector('#push').click();
    return { y, before, home: title.getBoundingClientRect().top, under: home.classList.contains('is-under'),
      detail: document.querySelector('#detail').getBoundingClientRect().top, host: document.querySelector('.ui-screens').getBoundingClientRect().top };
  });
  expect(mid.y).toBeGreaterThan(50);
  const before = mid.before;
  expect(mid.under).toBe(true);
  expect(Math.abs(mid.home - before)).toBeLessThan(2);
  expect(mid.detail - mid.host).toBeLessThan(40);   // (not below the old screen)
  await settled(page);
  await expect(page.locator('#home')).toBeHidden();
  await page.goBack();
  await expect.poll(() => depth(page)).toBe(0);
  await settled(page);
  // back where it was on screen (scroll anchoring may move scrollY by the bar's change)
  expect(Math.abs(await page.locator('#home-title').evaluate(n => n.getBoundingClientRect().top) - before)).toBeLessThan(2);

  const quick = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--d-quick').trim());
  expect(quick).toBe('340ms');
  expect(await page.locator('.ui-bar').evaluate(n => getComputedStyle(n).transitionDuration)).toMatch(/^0\.34s/);

  await page.evaluate(() => scrollTo(0, 0));
  await page.click('#open-sheet');
  const sheet = page.locator('#sheet');
  await settled(page);
  const f = await finger(page);
  const g = await centre(page.locator('.ui-sheet-grabber'));
  await f.down(g.x, g.y);
  const heights = [];
  for (const d of [-40, 30, -80, 60, -120, 20, -10, -10, -10, -10]) {   // up and down, then still (no flick)
    await f.move(g.x, g.y + d);
    await page.waitForTimeout(16);
    heights.push(await sheet.evaluate(n => n.style.height));
  }
  await f.up();
  expect(new Set(heights).size).toBe(1);   // the same box all the drag, up and down: only the transform moves
  await settled(page);
  expect(await sheet.evaluate(n => n.getAttribute('style') || '')).not.toMatch(/height|transform/);
  const b = await sheet.boundingBox();
  expect(Math.round(b.y + b.height)).toBe(page.viewportSize().height);
});

// closing is animated too: the sheet slides down to the bottom edge before it shuts; the hold menu's copy fades out,
// inert and unnamed, and is gone within 400 ms; Still closes both at once
test('at 390 px a sheet slides down as it closes; a closed menu fades out, inert; Still closes at once', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(`${KIT}&look=e`);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  await page.click('#open-sheet');
  const sheet = page.locator('#sheet');
  await settled(page);
  const top = (await sheet.boundingBox()).y;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(90);
  const mid = await sheet.evaluate(n => ({ open: n.open, y: n.getBoundingClientRect().y }));
  expect(mid.open).toBe(true);
  expect(mid.y).toBeGreaterThan(top + 4);
  await expect.poll(() => sheet.evaluate(n => n.open)).toBe(false);

  await page.locator('#plants .ui-row').nth(1).click({ button: 'right' });
  await expect(page.locator('.ui-menu[role="menu"]')).toBeVisible();
  await settled(page);
  await page.keyboard.press('Escape');
  const ghost = await page.evaluate(() => {
    const g = document.querySelector('.ui-menu-layer.is-leaving');
    return g && { inert: g.inert, hidden: g.getAttribute('aria-hidden'), roles: g.querySelectorAll('[role]').length };
  });
  expect(ghost).toEqual({ inert: true, hidden: 'true', roles: 0 });
  await expect(page.locator('[role="menu"]')).toHaveCount(0);
  await expect(page.locator('.is-leaving')).toHaveCount(0, { timeout: 600 });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('#open-sheet');
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await sheet.evaluate(n => n.open)).toBe(false);
});

// R3 (owner 27 Oct): only a floating tab bar shrinks to the current tab; one along the edge (looks B, C) keeps them all
test('at 390 px an edge tab bar keeps every tab when scrolled', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(`${KIT}&look=b`);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-tabbar', 'edge');
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 25; y <= max; y += 25) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(20); }
  await expect(page.locator('.ui-tabbar')).toHaveClass(/is-minimised/);
  await expect(page.locator('.ui-tabbar').getByRole('link', { name: 'Rooms' })).toBeVisible();
});

// components (owner's review): Back in the bar; bar buttons on one line; sheet head, chip row and controls; the action
// bar's count and off state, along the edge in look C; serif only on page titles
test('at 390 px: Back sits in the bar; Select all on one line; the sheet, controls and action bar read clearly', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(`${KIT}&look=a`);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  const back = page.locator('.ui-bar .ui-bar-back');
  await expect(back).toBeHidden();
  await page.click('#push');
  await expect(back).toBeVisible();
  await expect(back).toHaveText('Plants');
  await expect(page.locator('#detail > .ui-back')).toBeHidden();
  const [bb, bar] = [await back.boundingBox(), await page.locator('.ui-bar').boundingBox()];
  expect(bb.y >= bar.y && bb.y + bb.height <= bar.y + bar.height + 1).toBe(true);
  await page.click('#push-more');
  await expect(back).toHaveText('Details');
  await back.click();
  await expect.poll(() => depth(page)).toBe(1);
  await back.click();
  await expect.poll(() => depth(page)).toBe(0);
  await expect(back).toBeHidden();

  // serif (look A) on the page title only
  const face = sel => page.locator(sel).evaluate(e => getComputedStyle(e).fontFamily);
  expect(await face('#home-title')).toMatch(/serif/);
  expect(await face('#sheet-title')).not.toMatch(/Georgia/);

  // controls a finger can hit
  for (const sel of ['#look-pick', '#density-pick']) expect((await page.locator(sel).boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await page.locator('#still').boundingBox()).width).toBeGreaterThanOrEqual(20);

  // select mode: Select all on one line; the count in the text colour; an off button faded, Delete red
  await page.click('#select');
  const all = await page.locator('.ui-bar [data-select-all]').boundingBox();
  expect(all.height).toBeLessThanOrEqual(48);
  await page.locator('#plants .ui-row').first().click();
  const look = await page.evaluate(() => {
    const st = s => getComputedStyle(document.querySelector(s));
    return { count: st('[data-select-count]').color, text: getComputedStyle(document.body).color,
      off: st('#compare').opacity, del: st('#delete-selected').color, danger: st('.ui-menu-item.danger, .danger').color };
  });
  expect(look.count).toBe(look.text);
  expect(look.off).toBe('0.4');
  expect(look.del).toBe(look.danger);
  await page.click('#select');

  // the sheet: Done is a word, not a pill; the chip row runs to the sheet's edges
  await page.click('#open-sheet');
  await settled(page);
  const done = await page.locator('#sheet [data-close]').evaluate(e => getComputedStyle(e).borderTopStyle);
  expect(done).toBe('none');
  const [chips, sheet] = [await page.locator('#sheet .kit-chips').boundingBox(), await page.locator('#sheet').boundingBox()];
  expect(Math.abs(chips.x - sheet.x)).toBeLessThan(2);
  expect(Math.abs(chips.x + chips.width - sheet.x - sheet.width)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).toBeHidden();

  // look C: the action bar along the bottom edge, like its tab bar
  const pageC = await sized(390);
  await pageC.goto(`${KIT}&look=c`);
  await pageC.click('#select');
  const ab = await pageC.locator('.ui-action-bar').boundingBox();
  expect(ab.x).toBe(0);
  expect(Math.round(ab.y + ab.height)).toBe(844);
});

// the owner's review: the sync chip on made-up states; no pull-to-refresh; plain demo words; an installable gallery
test('the sync chip shows each state in its word, with a count where there is one; axe clean', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(KIT);
  const chip = page.locator('#status');
  const word = chip.locator('.ui-chip-text');
  await expect(word).toHaveText('Saved');
  await expect(chip).toHaveAttribute('role', 'status');
  await expect(chip.locator('svg.ui-icon')).toHaveCount(1);
  for (const [state, text] of [['pending', 'Sending… (3)'], ['offline', 'Offline, kept on this device (2)'], ['attention', 'Needs you'],
    ['unknown', 'Connecting…'], ['at-risk', 'Not saved on this device yet (1)'], ['synced', 'Saved']]) {
    await page.locator('#sync-pick').selectOption(state);
    await expect(word).toHaveText(text);
    await expect(chip).toHaveAttribute('data-state', state);
    const count = text.match(/\((\d+)\)$/)?.[1] ?? '';
    await expect(chip.locator('.ui-chip-badge')).toHaveText(count);
  }
  // colour by state: saved is green, offline amber, attention red (the theme's --ok, --warn, --danger)
  const colourOf = async (/** @type {string} */ state) => { await page.locator('#sync-pick').selectOption(state); return chip.evaluate(e => getComputedStyle(e).color); };
  const [ok, warn, bad] = [await colourOf('synced'), await colourOf('offline'), await colourOf('attention')];
  expect(new Set([ok, warn, bad]).size, 'three different colours').toBe(3);
  await page.locator('#sync-pick').selectOption('attention');
  expect(await AxeBuilder(page)).toEqual([]);
});

// look E keeps the bar quiet: synced is the icon alone (the word still read out), any other state shows its word; the
// search box is filled, with no line round it
test('look E: the synced chip is its icon (word read out), other states show the word; the search box has no line', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(`${KIT}&look=e`);
  const chip = page.locator('#status'), word = chip.locator('.ui-chip-text');
  await page.locator('#sync-pick').selectOption('synced');
  expect((await word.boundingBox())?.width ?? 0).toBeLessThanOrEqual(1);
  await expect(word).toHaveText('Saved');   // (in the page for a reader, only out of sight)
  await page.locator('#sync-pick').selectOption('offline');
  expect((await word.boundingBox())?.width).toBeGreaterThan(20);
  await page.goto('/ui/0.0.0-dev/kit/shell/?look=e');
  const search = page.locator('.ui-search').first();
  expect(await search.evaluate(e => getComputedStyle(e).borderTopColor)).toBe('rgba(0, 0, 0, 0)');
});

for (const path of ['', 'shell/', 'dense/', 'settings/', 'parts/']) {
  test(`kit/${path}: no pull-to-refresh; demo words, not notes; installable, never prompted`, async ({ sized, request }) => {
    const page = await sized(390);
    await page.goto(`/ui/0.0.0-dev/kit/${path}?edge=always`);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe('none');
    const words = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll('dialog')].map(d => d.textContent).join(' '));
    for (const note of [/made-up paragraph/i, /pushed screen/i, /history entry/i, /\(this (device|screen)\)/i, /\bNext:/, /from 840 px/])
      expect(words).not.toMatch(note);
    // the manifest and its icons are served; the page cancels the browser's own install prompt
    const href = await page.locator('link[rel="manifest"]').evaluate(l => /** @type {HTMLLinkElement} */ (l).href);
    const res = await request.get(href);
    expect(res.headers()['content-type']).toBe('application/manifest+json');
    const manifest = await res.json();
    expect(manifest.display).toBe('standalone');
    // installed, it starts at the fixed /ui/kit/ (a 302 to the newest gallery), one app id across versions
    expect([manifest.id, manifest.start_url, manifest.scope]).toEqual(['/ui/kit/', '/ui/kit/', '/ui/']);
    for (const icon of manifest.icons) expect((await request.get(new URL(icon.src, href).href)).status()).toBe(200);
    expect(manifest.icons.map(i => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      dispatchEvent(e);
      return e.defaultPrevented;
    })).toBe(true);
    // the service worker (scope: kit/) takes the page over
    const scope = await page.evaluate(() => navigator.serviceWorker.ready.then(r => r.scope));
    expect(new URL(scope).pathname).toBe('/ui/0.0.0-dev/kit/');
    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  });
}

test('buttons are centred and one height, rounder than list cards; theme-color follows the page; icons are svg', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(KIT);
  const b = await page.locator('button:visible').first().evaluate(e => {
    const s = getComputedStyle(e);
    return { display: s.display, align: s.alignItems, justify: s.justifyContent, radius: parseFloat(s.borderTopLeftRadius), h: e.getBoundingClientRect().height };
  });
  expect(b.display).toMatch(/flex/);
  expect([b.align, b.justify]).toEqual(['center', 'center']);
  expect(b.h).toBeGreaterThanOrEqual(44);
  const metas = await page.locator('meta[name="theme-color"]').evaluateAll(ms => ms.map(m => [m.getAttribute('media'), m.getAttribute('content')]));
  expect(metas.map(m => m[0])).toEqual(['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']);
  expect(metas.every(m => /^#[0-9a-f]{6}$/i.test(m[1] ?? ''))).toBe(true);
  await page.goto("/ui/0.0.0-dev/kit/shell/?edge=always");
  expect(await page.locator('.ui-tabbar .ui-tab svg.ui-icon').count()).toBeGreaterThanOrEqual(4);
});

test('at 390 px a sheet opened, or a page pushed, as another sheet closes is not undone by its late step back', async ({ sized }) => {
  const page = await sized(390);
  await page.goto(KIT);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  // a second sheet, opened in the same task as the first one's close (its step back still on the way)
  await page.evaluate(async () => {
    const { detentSheet } = await import('../ui/detent-sheet.js');
    const d = document.createElement('dialog');
    d.className = 'ui-sheet'; d.id = 'sheet-two'; d.dataset.detents = 'medium';
    d.setAttribute('aria-label', 'Second'); d.innerHTML = '<div class="ui-sheet-body"><p>Second</p></div>';
    document.body.append(d);
    /** @type {any} */ (window).two = detentSheet(d);
  });
  await page.click('#open-sheet');
  await settled(page);
  await page.evaluate(() => { document.querySelector('#sheet [data-close]').click(); window.two.open(); });
  await page.waitForTimeout(800);
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#sheet-two')).toBeVisible();
  await page.goBack();   // Back closes the second sheet, and stays on the page
  await expect(page.locator('#sheet-two')).toBeHidden();
  await expect(page).toHaveURL(/\/ui\/0\.0\.0-dev\/kit\//);

  // a page pushed after sheetsSettled() stays
  await page.click('#open-sheet');
  await settled(page);
  await page.evaluate(async () => {
    const { sheetsSettled } = await import('../ui/index.js');
    document.querySelector('#sheet [data-close]').click();
    await sheetsSettled();
    location.hash = '#pushed';
  });
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/#pushed$/);
});

test('a single-pane shell: rows that are links or buttons look like rows; the tab bar leaves room under the last row; from 600 px the bar stays', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/test/single-pane.html');
  await expect.poll(() => page.evaluate(() => !!window.app)).toBe(true);
  const look = await page.evaluate(() => {
    const css = sel => getComputedStyle(document.querySelector(sel));
    const [a, b] = [css('#rows a.ui-row'), css('#button-row')];
    return { line: a.textDecorationLine, aColor: a.color, bColor: b.color, text: css('#home').color, bBorder: b.borderTopWidth,
      bWidth: document.querySelector('#button-row').getBoundingClientRect().width,
      listWidth: document.querySelector('#rows').getBoundingClientRect().width,
      sep: css('#rows > li + li > .ui-row').backgroundImage, marker: css('#rows > li').listStyleType };
  });
  expect(look.line).toBe('none');
  expect(look.aColor).toBe(look.text);
  expect(look.bColor).toBe(look.text);
  expect(look.bBorder).toBe('0px');
  expect(Math.abs(look.bWidth - look.listWidth)).toBeLessThan(2);
  expect(look.sep).toContain('linear-gradient');
  expect(look.marker).toBe('none');
  // scrolled to the end, the last line sits above the tab bar
  const room = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-tabbar-room'));
  expect(parseFloat(room)).toBeGreaterThan(40);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const last = await page.locator('#last').boundingBox(), tabs = await page.locator('.ui-tabbar').boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(tabs.y);
  // wide: no tab bar, no room, and the bar beside the side bar
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-tabbar-room'))).toBe('0px');
  await expect(page.locator('.ui-bar')).toBeVisible();
  await expect(page.locator('#new')).toBeVisible();
  const bar = await page.locator('.ui-bar').boundingBox(), side = await page.locator('.ui-sidebar').boundingBox();
  expect(bar.x).toBeGreaterThanOrEqual(side.x + side.width - 1);
  expect(await AxeBuilder(page)).toEqual([]);
});
