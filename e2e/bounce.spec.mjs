// The bounce (ui/bounce.js) in both engines (Chromium and WebKit, the stand-in for an iPhone): a pull past the list's
// top or bottom stretches the content under the bars, rubber-banded, the bars and the action bar staying put; let go,
// it springs back and lands with no transform left; a finger catches it on the way; a sideways swipe, [data-no-bounce]
// and a sheet body's top never stretch. In Chromium, through the real input path: a fling into the end bounces at its
// speed (not with Less motion), a mouse wheel never does. The list is docs/kit-tests.md, "Bounce".
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/';

async function load(sized) {
  const page = await sized(390);
  await page.goto(SHELL);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  await page.evaluate(() => {
    // a finger: touch events with one touch, a move a frame (the browser doesn't scroll for these: at an end it
    // wouldn't anyway)
    const fire = (type, x, y) => {
      const target = type === 'touchstart' ? document.elementFromPoint(x, y) : window.__target;
      if (type === 'touchstart') window.__target = target;
      const touch = { identifier: 1, target, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY, screenX: x, screenY: y };
      const e = new Event(type, { bubbles: true, cancelable: true, composed: true });
      const list = type === 'touchend' ? [] : [touch];
      Object.defineProperties(e, { touches: { value: list }, targetTouches: { value: list }, changedTouches: { value: [touch] } });
      target.dispatchEvent(e);
    };
    const frame = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    window.__finger = async (steps, { lift = true } = {}) => {
      fire('touchstart', ...steps[0]);
      for (const s of steps.slice(1)) { await frame(); fire('touchmove', ...s); }
      if (lift) fire('touchend', ...steps.at(-1));
    };
    window.__touch = (x, y) => fire('touchstart', x, y);
    window.__lift = (x, y) => fire('touchend', x, y);
    // how far each part of the shown screen is moved (null: not moved), and how many animations it runs
    window.__moved = () => [...document.querySelectorAll('.ui-screen:not([hidden]) > *')].map(e => [e.className,
      e.style.transform ? Math.round(new DOMMatrix(getComputedStyle(e).transform).m42) : null, e.getAnimations().length]);
    window.__settled = () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
  });
  return page;
}
const line = (x, y0, d, n) => Array.from({ length: n + 1 }, (_, i) => [x, y0 + d * i / n]);
const moved = page => page.evaluate(() => window.__moved());
/** the parts that moved, as [class, px] */
const shifted = async page => (await moved(page)).filter(([, y]) => y !== null).map(([c, y]) => [c, y]);

test('a pull past the top stretches the list under the finger, rubber-banded; let go, it springs back', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(200, 300, 160, 10));
  const parts = await shifted(page);
  const span = await page.evaluate(() => innerHeight);
  const want = Math.round((1 - 1 / (160 * 0.55 / span + 1)) * span);   // rubber(160, the screen's height)
  expect(parts.map(([c]) => c), 'the content moves').toContain('ui-list');
  for (const [, y] of parts) expect(Math.abs(y - want), 'stretched, less than the finger went').toBeLessThanOrEqual(1);
  expect(parts.map(([c]) => c), 'the action bar (fixed) stays').not.toContain('ui-action-bar');
  expect(await page.evaluate(() => document.querySelector('.ui-bar').style.transform), 'the bar stays').toBe('');
  await page.evaluate(() => window.__lift(200, 460));
  expect((await moved(page)).filter(([, , n]) => n === 1).length, 'a spring back, one animation a part').toBe(parts.length);
  await page.evaluate(() => window.__settled());
  expect(await shifted(page), 'landed: no transform left').toEqual([]);
  expect((await moved(page)).every(([, , n]) => n === 0)).toBe(true);
});

test('a pull past the bottom stretches it up, and a finger catches the spring back where it is', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(async steps => { await window.__finger(steps); }, line(200, 600, -200, 8));
  await page.evaluate(() => new Promise(r => setTimeout(r, 60)));
  await page.evaluate(() => window.__touch(200, 400));
  const caught = await shifted(page);
  expect(caught.length, 'held where the finger caught it').toBeGreaterThan(0);
  for (const [, y] of caught) expect(y, 'still above its place').toBeLessThan(-2);
  expect((await moved(page)).every(([, , n]) => n === 0), 'the spring stopped').toBe(true);
  await page.evaluate(() => window.__lift(200, 400));
  await page.evaluate(() => window.__settled());
  expect(await shifted(page)).toEqual([]);
});

test('a sideways swipe and [data-no-bounce] never stretch', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(async () => {
    const steps = Array.from({ length: 9 }, (_, i) => [300 - i * 25, 300 + i * 6]);
    await window.__finger(steps, { lift: false });
  });
  expect(await shifted(page), 'sideways: the pager\'s').toEqual([]);
  await page.evaluate(() => window.__lift(100, 348));
  await page.evaluate(() => window.__settled());
  await page.evaluate(() => document.querySelector('.ui-screen:not([hidden])').setAttribute('data-no-bounce', ''));
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(200, 300, 160, 10));
  expect(await shifted(page)).toEqual([]);
  await page.evaluate(() => window.__lift(200, 460));
});

test('in a sheet: its body stretches past its bottom, never past its top (that pull is the sheet\'s)', async ({ sized }) => {
  const page = await load(sized);
  await page.locator('.ui-tabbar [data-open-sheet="#sheet"]').click();
  await page.evaluate(() => {
    window.kit.sheets.get('sheet').setDetent('large');
    const body = document.querySelector('#sheet .ui-sheet-body');
    for (let i = 0; i < 30; i++) body.append(Object.assign(document.createElement('p'), { textContent: `Line ${i + 1}` }));
  });
  await page.evaluate(() => window.__settled());
  const box = await page.locator('#sheet .ui-sheet-body').boundingBox();
  const x = box.x + box.width / 2, mid = box.y + box.height / 2;
  const body = () => page.evaluate(() => [...document.querySelector('#sheet .ui-sheet-body').children]
    .map(e => e.style.transform).filter(Boolean).length);
  await page.evaluate(() => { const b = document.querySelector('#sheet .ui-sheet-body'); b.scrollTop = b.scrollHeight; });
  await page.evaluate(() => new Promise(r => setTimeout(r, 100)));   // the sheet hears the scroll (its touch-action)
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(x, mid + 100, -150, 8));
  expect(await body(), 'past the bottom: stretched').toBeGreaterThan(0);
  await page.evaluate(([x, y]) => window.__lift(x, y), [x, mid - 50]);
  await page.evaluate(() => window.__settled());
  expect(await body()).toBe(0);
  await page.evaluate(() => { document.querySelector('#sheet .ui-sheet-body').scrollTop = 0; });
  await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
  await page.evaluate(async steps => { await window.__finger(steps, { lift: false }); }, line(x, mid - 100, 120, 8));
  expect(await body(), 'past the top: the sheet\'s, not a stretch').toBe(0);
  await page.evaluate(([x, y]) => window.__lift(x, y), [x, mid + 20]);
});

test.describe('through the real input path', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'DevTools touch input is Chromium\'s');

  /** a fling up to the end, through the browser's own input, then the frames until it bounces (or not) */
  async function fling(page) {
    const cdp = await page.context().newCDPSession(page);
    // each event stamped 16 ms after the last, so a busy machine's timing can't slow the fling the browser reads
    const t0 = Date.now() / 1000;
    let n = 0;
    const send = (type, y) => cdp.send('Input.dispatchTouchEvent',
      { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 200, y }], timestamp: t0 + 0.016 * n++ });
    // a longer list, the finger starting 450 px from its end: room for the fling to be under way when it gets there
    await page.evaluate(() => {
      const list = document.querySelector('.ui-screen:not([hidden]) .ui-list');
      if (list.children.length < 40) for (const r of [...list.children]) list.append(r.cloneNode(true), r.cloneNode(true));
      scrollTo(0, document.documentElement.scrollHeight - innerHeight - 450);
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
    // fast, but not far enough to reach the end under the finger (that would be a pull): the fling takes it there
    await send('touchStart', 560);
    for (let i = 1; i <= 6; i++) { await new Promise(r => setTimeout(r, 16)); await send('touchMove', 560 - i * 40); }
    expect(await page.evaluate(() => scrollY < document.documentElement.scrollHeight - innerHeight - 1), 'the finger stopped short of the end').toBe(true);
    await send('touchEnd', 320);
    return page.evaluate(() => new Promise(r => {
      const t0 = performance.now();
      const look = () => {
        const n = [...document.querySelectorAll('.ui-screen:not([hidden]) > *')].reduce((s, e) => s + e.getAnimations().length, 0);
        if (n || performance.now() - t0 > 2500) r(n); else requestAnimationFrame(look);
      };
      look();
    }));
  }

  test('a fling into the end bounces past it and back; with Less motion it just stops', async ({ sized }) => {
    const page = await load(sized);
    expect(await fling(page), 'a bounce at the end').toBeGreaterThan(0);
    await page.evaluate(() => window.__settled());
    expect(await shifted(page)).toEqual([]);
    expect(await page.evaluate(() => scrollY > 0)).toBe(true);
    await page.evaluate(() => { document.documentElement.dataset.motion = 'still'; });
    expect(await fling(page), 'Less motion: no bounce').toBe(0);
  });

  test('a mouse wheel to the end never bounces', async ({ sized }) => {
    const page = await load(sized);
    await page.mouse.move(200, 400);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
    expect(await page.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest?.('.ui-screen')).length)).toBe(0);
  });
});
