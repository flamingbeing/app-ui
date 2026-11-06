// The vault shell (ui/vault/, opt-in) on /kit/vault/ at 390 px: the floating navigation pill (named buttons, Back and
// Forward faint until they have somewhere to go, the tabs count, out of the way while the keyboard is up) and the
// grouped menu sheets (cards, icons, ticks, radios, a red Delete, the Close row, a disabled row; Back, Esc, the shade,
// Close and a drag down close one, and none of them says "Press Back again to close"). docs/kit-tests.md, "Vault shell".
import { test, expect } from './fixtures.mjs';
import axe from './axe.mjs';

const PAGE = '/ui/0.0.0-dev/kit/vault/';
const toast = page => page.locator('.toasts .toast', { hasText: 'Press Back again to close' });
// every animation landed (a sheet's rise, the pill's fade)
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
// Back as the phone's own button: one step of the page's history
const back = page => page.evaluate(() => new Promise(r => { addEventListener('popstate', () => setTimeout(r, 80), { once: true }); history.back(); }));
async function load(phone, scheme = 'light') {
  const page = await phone();
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(PAGE);
  await page.waitForSelector('html[data-vault-ready]');
  return page;
}
async function openSheet(page, opener, id) {
  await page.locator(opener).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
  await settled(page);
}

test('the pill: six named buttons in order, Back and Forward faint at the start, the tabs count; frosted, no ring; axe light and dark', async ({ phone }) => {
  for (const scheme of ['light', 'dark']) {
    const page = await load(phone, scheme);
    const nav = page.locator('nav#vault-nav');
    await expect(nav).toHaveAttribute('aria-label', 'Navigation');
    expect(await nav.locator('button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label'))))
      .toEqual(['Back', 'Forward', 'Go to page', 'New tab', 'Open tabs: 1', 'Menu']);
    for (const slot of ['back', 'forward']) await expect(page.locator(`#vault-nav-${slot}`)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#vault-nav-search')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#vault-nav-tabs .ui-vault-count')).toHaveText('1');
    const look = await nav.evaluate(n => { const s = getComputedStyle(n); return { blur: s.backdropFilter, border: s.borderTopWidth, outline: s.outlineStyle, radius: s.borderRadius, h: n.getBoundingClientRect().height }; });
    expect(look).toEqual({ blur: 'blur(12px)', border: '0px', outline: 'none', radius: '999px', h: 50 });
    // floats over the page, clear of the bottom edge
    const box = await nav.boundingBox();
    expect(844 - (box.y + box.height)).toBeGreaterThanOrEqual(18);
    expect(await axe(page), `axe ${scheme}`).toEqual([]);
  }
});

test('Back and Forward walk the pages seen; + adds a tab; a tab closed by its own button keeps the sheet open', async ({ phone }) => {
  const page = await load(phone);
  // a disabled Back does nothing
  await page.locator('#vault-nav-back').dispatchEvent('click');
  await expect(page.locator('#page-title')).toHaveText('Fern walk');
  await openSheet(page, '#vault-nav-search', 'go-sheet');
  await expect(page.locator('#go-sheet .ui-vault-card')).toHaveAttribute('role', 'radiogroup');
  await expect(page.locator('#go-0')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#go-1').click();
  await expect(page.locator('#go-sheet')).toBeHidden();
  await expect(page.locator('#page-title')).toHaveText('Moss garden');
  await expect(page.locator('#vault-nav-back')).toHaveAttribute('aria-disabled', 'false');
  await page.locator('#vault-nav-back').click();
  await expect(page.locator('#page-title')).toHaveText('Fern walk');
  await expect(page.locator('#vault-nav-forward')).toHaveAttribute('aria-disabled', 'false');
  await page.locator('#vault-nav-forward').click();
  await expect(page.locator('#page-title')).toHaveText('Moss garden');
  // + adds a tab: the count and the button's name follow
  await page.locator('#vault-nav-add').click();
  await expect(page.locator('#vault-nav-tabs .ui-vault-count')).toHaveText('2');
  await expect(page.locator('#vault-nav-tabs')).toHaveAttribute('aria-label', 'Open tabs: 2');
  await openSheet(page, '#vault-nav-tabs', 'tabs-sheet');
  await expect(page.locator('#tabs-sheet-title')).toHaveText('2 tabs');
  await expect(page.locator('#tab-1')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#tab-close-0').click();
  await expect(page.locator('#tabs-sheet')).toBeVisible();
  await expect(page.locator('#tabs-sheet-title')).toHaveText('1 tab');
  await expect(page.locator('#vault-nav-tabs .ui-vault-count')).toHaveText('1');
  await expect(page.locator('#tab-close-0')).toBeFocused();
});

test('the keyboard up: the pill fades, drops and can\'t be tapped; it comes back as the keyboard goes', async ({ phone }) => {
  const page = await load(phone);
  const nav = page.locator('#vault-nav');
  await page.locator('#jot').tap();
  await expect(page.locator('#jot')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 500 });   // (resizes-content: the page shrinks above the keyboard)
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('ui-keyboard-open'))).toBe(true);
  await expect.poll(() => nav.evaluate(n => n.inert)).toBe(true);
  await expect(nav).toBeHidden();
  const gone = await nav.evaluate(n => { const s = getComputedStyle(n); return { opacity: s.opacity, transform: s.transform, events: s.pointerEvents }; });
  expect(gone).toEqual({ opacity: '0', transform: 'matrix(1, 0, 0, 1, 0, 12)', events: 'none' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => nav.evaluate(n => n.inert)).toBe(false);
  await expect(nav).toBeVisible();
  await settled(page);
  expect(await nav.evaluate(n => getComputedStyle(n).opacity)).toBe('1');
});

test('a menu sheet: grouped rounded cards, icons, ticks, a red Delete and the Close row at the start; a tick row toggles', async ({ phone }) => {
  const page = await load(phone);
  await openSheet(page, '#more', 'page-menu');
  const sheet = page.locator('#page-menu');
  await expect(sheet).toHaveAttribute('aria-label', 'More options');
  const cards = sheet.locator('.ui-vault-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.first().locator('button')).toHaveText('Close');
  await expect(page.locator('#pm-read')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('#pm-read svg').count(), 'its icon only, no tick').toBe(1);
  const look = await page.evaluate(() => {
    const card = /** @type {HTMLElement} */ (document.querySelector('#page-menu .ui-vault-card'));
    const row = /** @type {HTMLElement} */ (document.querySelector('#pm-rename'));
    const del = /** @type {HTMLElement} */ (document.querySelector('#pm-delete'));
    const d = /** @type {HTMLElement} */ (document.querySelector('#page-menu'));
    return { radius: getComputedStyle(card).borderTopLeftRadius, rowH: row.getBoundingClientRect().height, red: getComputedStyle(del).color,
      top: getComputedStyle(d).borderTopLeftRadius, bottom: Math.round(innerHeight - d.getBoundingClientRect().bottom) };
  });
  expect(look).toEqual({ radius: '18px', rowH: 44, red: 'rgb(212, 42, 63)', top: '31px', bottom: 0 });
  // the first row that can be tapped has the focus
  await expect(page.locator('#page-menu-close')).toBeFocused();
  expect(await axe(page), 'axe open').toEqual([]);
  await page.locator('#pm-read').click();
  await expect(sheet).toBeHidden();
  await openSheet(page, '#more', 'page-menu');
  await expect(page.locator('#pm-read')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('#pm-read svg').count(), 'the tick at the end').toBe(2);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await axe(page), 'axe open, dark').toEqual([]);
});

test('Esc, Back, the shade, the Close row and a drag down each close a sheet, and none says "Press Back again to close"; the page\'s own Back still does', async ({ phone }) => {
  const page = await load(phone);
  expect(await page.evaluate(() => history.state?.uiTabGuard), 'the page keeps its close guard').toBe(1);
  const start = await page.evaluate(() => history.length);
  const sheet = page.locator('#page-menu');
  // Esc
  await openSheet(page, '#more', 'page-menu');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page.locator('#more')).toBeFocused();
  // Back
  await openSheet(page, '#more', 'page-menu');
  await back(page);
  await expect(sheet).toBeHidden();
  // a tap on the shade, above the sheet
  await openSheet(page, '#more', 'page-menu');
  await page.mouse.click(195, 60);
  await expect(sheet).toBeHidden();
  // the Close row
  await openSheet(page, '#more', 'page-menu');
  await page.locator('#page-menu-close').click();
  await expect(sheet).toBeHidden();
  // a short drag of the top settles back; a long one closes it (a mouse has no implicit capture: small steps, so the
  // drag starts while the pointer is still on the grabber)
  await openSheet(page, '#more', 'page-menu');
  const grab = await sheet.locator('.ui-vault-grab').boundingBox();
  const x = grab.x + grab.width / 2, y = grab.y + 10;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 30, { steps: 6 });
  expect(await sheet.evaluate(d => new DOMMatrix(getComputedStyle(d).transform).m42), 'it follows the pointer').toBeGreaterThan(15);
  await page.mouse.up();
  await settled(page);
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate(d => new DOMMatrix(getComputedStyle(d).transform).m42)).toBe(0);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 400, { steps: 40 }); await page.mouse.up();
  await expect(sheet).toBeHidden();
  // a row that opens a page's step closes the sheet first (the app menu's Go to page opens the picker)
  await openSheet(page, '#vault-nav-menu', 'app-menu');
  await page.locator('#am-search').click();
  await expect(page.locator('#app-menu')).toBeHidden();
  await expect(page.locator('#go-sheet')).toBeVisible();
  await back(page);
  await expect(page.locator('#go-sheet')).toBeHidden();
  await page.waitForTimeout(400);
  await expect(toast(page), 'no sheet closed says it').toHaveCount(0);
  await expect.poll(() => page.evaluate(() => history.length), 'no entries left over').toBeLessThanOrEqual(start + 1);
  expect(await page.evaluate(() => history.state?.uiTabGuard)).toBe(1);
  // the page's own first Back stays and says so
  await back(page);
  await expect(toast(page)).toHaveCount(1);
});

test('rows: a chevron row opens another sheet, a radio pick is kept, a disabled row with its hint can\'t be tapped; the Close row at the end', async ({ phone }) => {
  const page = await load(phone);
  await openSheet(page, '#vault-nav-menu', 'app-menu');
  await expect(page.locator('#app-menu .ui-vault-card').last().locator('button')).toHaveText('Close');
  await expect(page.locator('#am-sync')).toBeDisabled();
  await expect(page.locator('#am-sync .ui-vault-row-hint')).toHaveText('Offline');
  await expect(page.locator('#am-sort .ui-vault-next')).toHaveCount(1);
  await expect(page.locator('#am-sort .ui-vault-row-hint')).toHaveText('Name');
  await page.locator('#am-sort').click();
  await expect(page.locator('#sort-sheet')).toBeVisible();
  await expect(page.locator('#sort-sheet-title')).toHaveText('Sort pages');
  await expect(page.locator('#sort-0')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#sort-1').click();
  await expect(page.locator('#sort-sheet')).toBeHidden();
  await openSheet(page, '#vault-nav-menu', 'app-menu');
  await expect(page.locator('#am-sort .ui-vault-row-hint')).toHaveText('Last changed');
  await page.locator('#app-menu-close').click();
  await expect(page.locator('#app-menu')).toBeHidden();
});

test('less motion: a sheet shows and goes at once', async ({ phone }) => {
  const page = await phone();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PAGE);
  await page.waitForSelector('html[data-vault-ready]');
  await page.locator('#more').click();
  // the sheet and its shade run no animation (a pressed button's own transition may still be ending)
  expect(await page.evaluate(() => document.getAnimations().filter(a => {
    const t = /** @type {KeyframeEffect} */ (a.effect)?.target;
    return t?.closest?.('#page-menu, .ui-vault-shade');
  }).length)).toBe(0);
  expect(await page.locator('#page-menu').evaluate(d => new DOMMatrix(getComputedStyle(d).transform).m42)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#page-menu')).toBeHidden();
});
