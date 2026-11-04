// The opt-in wide side bar (html[data-wide-side], ui/shell/wide-side.js) on /kit/shell/?wide=1: at 1280 px the side
// bar is 280 px with left-aligned links, the FAB hides and a button hides and shows it (kept over a reload); without
// the attribute the laptop layout is the old one; at 390 and 700 px the attribute changes nothing. docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
async function load(sized, width, wide) {
  const page = await sized(width);
  await page.goto(SHELL + (wide ? '&wide=1' : ''));
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  return page;
}
// the computed looks the attribute must leave alone on a phone and a tablet
const looks = page => page.evaluate(() => {
  const pick = (/** @type {string} */ sel, /** @type {string[]} */ props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { ...Object.fromEntries(props.map(p => [p, cs.getPropertyValue(p)])), box: [r.x, r.y, r.width, r.height].map(Math.round) };
  };
  return {
    side: pick('.ui-sidebar', ['display', 'width', 'padding', 'background-color', 'border-inline-end-width']),
    link: pick('.ui-side-link', ['justify-content', 'min-height', 'padding', 'margin']),
    tabbar: pick('.ui-tabbar', ['display', 'height']),
    fab: pick('.ui-fab', ['display']),
    bar: pick('.ui-shell > .ui-bar', ['display', 'padding']),
    toggle: document.querySelector('.ui-side-toggle') !== null,
    ready: document.documentElement.hasAttribute('data-wide-ready'),
  };
});

test.describe('wide side bar at 1280 px', () => {
  test('280 px, left-aligned links with a count at the end, no FAB; axe clean', async ({ sized }) => {
    const page = await load(sized, 1280, true);
    await expect(page.locator('html')).toHaveAttribute('data-wide-ready', '');
    const side = await page.locator('.ui-sidebar').boundingBox();
    expect(Math.round(side.width)).toBe(280);
    const link = page.locator('.ui-side-link').first();
    const [lb, label, count] = await Promise.all([link.boundingBox(), link.evaluate(a => {
      const range = document.createRange();
      range.setStart(a.firstChild, 0); range.setEnd(a.firstChild, a.firstChild.textContent.trim().length);
      return range.getBoundingClientRect().x;
    }), page.locator('.ui-side-link .ui-side-count').boundingBox()]);
    expect(Math.round(lb.x)).toBe(12);   // inset 12 each side
    expect(Math.round(lb.width)).toBe(256);
    expect(Math.round(lb.height)).toBe(34);
    expect(label - lb.x).toBeLessThan(12);   // the label starts at the left, after the 8 px padding
    expect(count.x + count.width).toBeGreaterThan(lb.x + lb.width - 12);   // the count at the end
    // (the gallery has no FAB: one is added as an app would have it)
    await page.evaluate(() => { const b = document.createElement('button'); b.className = 'ui-fab'; b.ariaLabel = 'Add'; document.body.append(b); });
    await expect(page.locator('.ui-fab')).toBeHidden();
    const toggle = page.locator('.ui-side-head .ui-side-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAttribute('aria-label', 'Hide sidebar');
    await expect(toggle).toHaveAttribute('aria-controls', 'side');
    const tb = await toggle.boundingBox();
    expect([Math.round(tb.width), Math.round(tb.height)]).toEqual([32, 32]);
    expect(tb.x + tb.width).toBeLessThanOrEqual(side.width - 12 + 1);   // at the head row's end
    expect(await AxeBuilder(page)).toEqual([]);
  });

  test('the button hides and shows it (Enter too), the content takes the room, the state survives a reload', async ({ sized }) => {
    const page = await load(sized, 1280, true);
    const toggle = page.locator('.ui-side-toggle');
    const listX = async () => (await page.locator('.ui-pane-list').boundingBox()).x;
    expect(Math.round(await listX())).toBe(280);
    await toggle.click();
    await settled(page);
    await expect(page.locator('html')).toHaveAttribute('data-side-hidden', '');
    await expect(page.locator('html')).not.toHaveAttribute('data-side-moving', '');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'Show sidebar');
    expect(Math.round(await listX())).toBe(0);
    await expect(page.locator('.ui-side-link').first()).toBeHidden();
    const tb = await toggle.boundingBox();   // fixed at the page's top-left
    expect([Math.round(tb.x), Math.round(tb.y)]).toEqual([24, 12]);
    // on top of the page (a sticky side bar is a stacking context: a raised bar would cover it)
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.ui-side-toggle') !== null, [tb.x + 16, tb.y + 16])).toBe(true);
    expect(await AxeBuilder(page)).toEqual([]);

    await page.reload();
    await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-side-hidden', '');
    expect(Math.round(await listX())).toBe(0);

    await toggle.focus();
    await page.keyboard.press('Enter');
    await settled(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-side-hidden', '');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(Math.round(await listX())).toBe(280);
    await expect(page.locator('.ui-side-link').first()).toBeVisible();
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
    await expect(page.locator('html')).not.toHaveAttribute('data-side-hidden', '');
  });

  test('it slides with transforms only and fires ui-side', async ({ sized }) => {
    const page = await load(sized, 1280, true);
    await page.evaluate(() => {
      window.sides = [];
      document.querySelector('.ui-shell').addEventListener('ui-side', e => window.sides.push(e.detail.hidden));
    });
    await page.locator('.ui-side-toggle').click();
    const props = await page.evaluate(() => document.getAnimations().flatMap(a => a.effect.getKeyframes().flatMap(k => Object.keys(k)))
      .filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)));
    expect(props.length).toBeGreaterThan(0);
    expect([...new Set(props)]).toEqual(['transform']);
    await settled(page);
    await page.locator('.ui-side-toggle').click();
    await settled(page);
    expect(await page.evaluate(() => window.sides)).toEqual([true, false]);
  });

  test('without the attribute: the old laptop layout, no button, nothing loaded', async ({ sized }) => {
    const page = await load(sized, 1280, false);
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(Math.round((await page.locator('.ui-sidebar').boundingBox()).width)).toBe(Math.round(14 * rem));
    expect(await page.locator('.ui-side-toggle').count()).toBe(0);
    await page.evaluate(() => { const b = document.createElement('button'); b.className = 'ui-fab'; b.ariaLabel = 'Add'; document.body.append(b); });
    await expect(page.locator('.ui-fab')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-wide-ready', '');
    expect(await page.evaluate(() => performance.getEntriesByType('resource').some(e => e.name.includes('wide-side.js')))).toBe(false);
  });
});

for (const width of [390, 700]) {
  test(`at ${width} px the attribute changes nothing (and wide-side.js is not loaded)`, async ({ sized }) => {
    const plain = await looks(await load(sized, width, false));
    const page = await load(sized, width, true);
    expect(await looks(page)).toEqual(plain);
    expect(await page.evaluate(() => performance.getEntriesByType('resource').some(e => e.name.includes('wide-side.js')))).toBe(false);
  });
}
