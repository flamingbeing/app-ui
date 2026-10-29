// Press feedback (ui/motion.js pressFeedback) at 390 px, in Chromium and WebKit: a press inside something that
// scrolls waits PRESS_DELAY (a scroll that starts by then never shows it), one on a fixed bar shows at once, and the
// Android look's ripple grows from the finger. Fingers are page-made touch pointer events. The list is
// docs/kit-tests.md, "Press feedback".
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/';

async function load(sized, url = SHELL) {
  const page = await sized(390);
  await page.goto(url);
  await page.evaluate(() => {
    // a touch pointer on el: down, then each step [ms to wait, dy or 'up']; gives back whether el was pressed after
    // each step (window.__at: ms since the down at each look, as timers run late on a busy machine)
    window.__press = async (el, steps) => {
      const r = el.getBoundingClientRect(), x = r.x + 30, y = r.y + r.height / 2;
      const fire = (type, dy = 0) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true,
        pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y + dy, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      const seen = [], t0 = performance.now();
      window.__at = [];
      const look = () => { seen.push(el.hasAttribute('data-pressed')); window.__at.push(performance.now() - t0); };
      fire('pointerdown');
      look();
      for (const [ms, what] of steps) {
        await new Promise(res => setTimeout(res, ms));
        if (what === 'up') fire('pointerup'); else if (typeof what === 'number') fire('pointermove', what);
        look();
      }
      return seen;
    };
  });
  return page;
}
const row = page => page.locator('#home .ui-row[data-push], #home a.ui-row, #home .ui-row[tabindex]').first();

test('a row in the scrolling page shows pressed only after the delay; a scroll that starts first never shows it', async ({ sized }) => {
  const page = await load(sized);
  const r = row(page);
  await expect(r).toBeVisible();
  expect(await r.evaluate(el => import('/ui/0.0.0-dev/ui/motion.js').then(m => m.inScroller(el)))).toBe(true);
  // held still: not at once, pressed by 100 ms (a look that came after 100 ms anyway counts as pressed)
  const held = await r.evaluate(el => window.__press(el, [[40, null], [120, null], [0, 'up']]));
  const at = await page.evaluate(() => window.__at);
  expect(held, `down, 40 ms, 160 ms, up (shown under 80 ms: kept a moment); looked at ${at.map(Math.round)} ms`)
    .toEqual([false, at[1] >= 100, true, at[3] < 170 ? true : held[3]]);   // a late lift, 80 ms after it showed: may clear at once
  await expect(r).not.toHaveAttribute('data-pressed');
  // a scroll (a move past the slop) at 40 ms: never pressed
  expect(await r.evaluate(el => window.__press(el, [[40, 30], [150, null], [0, 'up']]))).toEqual([false, false, false, false]);
  // a quick tap (lifted at 30 ms, or later on a busy machine): shown at the lift, then cleared
  expect(await r.evaluate(el => window.__press(el, [[30, 'up']]))).toEqual([false, true]);
  await expect(r).not.toHaveAttribute('data-pressed');
});

test('a tab on the fixed tab bar shows pressed at once', async ({ sized }) => {
  const page = await load(sized);
  const tab = page.locator('nav.ui-tabbar .ui-tab').nth(1);
  expect(await tab.evaluate(el => import('/ui/0.0.0-dev/ui/motion.js').then(m => m.inScroller(el)))).toBe(false);
  expect(await tab.evaluate(el => window.__press(el, [[20, null], [0, 'up']]))).toEqual([true, true, true]);
  await expect(tab).not.toHaveAttribute('data-pressed');
});

test('the Android look: a ripple grows from the finger and fades after the lift; other looks have none', async ({ sized }) => {
  const page = await load(sized, `${SHELL}?look=m`);
  await expect(page.locator('html')).toHaveAttribute('data-family', 'android');
  const tab = page.locator('nav.ui-tabbar .ui-tab').nth(1);
  const during = await tab.evaluate(async el => {
    const p = window.__press(el, [[120, null]]);
    await p;
    const r = el.getBoundingClientRect();
    return { ripple: el.getAttribute('data-ripple'), x: el.style.getPropertyValue('--ui-ripple-x'),
      max: parseFloat(el.style.getPropertyValue('--ui-ripple-max')), far: Math.hypot(r.width - 30, r.height / 2),
      image: getComputedStyle(el).backgroundImage };
  });
  expect(during.ripple).toBe('in');
  expect(during.x, 'from where the finger landed').toBe('30px');
  expect(Math.abs(during.max - during.far), 'to the farthest corner').toBeLessThanOrEqual(1);
  expect(during.image).toMatch(/radial-gradient/);
  await tab.evaluate(el => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5, pointerType: 'touch', isPrimary: true })));
  await expect(tab).toHaveAttribute('data-ripple', 'out');
  await expect(tab).not.toHaveAttribute('data-ripple');
  expect(await tab.evaluate(el => el.style.getPropertyValue('--ui-ripple-x'))).toBe('');

  const plain = await load(sized);
  const t2 = plain.locator('nav.ui-tabbar .ui-tab').nth(1);
  expect(await t2.evaluate(async el => { await window.__press(el, [[20, null]]); return el.getAttribute('data-ripple'); })).toBe(null);
});
