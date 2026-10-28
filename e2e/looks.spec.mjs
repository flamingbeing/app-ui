// @core/theme's looks (A tinted glass, B colour band, C dense and quiet, D slim) on the /kit/ gallery at phone, tablet and
// laptop widths: axe, the variants each look names, screenshots kept for the PR; the densities' row heights; the look
// and density switchers; the glass guard on a device with little memory. The list is docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const KIT = '/ui/0.0.0-dev/kit/?edge=always';
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
/** @param {import('@playwright/test').Page} page @param {string} sel @param {string} prop */
const style = (page, sel, prop) => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

// what each look shows (looks/*.js): the <html> marks, and a computed style or two that only that look has
const LOOKS = {
  a: { header: 'plain', menu: 'popover', glass: 'bars', tick: 'round', tabbar: 'float', glassClass: true },
  b: { header: 'band', menu: 'sheet', glass: 'none', tick: 'square', tabbar: 'edge', glassClass: false },
  c: { header: 'plain', menu: 'popover', glass: 'pill', tick: 'round', tabbar: 'edge', glassClass: true },
  d: { header: 'slim', menu: 'popover', glass: 'none', tick: 'round', tabbar: 'edge', glassClass: false },
};

for (const width of [390, 820, 1280]) {
  test.describe(`at ${width} px`, () => {
    for (const [id, want] of Object.entries(LOOKS)) {
      test(`look ${id.toUpperCase()}: its variants, clean (axe), select mode and the hold menu; screenshots kept`, async ({ sized }, info) => {
        const page = await sized(width);
        await page.goto(`${KIT}&look=${id}`);
        const root = page.locator('html');
        await expect(root).toHaveAttribute('data-look', id);
        for (const k of ['header', 'menu', 'glass', 'tick', 'tabbar']) await expect(root).toHaveAttribute(`data-${k}`, want[k]);
        if (want.glassClass) await expect(root).toHaveClass(/\bglass\b/); else await expect(root).not.toHaveClass(/\bglass\b/);
        await expect(page.locator('#look-pick')).toHaveValue(id);

        const title = page.locator('#home-title');
        if (want.header === 'band') expect(await style(page, '#home-title', 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
        else expect(await style(page, '#home-title', 'background-color')).toBe('rgba(0, 0, 0, 0)');
        const tabbar = await page.locator('.ui-tabbar').boundingBox();
        if (want.tabbar === 'edge') expect(tabbar.width).toBe(width);
        else expect(tabbar.width).toBeLessThan(width);
        expect(await style(page, '.ui-list', 'border-top-left-radius')).toMatch(id === 'c' ? /^0px$/ : /^[1-9]/);   // C flush, the rest cards (D's rows are inset cards since rc.14)
        if (id === 'c') expect(await style(page, '.ui-bar', 'backdrop-filter')).toBe('none');
        if (want.header === 'slim') {   // no large title on show: the bar names the page from the start
          expect(await style(page, '.ui-bar-title', 'opacity')).toBe('1');
          expect((await title.boundingBox()).height).toBeLessThanOrEqual(1);
          expect(await style(page, '.ui-list', 'background-color'), 'D lists are cards on the page: the surface, not the page colour').not.toBe(await style(page, 'body', 'background-color'));
        }
        await expect(title).toBeVisible();
        await settled(page);
        expect(await AxeBuilder(page), `look ${id} at ${width}`).toEqual([]);
        await page.screenshot({ path: info.outputPath(`look-${id}-${width}.png`) });

        await page.locator('#select').click();
        await page.locator('#plants .ui-row').nth(1).click();
        await page.locator('#plants .ui-row').nth(2).click();
        const tickR = await page.locator('#plants .ui-row').nth(1).evaluate(e => getComputedStyle(e, '::before').borderTopLeftRadius);
        if (want.tick === 'square') expect(tickR).not.toBe('50%'); else expect(tickR).toBe('50%');
        await settled(page);
        expect(await AxeBuilder(page), `look ${id} at ${width}: select mode`).toEqual([]);
        await page.screenshot({ path: info.outputPath(`look-${id}-${width}-select.png`) });
        await page.locator('#select').click();

        await page.locator('#plants .ui-row').nth(2).focus();
        await page.keyboard.press('Shift+F10');
        const menu = page.locator('.ui-menu');
        await expect(menu).toBeVisible();
        if (want.menu === 'sheet' && width < 840) {
          await expect(menu).toHaveClass(/\bis-sheet\b/);
          await settled(page);
          const b = await menu.boundingBox();
          expect(Math.round(b.y + b.height)).toBe(page.viewportSize().height - 8);   // on the bottom edge
          await expect(page.locator('.ui-menu-preview')).toHaveCount(0);   // named in its head, no copy over the list
          await expect(menu.locator('.ui-menu-head')).toHaveText('Fig');
          await expect(page.locator('.ui-tabbar')).toBeHidden();
        } else await expect(menu).not.toHaveClass(/\bis-sheet\b/);
        await settled(page);
        expect(await AxeBuilder(page), `look ${id} at ${width}: hold menu`).toEqual([]);
        await page.screenshot({ path: info.outputPath(`look-${id}-${width}-menu.png`) });
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
      });
    }
  });
}

// dark: every look's gallery and shell pass axe (the current tab and side item, links, keys on the selection colour);
// look B's band is the accent deepened under white text; menus, sheets and the action bar are solid card colour
const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';
const solid = (page, sel) => page.locator(sel).first().evaluate(e => ({ bg: getComputedStyle(e).backgroundColor, blur: getComputedStyle(e).backdropFilter }));
for (const width of [390, 1280]) {
  test(`at ${width} px dark: each look's gallery and shell are clean (axe); B's band takes white text; menus and sheets are solid`, async ({ sized }) => {
    const page = await sized(width);
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const id of ['a', 'b', 'c', 'd']) {
      for (const url of [`${KIT}&look=${id}`, `${SHELL}&look=${id}`]) {
        await page.goto(url);
        await settled(page);
        expect(await AxeBuilder(page), `${url} dark`).toEqual([]);
      }
      await page.goto(`${KIT}&look=${id}`);
      if (id === 'b') expect(await style(page, '#home-title', 'color')).toBe('rgb(255, 255, 255)');
      await page.locator('#plants .ui-row').nth(1).click({ button: 'right' });
      await expect(page.locator('.ui-menu')).toBeVisible();
      await settled(page);
      const m = await solid(page, '.ui-menu');
      expect(m.blur, `look ${id} menu`).toBe('none');
      expect(m.bg).not.toMatch(/rgba\(.*, 0\.\d+\)$/);
      await page.keyboard.press('Escape');
      await page.click('#open-sheet');
      await settled(page);
      const sh = await solid(page, '#sheet');
      expect(sh.blur, `look ${id} sheet`).toBe('none');
      expect(sh.bg).not.toMatch(/rgba\(.*, 0\.\d+\)$/);
      await page.keyboard.press('Escape');
      await page.click('#select');
      const bar = await solid(page, '.ui-action-bar');
      expect(bar.blur, `look ${id} action bar`).toBe('none');
      expect(bar.bg).not.toMatch(/rgba\(.*, 0\.\d+\)$/);
    }
  });
}

test('densities: rows 60, 50 and 44 px; taps never under 44; the switcher keeps a pick and drops the link\'s preview', async ({ sized }) => {
  const page = await sized(390);   // (the gallery loads no app bundle: not the phone fixture's APP_DIR check)
  const row = () => page.locator('#plants .ui-row').first().evaluate(e => e.getBoundingClientRect().height);
  for (const [density, h] of [['comfortable', 60], ['regular', 50], ['compact', 44]]) {
    await page.goto(`${KIT}&density=${density}`);
    expect(await row(), density).toBeGreaterThanOrEqual(h);
    expect(await row(), density).toBeLessThan(h + 12);   // (two lines of text can make it taller, never much)
    const tap = await page.locator('#open-sheet').evaluate(e => e.getBoundingClientRect().height);
    expect(tap, `${density}: tap height`).toBeGreaterThanOrEqual(44);
  }
  await page.goto(KIT);
  await expect(page.locator('html')).not.toHaveAttribute('data-density');
  await page.goto(`${KIT}&look=b`);
  await page.locator('#density-pick').selectOption('compact');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  expect(new URL(page.url()).searchParams.get('look')).toBeNull();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await expect(page.locator('html')).toHaveAttribute('data-look', 'a', '(the link\'s look B was a preview, not kept)');
  await page.locator('#look-pick').selectOption('c');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-look', 'c');
});

test('glass guard: little memory turns glass down, kept on this device; Solid and "Glass, even here" still win', async ({ browser }) => {
  // (its own context: the fixtures' seed says the device is fast)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'deviceMemory', { configurable: true, get: () => 2 }));
  const page = await context.newPage();
  await page.goto('/test/plain.html');
  const root = page.locator('html');
  await expect(root).not.toHaveClass(/\bglass\b/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('core-glass-guard') || 'null'))).toEqual({ solid: true, why: 'memory' });
  await expect(page.getByLabel('Bars and sheets')).toHaveValue('glass');
  await expect(page.locator('.guard-note')).toContainText('little memory');
  await page.reload();
  await expect(root).not.toHaveClass(/\bglass\b/);

  await page.getByLabel('Bars and sheets').selectOption('always');
  await expect(root).toHaveClass(/\bglass\b/);
  await expect(page.locator('.guard-note')).toBeHidden();
  await page.getByLabel('Bars and sheets').selectOption('solid');
  await expect(root).not.toHaveClass(/\bglass\b/);
  expect(await AxeBuilder(page)).toEqual([]);
  await context.close();
});

// the owner's desktop review: on a laptop the top bar runs the full width with its ends lined up with the content, and
// an edge tab bar keeps its tabs together in the middle
for (const look of ['a', 'b', 'c', 'd']) {
  test(`at 1280 px look ${look.toUpperCase()}: the bar is full width, its title centred; tabs stay together`, async ({ sized }) => {
    const page = await sized(1280);
    for (const path of ['', 'dense/']) {
      await page.goto(`/ui/0.0.0-dev/kit/${path}?edge=always&look=${look}`);
      await expect(page.locator('html')).toHaveAttribute('data-look', look);
      const bar = await page.locator('body > .ui-bar').boundingBox();
      expect(bar.x, path).toBeLessThanOrEqual(0);
      expect(bar.width, path).toBeGreaterThanOrEqual(1279);
      const title = await page.locator('.ui-bar-title').boundingBox();
      expect(Math.abs(title.x + title.width / 2 - 640), path).toBeLessThanOrEqual(2);
      // the bar's start lines up with the large title's words; the gallery's column is narrower than the screen
      const lead = (await page.locator('body > .ui-bar > :first-child').boundingBox()).x;
      const words = await page.locator('main h1').first().evaluate(h => h.getBoundingClientRect().x + parseFloat(getComputedStyle(h).paddingLeft));
      expect(Math.abs(lead - words), path).toBeLessThanOrEqual(1);
      if (!path) expect(lead).toBeGreaterThan(100);
      const tabs = await page.locator('nav.ui-tabbar .ui-tab').evaluateAll(t => t.map(e => e.getBoundingClientRect()).map(r => ({ l: r.left, r: r.right })));
      const left = tabs[0].l, right = tabs.at(-1).r;
      expect(Math.abs((left + right) / 2 - 640), path).toBeLessThanOrEqual(2);
      for (let i = 1; i < tabs.length; i++) expect(tabs[i].l - tabs[i - 1].r, path).toBeLessThanOrEqual(8);
    }
  });
}
