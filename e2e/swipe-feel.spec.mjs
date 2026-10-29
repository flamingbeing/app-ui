// The swipe's feel in both engines (Chromium and WebKit, the stand-in for an iPhone): the tab pages and the drawer
// follow the finger frame by frame, glide on without a jump, can be caught mid-glide, and quick flicks all count.
// WebKit has no DevTools touch input, so the finger here is touch events sent from the page, one per frame
// (tabs.spec.mjs drives the real input path in Chromium). The list is docs/kit-tests.md, "Tab pages".
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';

async function load(sized, query = '') {
  const page = await sized(390);
  await page.goto(`${SHELL}${query}`);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  await page.evaluate(() => {
    // a finger: touch events with one touch, at the frame rate; each step is [x, y] or null (a frame held still)
    // each event carries the time a 60 Hz finger would give it (the speed it is let go at reads off these), so a busy
    // machine's slow frames don't turn a flick into a slow drag
    let clock = 0;
    const fire = (type, x, y, at = clock) => {
      const target = type === 'touchstart' ? document.elementFromPoint(x, y) : window.__target;
      if (type === 'touchstart') window.__target = target;
      const touch = { identifier: 1, target, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY, screenX: x, screenY: y };
      const e = new Event(type, { bubbles: true, cancelable: true, composed: true });
      const list = type === 'touchend' ? [] : [touch];
      Object.defineProperties(e, { touches: { value: list }, targetTouches: { value: list }, changedTouches: { value: [touch] }, timeStamp: { value: at } });
      target.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const frame = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    // start false: the same finger moves on (steps[0] is where it is); it lifts straight after its last move, as a
    // flicking finger does (a frame's wait would read as a finger held still, and headless frames can run 80 ms)
    window.__finger = async (steps, { lift = true, start = true } = {}) => {
      let at = steps[0];
      clock = Math.max(clock, performance.now());
      if (start) fire('touchstart', at[0], at[1]);
      for (const s of steps.slice(1)) { await frame(); clock += 1000 / 60; if (s) { at = s; fire('touchmove', at[0], at[1]); } }
      if (lift) fire('touchend', at[0], at[1], clock += 8);
      return at;
    };
    window.__lift = (x, y) => fire('touchend', x, y, clock += 8);
    window.__x = id => { const e = document.getElementById(id); return e.hidden ? null : Math.round(e.getBoundingClientRect().x); };
    window.__shown = () => [...document.querySelectorAll('.ui-screens > .ui-screen')].filter(s => !s.hidden).map(s => s.id);
    window.__settled = () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
    // the pages' x, every frame, and when
    window.__frames = [];
    const f = t => { window.__frames.push([window.__x('home'), window.__x('rooms'), t]); requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  return page;
}
/** a drag across the middle of the page from x0 by d px over n frames, then held for `hold` frames */
const line = (x0, d, n, hold = 0, y = 420) => [[x0, y], ...Array.from({ length: n }, (_, i) => [x0 + d * (i + 1) / n, y]), ...Array(hold).fill(null)];

test('the pages follow the finger from the first frames, the next one beside; let go, they glide on without a jump', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(300, -220, 12));
  expect(await page.evaluate(() => [window.__x('home'), window.__x('rooms')]), 'under the finger: 220 px along').toEqual([-220, 170]);
  await page.evaluate(() => { window.__frames = []; window.__lift(80, 420); });
  expect(await page.evaluate(() => document.getElementById('home').getAnimations().length), 'a glide, not a jump').toBe(1);
  await page.evaluate(() => window.__settled());
  expect(await page.evaluate(() => window.__shown())).toEqual(['rooms']);
  const fs = (await page.evaluate(() => window.__frames)).filter(f => f[1] !== null);
  const xs = fs.map(f => f[1]);
  expect(xs.length, 'several frames of glide').toBeGreaterThan(5);
  expect(xs.every((x, i) => i === 0 || x <= xs[i - 1]), 'always toward its place, never back').toBe(true);
  // speed, not px per frame: a busy machine's frames can run 80 ms
  const speed = Math.max(...fs.slice(1).map((f, i) => (fs[i][1] - f[1]) / Math.max(f[2] - fs[i][2], 1000 / 60)));
  expect(speed, 'no faster than a fast finger (px/ms)').toBeLessThan(5);
  expect(xs.at(-1)).toBe(0);
});

test('Reduce Motion: the pages still follow the finger and glide (the switch without a slide was rc.30’s)', async ({ sized }) => {
  const page = await load(sized);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(300, -60, 6));
  // polled: WebKit with emulated Reduce Motion paints the move a frame later
  await expect.poll(() => page.evaluate(() => [window.__x('home'), window.__x('rooms')])).toEqual([-60, 330]);
  await page.evaluate(async steps => { await window.__finger(steps, { start: false }); }, line(240, -150, 4));
  await page.evaluate(() => window.__settled());
  expect(await page.evaluate(() => window.__shown())).toEqual(['rooms']);
});

test('a finger caught on the gliding pages holds them; quick flicks one after another each go a page', async ({ sized }) => {
  const page = await load(sized);
  // let go past half, slowly: it glides on; a finger lands on it a few frames in
  await page.evaluate(async steps => { await window.__finger(steps); }, line(300, -220, 20));
  const caught = await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await new Promise(r => requestAnimationFrame(r));
    await window.__finger([[200, 420]], { lift: false });
    const a = window.__x('home') ?? window.__x('rooms');
    for (let i = 0; i < 8; i++) await new Promise(r => requestAnimationFrame(r));
    return [a, window.__x('home') ?? window.__x('rooms')];
  });
  expect(caught[1], 'held where it was caught').toBe(caught[0]);
  await page.evaluate(() => { window.__lift(200, 420); return window.__settled(); });
  expect(await page.evaluate(() => window.__shown())).toEqual(['rooms']);
  // three flicks, each starting while the last still glides
  await page.evaluate(() => document.querySelector('[data-tab-page="#home"]').click());
  await page.evaluate(() => window.__settled());
  await page.evaluate(async steps => {
    for (let i = 0; i < 3; i++) {
      await window.__finger(steps);
      for (let f = 0; f < 3; f++) await new Promise(r => requestAnimationFrame(r));
    }
    await window.__settled();
  }, line(300, -90, 4));
  expect(await page.evaluate(() => window.__shown())).toEqual(['settings']);
});

test('the drawer: a right swipe on the first page never pulls it out; opened by its button, a left swipe on the shade puts it back', async ({ sized }) => {
  const page = await load(sized);
  const side = () => page.evaluate(() => Math.round(document.querySelector('nav.ui-sidebar').getBoundingClientRect().x));
  await page.evaluate(async steps => { await window.__finger(steps); await window.__settled(); }, line(60, 160, 8));
  await expect(page.locator('.ui-shell')).not.toHaveClass(/is-drawer-(open|moving)/);
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Sections' }).click();
  await page.evaluate(() => window.__settled());
  await expect(page.locator('.ui-shell')).toHaveClass(/is-drawer-open/);
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(350, -40, 4));
  expect(await side(), 'pushed back with the finger').toBe(-40);
  await page.evaluate(async steps => { await window.__finger(steps, { start: false }); await window.__settled(); }, line(310, -200, 4));
  await expect(page.locator('.ui-shell')).not.toHaveClass(/is-drawer-(open|moving)/);
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
});

test('Back closes the drawer and nothing more; while it is open the page behind is inert', async ({ sized }) => {
  const page = await load(sized);
  const shell = page.locator('.ui-shell');
  const inert = () => page.evaluate(() => ['main.ui-screens', 'nav.ui-tabbar', 'header.ui-bar'].map(s => document.querySelector(s).inert));
  await page.getByRole('button', { name: 'Sections' }).click();
  await page.evaluate(() => window.__settled());
  await expect(shell).toHaveClass(/is-drawer-open/);
  expect(await inert(), 'the page behind is inert').toEqual([true, true, true]);
  expect(await page.evaluate(() => document.querySelector('nav.ui-sidebar').inert)).toBe(false);
  await page.goBack();
  await expect(shell).not.toHaveClass(/is-drawer-(open|moving)/);
  expect(await page.evaluate(() => window.__shown()), 'still on the first page').toEqual(['home']);
  expect(await inert()).toEqual([false, false, false]);
  // a side link: the drawer's entry goes, the new page's comes in its place; Back then goes to the first page
  await page.getByRole('button', { name: 'Sections' }).click();
  await expect(shell).toHaveClass(/is-drawer-open/);
  await page.locator('.ui-side-link', { hasText: 'Jobs' }).click();
  await expect(shell).not.toHaveClass(/is-drawer-(open|moving)/);
  await expect.poll(() => page.evaluate(() => history.state?.uiTabBack ?? null)).toBe(1);
  expect(await page.evaluate(() => [window.__shown(), history.state?.uiDrawer ?? null])).toEqual([['jobs'], null]);
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.__shown())).toEqual(['home']);
});

test('a sheet closed by Esc (Chrome’s Back on Android asks a dialog to close the same way) steps back once, not twice', async ({ sized }) => {
  const page = await load(sized);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Jobs' }).click();
  await expect.poll(() => page.evaluate(() => history.state?.uiTabBack ?? null)).toBe(1);
  const length = await page.evaluate(() => history.length);
  await page.locator('nav.ui-tabbar [data-open-sheet="#sheet"]').click();
  await expect(page.locator('#sheet')).toBeVisible();
  await expect.poll(() => page.evaluate(() => history.state?.uiSheet ?? null)).toBe('sheet');
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).toBeHidden();
  await expect.poll(() => page.evaluate(() => history.state?.uiSheet ?? null)).toBe(null);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [window.__shown(), history.state?.uiTabBack ?? null, history.length]), 'the tab’s entry stays').toEqual([['jobs'], 1, length + 1]);
});

test('one part owns a touch: a tab swipe takes it from a pressed row (the press and the hold clear), and it is free again once the finger lifts', async ({ sized }) => {
  const page = await load(sized);
  const row = page.locator('#home .ui-row[data-hold-menu]').first();
  const b = await row.boundingBox();
  const y = Math.round(b.y + b.height / 2);
  await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 }));
  }, [300, y]);
  await expect(row).toHaveAttribute('data-pressed', '');
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(300, -120, 6, 0, y));
  expect(await page.evaluate(() => import('/ui/0.0.0-dev/ui/gesture.js').then(m => m.captured()))).toBe('tabs');
  await expect(row, 'the press cleared as the swipe took the touch').not.toHaveAttribute('data-pressed', '');
  await page.waitForTimeout(650);
  await expect(page.locator('.ui-menu'), 'no hold menu').toHaveCount(0);
  await page.evaluate(async () => { window.__lift(180, 420); await window.__settled(); });
  await expect.poll(() => page.evaluate(() => import('/ui/0.0.0-dev/ui/gesture.js').then(m => m.captured()))).toBe(null);
  expect(await page.evaluate(() => window.__shown())).toEqual(['rooms']);
});
