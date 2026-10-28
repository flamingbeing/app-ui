// An app's own page built on the kit (e2e/pages/app-shell.html), for what app-starter had to hand-write before rc.12:
// a list-only shell, the bar's two ends, the switch under an app's input rule, toasts over the tab bar, the current
// tab's contrast in Navy. The list of what is covered is docs/kit-tests.md.
import { test, expect } from './fixtures.mjs';

const PAGE = '/test/app-shell.html';
const box = (page, sel) => page.locator(sel).first().evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width }; });
async function load(sized, width) {
  const page = await sized(width);
  await page.goto(PAGE);
  await expect.poll(() => page.evaluate(() => !!window.app)).toBe(true);
  return page;
}

for (const width of [390, 1280]) {
  test(`at ${width} px a shell with no detail pane opens a row by "ui-open" alone; the list takes the width`, async ({ sized }) => {
    const page = await load(sized, width);
    await page.locator('#notes .ui-row', { hasText: 'Second' }).click();
    await expect.poll(() => page.evaluate(() => window.app.opened)).toEqual(['Second']);
    await expect(page.locator('#notes .ui-row', { hasText: 'Second' })).toHaveAttribute('aria-current', 'true');
    expect(await page.evaluate(() => window.app.kit.screens.depth())).toBe(0);   // nothing pushed on a phone
    const list = await box(page, '#home');
    const panes = await box(page, '.ui-panes');
    expect(list.w, 'the list fills the panes').toBeGreaterThan(panes.w - 2);
  });
}

test('the bar: .ui-bar-side ends hold the title in the middle; .ui-bar-end lines its buttons up at the end', async ({ sized }) => {
  const page = await load(sized, 390);
  const bar = await box(page, '.ui-bar');
  const lead = await box(page, '#lead');
  const end = await box(page, '#end');
  const title = await box(page, '.ui-bar-title');
  expect(lead.left - bar.left).toBeLessThan(40);
  expect(bar.right - end.right).toBeLessThan(40);
  expect(Math.abs((title.left + title.right) / 2 - (bar.left + bar.right) / 2)).toBeLessThan(4);
});

test('an app rule `input { min-width: 10rem; flex: 1 }` does not stretch the switch', async ({ sized }) => {
  const page = await load(sized, 390);
  const sw = await box(page, '#sync');
  expect(sw.w).toBeLessThanOrEqual(3.1 * 16 + 0.5);
  expect(sw.w).toBeGreaterThan(30);
});

test('stacked toasts sit above the tab bar, never over it', async ({ sized }) => {
  const page = await load(sized, 390);
  await page.evaluate(() => { for (const m of ['One', 'Two', 'Three']) window.app.toasts.show(m); });
  await expect(page.locator('.toast')).toHaveCount(3);
  const toasts = await box(page, '.toasts');
  const tabbar = await box(page, '.ui-tabbar');
  expect(toasts.bottom).toBeLessThanOrEqual(tabbar.top + 1);
});

// the contrast of two CSS colours (rgb() or color(srgb …) as computed), WCAG 2
const contrast = (page, a, b) => page.evaluate(([a, b]) => {
  const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = s => { c.clearRect(0, 0, 1, 1); c.fillStyle = s; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = s => { const [r, g, b] = rgb(s).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + .05) / (y + .05);
}, [a, b]);

for (const theme of ['light', 'dark']) {
  test(`Navy, ${theme}: the current tab is 4.5:1 or more on the page`, async ({ sized }) => {
    const page = await sized(390);
    await page.addInitScript(t => localStorage.setItem('core-theme', JSON.stringify({ theme: t, preset: 'navy', accent: '#4a7fd0', surface: 'navy' })), theme);
    await page.goto(PAGE);
    await expect.poll(() => page.evaluate(() => !!window.app)).toBe(true);
    const fg = await page.locator('.ui-tab[aria-current="page"]').evaluate(e => getComputedStyle(e).color);
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(await contrast(page, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
}

test('idPrefix: two of a part on one page get their own ids, and the bare ids stay as before', async ({ sized }) => {
  const page = await load(sized, 390);
  const ids = await page.evaluate(async () => {
    const { syncChip, updatePrompt } = await import('@core/ui');
    const sync = { status$: () => () => {} };
    const host = document.createElement('div');
    document.body.append(host);
    syncChip(host, { sync });
    syncChip(host, { sync, idPrefix: 'second-' });
    updatePrompt(host, { update: null, idPrefix: 'second-' });
    return [...host.querySelectorAll('[id]')].map(e => e.id);
  });
  expect(ids).toEqual(['status', 'second-status', 'second-version', 'second-check-update', 'second-update-msg']);
});

test('a tab page opened on a phone (no .ui-tab-page class) is still the one showing after the window grows, and back', async ({ sized }) => {
  const page = await load(sized, 390);
  await page.locator('.ui-tabbar .ui-tab', { hasText: 'Settings' }).click();
  await expect(page.locator('#settings')).toBeVisible();
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(page.locator('html')).toHaveAttribute('data-size', 'tablet');
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('#home')).toBeHidden();
  const panes = await box(page, '.ui-panes');
  expect((await box(page, '#settings')).w, 'the page takes both panes').toBeGreaterThan(panes.w - 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('html')).toHaveAttribute('data-size', 'phone');
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('#home')).toBeHidden();
});

test('a list card an app mounts in a settings part is as wide as the groups\' cards', async ({ sized }) => {
  const page = await load(sized, 390);
  await page.locator('.ui-tabbar .ui-tab', { hasText: 'Settings' }).click();
  await expect(page.locator('#part-list')).toBeVisible();
  expect(Math.round((await box(page, '#part-list')).w)).toBe(Math.round((await box(page, '#group-list')).w));
});
