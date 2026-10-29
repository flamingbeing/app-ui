// Haptics (ui/gesture.js haptic) on the kit pages at 390 px, in Chromium and WebKit: which kind each gesture gives,
// and none with Haptics Off. navigator.vibrate is a stand-in that writes down each pattern (WebKit has none of its
// own); fingers are page-made touch and pointer events. The list is docs/kit-tests.md, "Haptics".
import { test, expect } from './fixtures.mjs';

const KIT = '/ui/0.0.0-dev/kit/';
const SHELL = '/ui/0.0.0-dev/kit/shell/';
const buzzes = page => page.evaluate(() => window.__buzz.splice(0));

async function load(sized, url) {
  const page = await sized(390);
  await page.addInitScript(() => {
    window.__buzz = [];
    Navigator.prototype.vibrate = function (p) { window.__buzz.push(p); return true; };
  });
  await page.goto(url);
  await page.evaluate(() => {
    const frame = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    // touch events with one touch, a frame apart; each step is [x, y]
    window.__finger = async (steps, { lift = true } = {}) => {
      let at = steps[0];
      const target = document.elementFromPoint(at[0], at[1]);
      const fire = (type, [x, y]) => {
        const touch = { identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y };
        const e = new Event(type, { bubbles: true, cancelable: true, composed: true });
        const list = type === 'touchend' ? [] : [touch];
        Object.defineProperties(e, { touches: { value: list }, targetTouches: { value: list }, changedTouches: { value: [touch] } });
        target.dispatchEvent(e);
      };
      fire('touchstart', at);
      for (const s of steps.slice(1)) { await frame(); at = s; fire('touchmove', at); }
      if (lift) fire('touchend', at);
    };
    // a touch pointer on el, moved by dys (a frame apart), then up
    window.__pointer = async (el, dys) => {
      const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      const fire = (type, dy) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true,
        pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y + dy, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      fire('pointerdown', 0);
      for (const dy of dys) { await frame(); fire('pointermove', dy); }
      await frame();
      fire('pointerup', dys.at(-1) ?? 0);
    };
    window.__settled = () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
  });
  return page;
}
const line = (x0, d, n, y = 420) => [[x0, y], ...Array.from({ length: n }, (_, i) => [x0 + d * (i + 1) / n, y])];

test('the drawer pulled past half gives one threshold, back under half another; Haptics Off: none', async ({ sized }) => {
  const page = await load(sized, SHELL);
  const w = await page.evaluate(() => document.querySelector('nav.ui-sidebar').offsetWidth || 288);
  const out = line(40, w * 0.7, 10), back = line(40 + w * 0.7, -w * 0.5, 6).slice(1);
  await page.evaluate(async steps => { await window.__finger(steps); await window.__settled(); }, [...out, ...back]);
  expect(await buzzes(page), 'out past half, then back under it').toEqual([12, 12]);
  await expect(page.locator('.ui-shell')).not.toHaveClass(/is-drawer-open/);
  await page.evaluate(() => { document.documentElement.dataset.haptics = 'off'; });
  await page.evaluate(async steps => { await window.__finger(steps); await window.__settled(); }, line(40, w * 0.7, 10));
  expect(await buzzes(page), 'Haptics Off').toEqual([]);
});

test('a sheet dragged down past where a let-go closes it gives a threshold, and back up another', async ({ sized }) => {
  const page = await load(sized, SHELL);
  await page.locator('nav.ui-tabbar [data-open-sheet="#sheet"]').tap();
  await expect(page.locator('#sheet')).toBeVisible();
  await page.evaluate(() => window.__settled());
  await buzzes(page);
  await page.evaluate(() => window.__pointer(document.querySelector('#sheet .ui-sheet-grabber'), [20, 60, 100, 160, 200, 100, 40]));
  expect(await buzzes(page)).toEqual([12, 12]);
  await page.evaluate(() => window.__settled());
  await expect(page.locator('#sheet')).toBeVisible();
});

test('touch and hold gives a long; a switch turned on ticks, turned off is quiet (Haptics Off by then)', async ({ sized }) => {
  const page = await load(sized, KIT);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('.ui-row')].find(r => r.textContent.includes('Fern'));
    const b = row.getBoundingClientRect();
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch',
      isPrimary: true, clientX: b.x + 40, clientY: b.y + b.height / 2, button: 0, buttons: 1 }));
  });
  await expect(page.locator('.ui-menu[role=menu]')).toBeVisible();
  expect(await buzzes(page)).toEqual([20]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ui-menu')).toHaveCount(0);
  const box = page.locator('#haptics');
  await expect(box).toBeChecked();
  await box.tap();
  await expect(page.locator('html')).toHaveAttribute('data-haptics', 'off');
  expect(await buzzes(page), 'turned off: quiet').toEqual([]);
  await box.tap();
  await expect(page.locator('html')).not.toHaveAttribute('data-haptics', /./);
  expect(await buzzes(page), 'turned on: a tick').toEqual([8]);
});

test('the theme switch\'s Haptics Off is kept on this device and put back before the first paint', async ({ sized }) => {
  const page = await load(sized, '/ui/0.0.0-dev/kit/settings/');
  const pick = page.locator('#haptics-pick');
  await expect(pick).toHaveValue('on');
  await pick.selectOption('off');
  await expect(page.locator('html')).toHaveAttribute('data-haptics', 'off');
  await page.goto(SHELL);
  await expect(page.locator('html')).toHaveAttribute('data-haptics', 'off');
  await page.evaluate(() => { window.__buzz = []; });
  await page.evaluate(() => import('/ui/0.0.0-dev/ui/gesture.js').then(m => m.haptic('confirm')));
  expect(await page.evaluate(() => window.__buzz)).toEqual([]);
});
