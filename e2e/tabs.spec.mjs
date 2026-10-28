// Tab pages and their swipe (ui/tab-pages.js), plain tabs and bar buttons, and the phone's side-bar drawer, on the
// /kit/shell/ gallery with an emulated finger. The list of what is covered is docs/kit-tests.md, "Tab pages".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';

// a finger, through the DevTools protocol (Playwright's own touchscreen only taps)
async function finger(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  return {
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
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
const shown = page => page.evaluate(() => [...document.querySelectorAll('.ui-screens > .ui-screen')].filter(s => !s.hidden).map(s => s.id));
async function load(sized, query = '', width = 390) {
  const page = await sized(width);
  await page.goto(`${SHELL}${query}`);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  return page;
}
/** a sideways swipe across the middle of the page, from x0 to x1 */
async function swipe(page, x0, x1, y = 420) {
  await (await finger(page)).drag(x0, y, x1, y);
  await settled(page);
}

for (const look of ['a', 'b', 'c', 'd']) {
  test(`look ${look}: <button> tabs and bar buttons have no border or fill; bar buttons are link-coloured, New bold`, async ({ sized }) => {
    const page = await load(sized, `&look=${look}`);
    const tabs = await page.locator('nav.ui-tabbar button.ui-tab').evaluateAll(els => els.map(e => {
      const c = getComputedStyle(e);
      return { border: c.borderTopWidth, bg: c.backgroundColor, icon: !!e.querySelector('.ui-tab-icon') };
    }));
    expect(tabs).toHaveLength(5);
    // no border; no fill but the current tab's own (the look's --tab-active)
    const active = await page.evaluate(() => {
      const p = document.createElement('span');
      p.style.backgroundColor = 'var(--tab-active)';
      document.body.append(p);
      const c = getComputedStyle(p).backgroundColor;
      p.remove();
      return c;
    });
    for (const [i, t] of tabs.entries()) expect(t).toEqual({ border: '0px', bg: i === 0 ? active : 'rgba(0, 0, 0, 0)', icon: true });
    // the icon sits above the label
    const tab = page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Rooms' });
    const [icon, box] = await Promise.all([tab.locator('.ui-tab-icon').boundingBox(), tab.boundingBox()]);
    expect(icon.y + icon.height).toBeLessThan(box.y + box.height - 8);
    const bar = await page.locator('.ui-bar button:visible').evaluateAll(els => els.map(e => {
      const c = getComputedStyle(e);
      const probe = document.createElement('span');
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue(
        document.documentElement.dataset.header === 'band' ? '--on-band' : '--link');
      document.body.append(probe);
      const want = getComputedStyle(probe).color;
      probe.remove();
      return { text: e.textContent.trim(), border: c.borderTopWidth, bg: c.backgroundColor, colour: c.color === want, weight: c.fontWeight };
    }));
    for (const b of bar) {
      expect(b.border, b.text).toBe('0px');
      expect(b.bg, b.text).toBe('rgba(0, 0, 0, 0)');
      expect(b.colour, `${b.text}: the link colour (the band's text on a band)`).toBe(true);
    }
    expect(bar.find(b => b.text === 'New')?.weight).toBe('600');
    expect(await AxeBuilder(page)).toEqual([]);
  });
}

test('tapping a tab shows its page, marks both bars and names the bar; New opens the sheet and is no page', async ({ sized }) => {
  const page = await load(sized);
  expect(await shown(page)).toEqual(['home']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Rooms' }).click();
  expect(await shown(page)).toEqual(['rooms']);
  await expect(page.locator('.ui-bar-title')).toHaveText('Rooms');
  await expect(page.locator('.ui-tab[aria-current="page"], .ui-side-link[aria-current="page"]')).toHaveText(['Rooms', /Rooms$/]);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'New' }).click();
  await expect(page.locator('#sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await shown(page)).toEqual(['rooms']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  expect(await shown(page)).toEqual(['home']);
  await expect(page.locator('.ui-bar-title')).toHaveText('Plants');
});

test('swipe: left goes to the next tab page (skipping the sheet tab), right comes back; the ends hold', async ({ sized }) => {
  const page = await load(sized);
  const events = page.evaluate(() => new Promise(r => { const got = []; addEventListener('ui-tab', e => { got.push(e.detail.page.id); if (got.length === 3) r(got); }); }));
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['rooms']);
  await swipe(page, 300, 60);
  expect(await shown(page), 'past New, which opens a sheet').toEqual(['jobs']);
  await expect(page.locator('#sheet')).toBeHidden();
  await swipe(page, 60, 300);
  expect(await shown(page)).toEqual(['rooms']);
  expect(await events).toEqual(['rooms', 'jobs', 'rooms']);
  await swipe(page, 60, 300);
  await swipe(page, 60, 300);
  expect(await shown(page), 'nothing before the first page').toEqual(['home']);
  // a short, slow move goes back to where it was; nothing is left moved
  await (await finger(page)).drag(250, 420, 200, 420, { steps: 10, ms: 40 });
  await settled(page);
  expect(await shown(page)).toEqual(['home']);
  expect(await page.locator('#home').evaluate(e => e.style.transform)).toBe('');
});

test('swipe: the page follows the finger, the next one beside it', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await send('touchStart', 300, 420);
  for (const x of [290, 270, 240, 200]) await send('touchMove', x, 420);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(40); await send('touchMove', 200 + (i % 2), 420); }   // held: no flick
  const at = await page.evaluate(() => ['home', 'rooms'].map(id => { const e = document.getElementById(id); return [!e.hidden, Math.round(e.getBoundingClientRect().x)]; }));
  expect(at[0][0]).toBe(true);
  expect(Math.abs(at[0][1] + 100)).toBeLessThanOrEqual(1);
  expect(at[1][0]).toBe(true);
  expect(Math.abs(at[1][1] - 290)).toBeLessThanOrEqual(1);
  await send('touchEnd', 0, 0);
  await settled(page);
  expect(await shown(page)).toEqual(['home']);
});

test('swipe does nothing: a vertical scroll, the back edge, a sideways scroller, a field, a pushed screen, swipe off', async ({ sized }) => {
  const page = await load(sized);
  // mostly vertical
  await (await finger(page)).drag(200, 600, 150, 300);
  await settled(page);
  expect(await shown(page)).toEqual(['home']);
  // from within 24 px of either edge (the browser's own Back may take it: a spare history entry keeps the page)
  const tabbed = page.evaluate(() => new Promise(r => { addEventListener('ui-tab', () => r(true)); setTimeout(() => r(false), 3000); }));
  await page.evaluate(() => history.pushState({}, ''));
  await swipe(page, 12, 300);
  await page.evaluate(() => history.pushState({}, ''));
  await swipe(page, 380, 100);
  expect(await tabbed, 'no tab change from the edges').toBe(false);
  expect(await shown(page)).toEqual(['home']);
  // in the Jobs page's chips (a sideways scroller) and in a field on Settings
  await page.goto(`${SHELL}&tab=jobs`);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  const chips = await page.locator('#job-chips').boundingBox();
  await swipe(page, 300, 60, chips.y + chips.height / 2);
  expect(await shown(page)).toEqual(['jobs']);
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['settings']);
  const field = await page.locator('#shelf-name').boundingBox();
  await swipe(page, field.x + field.width - 10, 40, field.y + field.height / 2);
  expect(await shown(page)).toEqual(['settings']);
  // on a pushed screen: the swipe is the screen's own (edge back), not a tab change
  await page.goto(SHELL);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  await page.locator('#plants .ui-row', { hasText: 'Basil' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await swipe(page, 300, 60);
  expect(await page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await expect(page.locator('.ui-pane-detail')).toBeVisible();
  // turned off by the app
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(0);
  await page.evaluate(() => { document.querySelector('nav.ui-tabbar').dataset.swipe = 'off'; });
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['home']);
});

test('swipe with Reduce Motion: the tab changes without the slide', async ({ sized }) => {
  const page = await load(sized);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await send('touchStart', 300, 420);
  for (const x of [280, 240, 180, 100, 60]) await send('touchMove', x, 420);
  expect(await page.evaluate(() => [document.getElementById('home').style.transform, document.getElementById('rooms').hidden])).toEqual(['', true]);
  await send('touchEnd', 0, 0);
  await expect.poll(() => shown(page)).toEqual(['rooms']);
});

test('a tab page keeps its scroll; tapping the current tab over a pushed screen goes back to it', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(() => scrollTo(0, 200));
  // (the scrolled tab bar is shrunk to its current tab; the others are still there to press)
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Rooms' }).dispatchEvent('click');
  await expect.poll(() => shown(page)).toEqual(['rooms']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(0);
  expect(await shown(page)).toEqual(['home']);
  // another tab from a pushed screen: back first, then the page
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Jobs' }).click();
  await expect.poll(() => shown(page)).toEqual(['jobs']);
  expect(await page.evaluate(() => [window.kit.screens.depth(), history.state?.uiScreens ?? 0])).toEqual([0, 0]);
});

test('the side-bar button opens the side bar as a drawer on a phone; a link goes there and closes it, Esc closes', async ({ sized }) => {
  const page = await load(sized, '&look=d');
  const menu = page.getByRole('button', { name: 'Sections' });
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  await menu.click();
  await expect(page.locator('nav.ui-sidebar')).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  expect(await AxeBuilder(page), 'axe with the drawer open').toEqual([]);
  await page.locator('.ui-side-link', { hasText: 'Jobs' }).click();
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  expect(await shown(page)).toEqual(['jobs']);
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  // the Back button takes its place on a pushed screen
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect(menu).toBeHidden();
});

test('at 820 px the tab pages are the side bar\'s: a page takes both panes; no swipe', async ({ sized }) => {
  const page = await load(sized, '', 820);
  await page.locator('.ui-side-link', { hasText: 'Rooms' }).click();
  await expect(page.locator('#rooms')).toBeVisible();
  await expect(page.locator('.ui-pane-list')).toBeHidden();
  const [side, rooms] = await Promise.all([page.locator('.ui-sidebar').boundingBox(), page.locator('#rooms').boundingBox()]);
  expect(rooms.x).toBeGreaterThanOrEqual(side.x + side.width - 1);
  expect(rooms.x + rooms.width).toBeGreaterThan(780);
  await swipe(page, 600, 300);
  await expect(page.locator('#rooms')).toBeVisible();
  await page.locator('.ui-side-link', { hasText: 'Plants' }).click();
  await expect(page.locator('.ui-pane-list')).toBeVisible();
  await expect(page.locator('.ui-pane-detail')).toBeVisible();
  expect(await AxeBuilder(page)).toEqual([]);
});
