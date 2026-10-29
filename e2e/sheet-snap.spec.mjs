// A sheet's drag (ui/detent-sheet.js) at 390 px, in Chromium and WebKit: the let-go settles on the nearest height,
// and below its lowest height the backdrop fades with the drag, then comes back. Fingers are page-made touch pointer
// events on the grabber. The list is docs/kit-tests.md, "Sheet drag".
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/';

async function open(sized) {
  const page = await sized(390);
  await page.goto(SHELL);
  await page.locator('nav.ui-tabbar [data-open-sheet="#sheet"]').tap();
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await page.evaluate(() => {
    const frame = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    const grab = /** @type {HTMLElement} */ (document.querySelector('#sheet .ui-sheet-grabber'));
    const r = grab.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const fire = (/** @type {string} */ type, /** @type {number} */ dy) => grab.dispatchEvent(new PointerEvent(type, { bubbles: true,
      cancelable: true, composed: true, pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y + dy,
      button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    // down, then each dy a frame apart; held still a few frames (no flick) before the lift
    window.__drag = async (/** @type {number[]} */ dys, lift = true, start = true) => {
      if (start) fire('pointerdown', 0);
      for (const dy of dys) { await frame(); fire('pointermove', dy); }
      if (!lift) return;
      const end = dys.at(-1) ?? 0;
      for (let i = 0; i < 8; i++) { await frame(); fire('pointermove', end); }
      fire('pointerup', end);
    };
    window.__shade = () => Number(getComputedStyle(/** @type {Element} */ (document.querySelector('#sheet')), '::backdrop').opacity);
    window.__settled = () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
  });
  return { page, sheet };
}
const steps = (to, n = 8) => Array.from({ length: n }, (_, i) => Math.round(to * (i + 1) / n));

test('a let-go settles on the nearest height: up a little stays, past halfway goes to full height and back', async ({ sized }) => {
  const { page, sheet } = await open(sized);
  const [medium, full] = await page.evaluate(() => [document.querySelector('#sheet').getBoundingClientRect().height, innerHeight - 12]);
  const half = (full - medium) / 2;
  await page.evaluate(async d => { await window.__drag(d); await window.__settled(); }, steps(-(half - 60)));
  await expect(sheet, 'up, short of halfway: back to medium').toHaveAttribute('data-detent', 'medium');
  await page.evaluate(async d => { await window.__drag(d); await window.__settled(); }, steps(-(half + 60)));
  await expect(sheet, 'up past halfway: full height').toHaveAttribute('data-detent', 'large');
  await page.evaluate(async d => { await window.__drag(d); await window.__settled(); }, steps(half - 60));
  await expect(sheet, 'down, short of halfway: stays full').toHaveAttribute('data-detent', 'large');
  await page.evaluate(async d => { await window.__drag(d); await window.__settled(); }, steps(half + 60));
  await expect(sheet, 'down past halfway: medium').toHaveAttribute('data-detent', 'medium');
  await expect(sheet).toBeVisible();
});

test('below its lowest height the backdrop fades with the drag, and comes back when the sheet settles', async ({ sized }) => {
  const { page, sheet } = await open(sized);
  await page.evaluate(() => window.__settled());
  await expect.poll(() => page.evaluate(() => window.__shade()), 'opened: the backdrop at full').toBe(1);
  await page.evaluate(d => window.__drag(d, false), steps(40, 4));
  const near = await page.evaluate(() => window.__shade());
  await page.evaluate(d => window.__drag(d, false, false), steps(130, 4).map(d => d + 40));
  const far = await page.evaluate(() => window.__shade());
  expect(near, 'a little below: a little lighter').toBeLessThan(1);
  expect(far, 'further: lighter still').toBeLessThan(near);
  expect(far).toBeGreaterThan(0.3);
  // back up and let go: the sheet stays, the backdrop is full again
  await page.evaluate(async d => { await window.__drag(d, true, false); await window.__settled(); }, steps(-170, 6).map(d => d + 170));
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await expect.poll(() => page.evaluate(() => window.__shade())).toBe(1);
  // dragged past the close line and let go: it closes, fading from where the shade was
  await page.evaluate(async d => { await window.__drag(d); await window.__settled(); }, steps(260));
  await expect(sheet).toBeHidden();
});
