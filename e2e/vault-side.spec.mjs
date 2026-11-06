// The vault shell's second half (ui/vault/, opt-in) on /kit/vault/ at 390 px: the left and right sidebars (side
// drawers: a button or a swipe on the page opens one, the screen's edge stays the phone's; the shade, Back or a swipe
// closes it; the view picker pill and its card; views drawn the first time they show; the footer slot) and the
// full-screen settings (search, the Options card, a page of module switches with a gear for a module's options; Back,
// the arrow, a swipe right and the X; a drag down on the root closes). None of them says "Press Back again to close".
// docs/kit-tests.md, "Vault shell".
import { test, expect } from './fixtures.mjs';
import axe from './axe.mjs';

const PAGE = '/ui/0.0.0-dev/kit/vault/';
const toast = page => page.locator('.toasts .toast', { hasText: 'Press Back again to close' });
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
const back = page => page.evaluate(() => new Promise(r => { addEventListener('popstate', () => setTimeout(r, 80), { once: true }); history.back(); }));
/** a finger's path (Chromium's touch events, through the DevTools protocol) */
const touches = async (page, points) => {
  const c = await page.context().newCDPSession(page);
  const at = ([x, y]) => [{ x, y }];
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(points[0]) });
  for (const p of points.slice(1)) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(p) }); await page.waitForTimeout(16); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
};
const across = (x0, x1, y) => Array.from({ length: 7 }, (_, i) => [x0 + (x1 - x0) * i / 6, y + i]);
async function load(phone, scheme = 'light') {
  const page = await phone();
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(PAGE);
  await page.waitForSelector('html[data-vault-ready]');
  return page;
}
const tx = loc => loc.evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m41);
async function openSettings(page) {
  await page.locator('#vault-nav-menu').click();
  await settled(page);
  await page.locator('#am-settings').click();
  await expect(page.locator('#settings')).toBeVisible();
  await settled(page);
}

test('the left sidebar: its button opens it (the page pushed aside, square corner, the footer), the shade and Back close it; axe light and dark', async ({ phone }) => {
  for (const scheme of ['light', 'dark']) {
    const page = await load(phone, scheme);
    const d = page.locator('#left');
    expect(await page.locator('#left-views').evaluate(b => b.children.length), 'no view drawn before it opens').toBe(0);
    await page.locator('#side-left').click();
    await expect(d).toBeVisible();
    await settled(page);
    await expect(page.locator('#side-left')).toHaveAttribute('aria-expanded', 'true');
    expect(await d.evaluate(e => e.matches(':modal'))).toBe(true);
    const box = await d.boundingBox();
    expect(box.x).toBe(0);
    expect(box.width).toBeCloseTo(Math.min(417, 390 * 0.84), 0);
    expect(await d.evaluate(e => getComputedStyle(e).borderTopRightRadius)).toBe('0px');
    expect(Math.round(await tx(page.locator('#page'))), 'the page slid aside by its width').toBe(Math.round(box.width));
    await expect(page.locator('#left-view-pages')).toBeVisible();
    await expect(page.locator('#left-pill')).toHaveAttribute('aria-label', 'View: Pages. Change view');
    await expect(page.locator('#left .kit-vault-foot')).toContainText('Field journal');
    await expect(page.locator('#left-order'), 'the view\'s tools').toBeVisible();
    expect(await axe(page), `axe ${scheme}, open`).toEqual([]);
    // the shade (the strip of page still showing)
    await page.mouse.click(370, 400);
    await expect(d).toBeHidden();
    expect(await tx(page.locator('#page'))).toBe(0);
    await expect(page.locator('#side-left')).toHaveAttribute('aria-expanded', 'false');
    // Back
    await page.locator('#side-left').click();
    await settled(page);
    await back(page);
    await expect(d).toBeHidden();
    await page.waitForTimeout(300);
    await expect(toast(page), 'closing it never says it').toHaveCount(0);
      expect(await page.evaluate(() => history.state?.uiTabGuard), 'back on the page\'s own entry').toBe(1);
  }
});

test('swipes: right on the page opens the left sidebar, left on it closes it; from the screen\'s edge nothing; left on the page opens the right one', async ({ phone }) => {
  const page = await load(phone);
  await touches(page, across(120, 330, 420));
  await expect(page.locator('#left')).toBeVisible();
  await settled(page);
  expect(await page.locator('#left').evaluate(e => e.matches(':modal'))).toBe(true);
  await touches(page, across(300, 60, 420));
  await expect(page.locator('#left')).toBeHidden();
  await settled(page);
  // the edge is the phone's Back: no drawer
  await touches(page, across(10, 240, 420));
  await page.waitForTimeout(300);
  await expect(page.locator('#left')).toBeHidden();
  // a swipe left: the right sidebar, its view shown for this page
  await touches(page, across(300, 80, 420));
  await expect(page.locator('#right')).toBeVisible();
  await settled(page);
  const r = await page.locator('#right').boundingBox();
  expect(r.x + r.width).toBeCloseTo(390, 0);
  await expect(page.locator('#right-outline li')).toHaveCount(3);
  await expect(page.locator('#right-pill')).toHaveAttribute('aria-label', 'View: Outline. Change view');
  await page.keyboard.press('Escape');
  await expect(page.locator('#right')).toBeHidden();
});

test('the view picker: a card of the views rises from the pill, the one shown ticked; a pick shows it; Back closes only the card', async ({ phone }) => {
  const page = await load(phone);
  await page.locator('#side-left').click();
  await settled(page);
  await page.locator('#left-pill').click();
  const card = page.locator('#left-menu');
  await expect(card).toBeVisible();
  await expect(page.locator('#left-pill')).toHaveAttribute('aria-expanded', 'true');
  expect(await card.locator('[role=menuitemradio]').evaluateAll(bs => bs.map(b => [b.textContent, b.getAttribute('aria-checked')])))
    .toEqual([['Pages', 'true'], ['Search', 'false'], ['Bookmarks', 'false']]);
  await expect(page.locator('#left-pick-pages')).toBeFocused();
  // Back: the card goes, the drawer stays
  await back(page);
  await expect(card).toBeHidden();
  await expect(page.locator('#left')).toBeVisible();
  expect(await page.locator('#left-view-search').count(), 'a view is drawn the first time it shows').toBeLessThanOrEqual(1);
  await page.locator('#left-pill').click();
  await page.locator('#left-pick-search').click();
  await expect(card).toBeHidden();
  await expect(page.locator('#left-view-search')).toBeVisible();
  await expect(page.locator('#left-view-pages')).toBeHidden();
  await expect(page.locator('#left .ui-vault-side-tools'), 'Search has no tools').toBeHidden();
  await expect(page.locator('#left-pill')).toHaveAttribute('aria-label', 'View: Search. Change view');
  await page.locator('#left-q').fill('heather');
  await expect(page.locator('#left-found button')).toHaveText(['Heather hill']);
  // a page opened from the sidebar shuts it first
  await page.locator('#left-found button').click();
  await expect(page.locator('#left')).toBeHidden();
  await expect(page.locator('#page-title')).toHaveText('Heather hill');
});

test('settings: the root\'s search and Options card; Modules: a switch brings a module\'s gear, the gear its page; the arrow and Back step out; the X closes from a page', async ({ phone }) => {
  const page = await load(phone);
  await openSettings(page);
  const d = page.locator('#settings');
  await expect(page.locator('#settings-title-root')).toHaveText('Settings');
  await expect(page.locator('#settings-q')).toBeVisible();
  await expect(page.locator('#settings .ui-vault-set-h').first()).toHaveText('Options');
  await expect(page.locator('#settings [data-page=root] .ui-vault-set-nav')).toHaveText(['General', 'Appearance', 'Modules', 'About']);
  expect(await page.locator('#settings-go-general svg').count(), 'an icon and a chevron').toBe(2);
  const b = await d.boundingBox();
  expect(b.height, 'nearly the screen\'s height').toBeGreaterThan(820);
  await page.locator('#settings-go-modules').click();
  await settled(page);
  await expect(page.locator('#settings-title-modules')).toBeVisible();
  await expect(page.locator('#settings-title-root')).toBeHidden();
  await expect(page.locator('#settings-gear-daily')).toBeHidden();
  await expect(page.locator('#opt-daily')).toHaveAttribute('role', 'switch');
  await page.locator('#opt-daily').click();
  await expect(page.locator('#opt-daily')).toBeChecked();
  await expect(page.locator('#settings-gear-daily')).toBeVisible();
  await page.locator('#settings-gear-daily').click();
  await settled(page);
  await expect(page.locator('#settings-title-daily')).toHaveText('Daily pages');
  await expect(d).toHaveAttribute('aria-labelledby', 'settings-title-daily');
  // the arrow
  await page.locator('[data-page=daily] .ui-vault-set-back').click();
  await settled(page);
  await expect(page.locator('#settings-title-modules')).toBeVisible();
  await expect(page.locator('#settings-gear-daily')).toBeFocused();
  // the phone's Back: to the root, which now has the module's page
  await back(page);
  await settled(page);
  await expect(page.locator('#settings-title-root')).toBeVisible();
  await expect(page.locator('#settings-go-daily')).toBeVisible();
  // the X from a page closes the lot
  await page.locator('#settings-go-about').click();
  await settled(page);
  await page.locator('[data-page=about] .ui-vault-set-circle:not(.ui-vault-set-back)').click();
  await expect(d).toBeHidden();
  await page.waitForTimeout(300);
  await expect(toast(page)).toHaveCount(0);
  expect(await page.evaluate(() => history.state?.uiTabGuard), 'back on the page\'s own entry').toBe(1);
  // a module off: its view leaves the sidebar's picker
  await openSettings(page);
  await page.locator('#settings-go-modules').click();
  await page.locator('#opt-bookmarks').click();
  await page.keyboard.press('Escape');
  await expect(d).toBeHidden();
  await page.locator('#side-left').click();
  await page.locator('#left-pill').click();
  await expect(page.locator('#left-menu [role=menuitemradio]')).toHaveText(['Pages', 'Search']);
});

test('settings search: words find a row on its page, a tap opens the page there; a refused switch says why and stays off', async ({ phone }) => {
  const page = await load(phone);
  await openSettings(page);
  await page.locator('#settings-q').fill('sync');
  const hits = page.locator('#settings-results button');
  await expect(hits).toHaveCount(1);
  await expect(hits).toContainText('Sync with the cloud');
  await expect(hits).toContainText('General');
  await expect(page.locator('#settings .ui-vault-set-menu')).toBeHidden();
  await page.locator('#settings-q').fill('nothing like it');
  await expect(page.locator('#settings .ui-vault-set-none')).toBeVisible();
  await page.locator('#settings-q').fill('characters');
  await expect(hits, 'a row kept out of the search (find: false) is not found twice').toHaveCount(1);
  await page.locator('#settings-results button').first().click();
  await settled(page);
  await expect(page.locator('#settings-title-modules')).toBeVisible();
  await expect(page.locator('#settings [data-page=modules] .is-flash')).toHaveCount(1);
  await back(page);
  await settled(page);
  await expect(page.locator('#settings-results'), 'the search kept').toBeVisible();
  await page.locator('#settings-q').fill('');
  await page.locator('#settings-go-general').click();
  await page.locator('#opt-sync').click();
  await expect(page.locator('#settings-status')).toHaveText('Sign in first to sync (made up)');
  await expect(page.locator('#settings-status')).toHaveClass(/is-bad/);
  await expect(page.locator('#opt-sync')).not.toBeChecked();
  // a choice
  await back(page);
  await settled(page);
  await page.locator('#settings-go-appearance').click();
  await page.locator('#opt-text-size').selectOption('large');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
});

test('settings: a swipe right on a page goes Back (on its rows too); a drag down on the root\'s header closes it', async ({ phone }) => {
  const page = await load(phone);
  await openSettings(page);
  await page.locator('#settings-go-general').click();
  await settled(page);
  expect(await page.locator('[data-page=general] .ui-vault-set-scroll').evaluate(e => getComputedStyle(e).touchAction)).toBe('pan-y');
  await touches(page, across(30, 300, 300));
  await expect(page.locator('#settings-title-general')).toBeHidden();
  await expect(page.locator('#settings-title-root')).toBeVisible();
  await settled(page);
  await touches(page, [[200, 40], [200, 60], [200, 140], [200, 260], [200, 380], [200, 500]]);
  await expect(page.locator('#settings')).toBeHidden();
  await page.waitForTimeout(300);
  await expect(toast(page)).toHaveCount(0);
  expect(await page.evaluate(() => history.state?.uiTabGuard), 'back on the page\'s own entry').toBe(1);
});

test('axe: the settings root and the Modules page, light and dark', async ({ phone }) => {
  for (const scheme of ['light', 'dark']) {
    const page = await load(phone, scheme);
    await openSettings(page);
    expect(await axe(page), `axe ${scheme}, root`).toEqual([]);
    await page.locator('#settings-go-modules').click();
    await settled(page);
    expect(await axe(page), `axe ${scheme}, Modules`).toEqual([]);
  }
});

test('the footer\'s gear: the sidebar goes, then the settings open; closing them leaves one step of history', async ({ phone }) => {
  const page = await load(phone);
  await page.locator('#side-left').click();
  await settled(page);
  await page.locator('#left-gear').click();
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('#left')).toBeHidden();
  await settled(page);
  await back(page);
  await expect(page.locator('#settings')).toBeHidden();
  await page.waitForTimeout(300);
  await expect(toast(page)).toHaveCount(0);
  expect(await page.evaluate(() => history.state?.uiTabGuard)).toBe(1);
});

test('settings rows: a live second line, a bare row (no words, drawn hook once in place, found by its label), a row kept out of the search', async ({ phone }) => {
  const page = await load(phone);
  await openSettings(page);
  await page.locator('#settings-go-general').click();
  await settled(page);
  await expect(page.locator('#settings [data-page=general] .ui-vault-set-sub', { hasText: 'counted as it is drawn' })).toHaveCount(1);
  await expect(page.locator('#opt-info-2')).toBeVisible();
  await back(page);
  await settled(page);
  await page.locator('#settings-q').fill('credits');
  await page.locator('#settings-results button').first().click();
  await settled(page);
  const bare = page.locator('#settings [data-page=about] .ui-vault-set-row.is-bare');
  await expect(bare).toHaveAttribute('data-drawn', 'true');
  await expect(bare).toHaveAttribute('aria-label', 'Made with');
  await expect(bare.locator('.ui-vault-set-text')).toHaveCount(0);
  expect(await bare.evaluate(e => getComputedStyle(e).paddingLeft)).toBe('0px');
  await expect(page.locator('#about-credits')).toBeVisible();
});
