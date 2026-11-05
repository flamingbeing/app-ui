// Warm start (ui/resume.js, theme/early.js's mark, tabPages' resume option) on the /kit/resume/ gallery: a reload
// opens the tab and scroll it was left on, and the first tab is never what paints first; a list drawn late still
// gets its scroll; a deep link or a place past its window starts as usual. docs/kit-tests.md, "Warm start".
import { test, expect, BASE } from './fixtures.mjs';

const PAGE = `${BASE}kit/resume/`;

// every frame until the page has loaded: which tab page could be seen (nothing while the pages are held unseen)
const watchPaint = () => {
  window.__seen = [];
  const look = () => {
    const screens = document.querySelector('.ui-screens');
    if (screens && getComputedStyle(screens).visibility !== 'hidden') {
      const shown = [...screens.children].find(s => !s.hidden && getComputedStyle(s).display !== 'none');
      if (shown && window.__seen.at(-1) !== shown.id) window.__seen.push(shown.id);
    }
    if (document.readyState !== 'complete' || window.__seen.length === 0) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

test('a reload opens the tab and scroll it was left on, and that tab paints first', async ({ phone }) => {
  const page = await phone();
  await page.goto(PAGE);
  await expect(page.locator('#how')).toContainText('A normal start');
  await page.locator('[data-tab-page="#later"]').click();
  await expect(page.locator('#later')).toBeVisible();
  await page.evaluate(() => scrollTo(0, 900));
  await page.waitForFunction(() => Math.abs(scrollY - 900) < 2);
  await page.context().addInitScript(watchPaint);
  await page.reload();   // (pagehide keeps the place)
  await expect(page.locator('#later')).toBeVisible();
  await expect(page.locator('#inbox')).toBeHidden();
  await expect(page.locator('[data-tab-page="#later"]')).toHaveAttribute('aria-current', 'page');
  await page.waitForFunction(() => Math.abs(scrollY - 900) < 2);
  expect(await page.evaluate(() => window.__seen)).toEqual(['later']);
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-resuming'))).toBe(false);
  await expect(page.locator('#how')).toContainText('Warm start: opened later at 900 px');
  const kept = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ui-resume') ?? '{}')).sort());
  expect(kept).toEqual(['at', 'path', 'tab', 'until', 'v', 'y']);
  // Back from the resumed tab goes to the first, as after any tab change
  await page.goBack();
  await expect(page.locator('#inbox')).toBeVisible();
});

test('a list drawn after the start still gets its kept scroll; hidden keeps the place too', async ({ phone }) => {
  const page = await phone();
  await page.goto(PAGE);
  await page.locator('[data-tab-page="#done"]').click();
  await expect(page.locator('#done-list li').nth(70)).toBeAttached();
  await page.evaluate(() => scrollTo(0, 2400));
  await page.waitForFunction(() => Math.abs(scrollY - 2400) < 2);
  // the page hidden (another app on top), then closed without a pagehide's save mattering
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ui-resume') ?? '{}').tab)).toBe('done');
  await page.reload();
  await expect(page.locator('#done')).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll('#done-list li').length === 80);
  await page.waitForFunction(() => Math.abs(scrollY - 2400) < 2);
});

test('a deep link, or a place past its window, starts as usual', async ({ phone }) => {
  const page = await phone();
  await page.goto(PAGE);
  await page.locator('[data-tab-page="#later"]').click();
  await page.evaluate(() => scrollTo(0, 600));
  await page.goto(`${PAGE}#note`);
  await expect(page.locator('#inbox')).toBeVisible();
  await expect(page.locator('#later')).toBeHidden();
  await page.goto(`${PAGE}?look=m`);
  await expect(page.locator('#inbox')).toBeVisible();
  // Later kept again, but an hour and more ago (set as the next page starts, after the last one's pagehide kept its own)
  await page.addInitScript(() => {
    const at = Date.now() - 61 * 60_000;
    try { localStorage.setItem('ui-resume', JSON.stringify({ v: 1, path: location.pathname, tab: 'later', y: 600, at, until: at + 60 * 60_000 })); } catch { /* none */ }
  });
  await page.goto(PAGE);
  await expect(page.locator('#inbox')).toBeVisible();
  await expect(page.locator('#later')).toBeHidden();
  await expect(page.locator('#how')).toContainText('A normal start');
});
