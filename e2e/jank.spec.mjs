// The jank gate (README, "Responsiveness rules"): a tab swipe, a pull past a list's ends and a sheet drag, start to
// landing, on a phone whose CPU is slowed 4x (Chromium, through the DevTools protocol, with a real touch path), must keep every frame on time; a
// touched button must show pressed in the first frame. WebKit (the iPhone's engine) runs the same gestures unslowed,
// from touch and pointer events sent in the page, as the second check: there the page's own work is held (each touch's
// moves' handlers within half a frame, the touch down's and the lift's within one, pressed set by the touch itself), not
// its frames, which CI's WebKit draws in software at 3x (one repaint of the glass tab bar alone takes ~85 ms there, whatever the page does). A failure here is slow work
// to fix (move it off the gesture: transform and opacity only, afterGesture for the rest), never a number to loosen.
// The list is docs/kit-tests.md, "Jank gate".
import { test, expect } from './fixtures.mjs';

test.describe.configure({ mode: 'serial' });   // one at a time: a test beside it would steal its frames

const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';
/** the budget (ms): every drag frame within frame but one (one dropped frame), none over worst, no task over task,
 * the press shown within press; in WebKit, every move's handlers within handler, the touch down's and lift's within ends */
export const BUDGET = { frame: 20, late: 1, worst: 50, task: 50, press: 50, handler: 8, ends: 16 };
const SLOWER = 4;

async function load(sized, browserName) {
  const page = await sized(390);
  if (process.env.JANK_DEBUG) page.on('console', m => console.log('  page:', m.text()));
  await page.goto(SHELL);
  // the plain look under the slowed CPU: with no GPU here, the glass's backdrop blur is drawn in software, between the
  // page's frames, and drops one at random (a phone's GPU draws it); the page's own work is what the gate holds.
  // WebKit keeps the glass
  if (browserName === 'chromium') await page.evaluate(() => document.documentElement.classList.remove('glass'));
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  await page.evaluate(() => {
    // every frame (rAF to rAF, [start, end]) and every long task ([start, end]) from start() to stop(), split at the
    // finger's first move, its lift and the frame the glide lands in
    let frames = [], tasks = [], on = false, last = 0, moved = 0, lifted = 0;
    try {
      new PerformanceObserver(list => {
        if (on) for (const e of list.getEntries()) tasks.push([e.startTime, e.startTime + e.duration]);
      }).observe({ type: 'longtask' });
    } catch { /* WebKit: no long tasks; the frames tell */ }
    const tick = t => { if (!on) return; if (last) frames.push([last, t]); last = t; requestAnimationFrame(tick); };
    for (const type of ['touchmove', 'pointermove']) addEventListener(type, e => { if (on && !moved) moved = e.timeStamp; }, { capture: true, passive: true });
    for (const type of ['touchend', 'pointerup']) addEventListener(type, e => { if (on && !lifted) lifted = e.timeStamp; }, { capture: true, passive: true });
    window.__jank = {
      start() { frames = []; tasks = []; last = 0; moved = lifted = 0; on = true; requestAnimationFrame(tick); },
      async stop() {
        // the frame the glide lands in (its animations finish in it), then one more, so that frame's end is known
        await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
        const landed = /** @type {number} */ (document.timeline.currentTime);
        await window.__frame(); await window.__frame();
        on = false;
        const within = (x, y) => ([a, b]) => b > x && a < y, ms = ([a, b]) => b - a;
        return {
          drag: frames.filter(within(moved, lifted)).map(ms),
          glide: frames.filter(within(lifted, landed)).map(ms),
          tasks: tasks.filter(within(moved, landed)).map(ms),
        };
      },
    };
    window.__settled = () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
    window.__frame = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    window.__shown = () => [...document.querySelectorAll('.ui-screens > .ui-screen')].filter(s => !s.hidden).map(s => s.id);
  });
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOWER });
    const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    // a finger through the browser's own input path, a move every 16 ms (timed out here: nothing more for the page to run)
    const wait = () => new Promise(r => setTimeout(r, 16));
    page.__drag = async (pts) => {
      await send('touchStart', ...pts[0]);
      for (const p of pts.slice(1)) { await wait(); await send('touchMove', ...p); }
      await send('touchEnd', ...pts.at(-1));
    };
    page.__touch = async (x, y) => { await send('touchStart', x, y); };
    page.__lift = async (x, y) => { await send('touchEnd', x, y); };
  } else {
    // WebKit has no DevTools touch input: touch and pointer events from the page, a move a frame
    await page.evaluate(() => {
      window.__fire = (kind, x, y, target) => {
        const t = target ?? document.elementFromPoint(x, y);
        const touch = { identifier: 1, target: t, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY, screenX: x, screenY: y };
        const pt = { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, buttons: kind === 'up' ? 0 : 1 };
        t.dispatchEvent(new PointerEvent({ down: 'pointerdown', move: 'pointermove', up: 'pointerup' }[kind], pt));
        const e = new Event({ down: 'touchstart', move: 'touchmove', up: 'touchend' }[kind], { bubbles: true, cancelable: true, composed: true });
        const list = kind === 'up' ? [] : [touch];
        Object.defineProperties(e, { touches: { value: list }, targetTouches: { value: list }, changedTouches: { value: [touch] } });
        t.dispatchEvent(e);
        return t;
      };
      // how long the page's handlers took for each touch (the events are sent here, so their handlers run inside)
      window.__handlers = [];
      const timed = (...a) => { const t0 = performance.now(); const t = window.__fire(...a); window.__handlers.push(performance.now() - t0); return t; };
      // a move every 16 ms by the clock, as a finger does (software drawing makes this browser's frames slow here)
      window.__drag = async pts => {
        window.__handlers = [];
        const t = timed('down', ...pts[0]);
        for (const p of pts.slice(1)) { await new Promise(r => setTimeout(r, 16)); timed('move', ...p, t); }
        timed('up', ...pts.at(-1), t);
      };
    });
    page.__webkit = true;
    page.__drag = pts => page.evaluate(p => window.__drag(p), pts);
    page.__touch = (x, y) => page.evaluate(([x, y]) => { window.__fire('down', x, y); }, [x, y]);
    page.__lift = (x, y) => page.evaluate(([x, y]) => { window.__fire('up', x, y, document.elementFromPoint(x, y)); }, [x, y]);
  }
  return page;
}

/** n moves from a to b @param {[number, number]} a @param {[number, number]} b @param {number} n */
const path = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);

/** measure a gesture and hold it to the budget: while the finger drags, the page draws each frame itself (the main
 * thread), so every frame counts; once it lets go, the glide runs on the compositor, and the main thread needs only to
 * stay free for a finger that catches it (no long task, no frame held past the worst) */
async function gate(page, what, run) {
  if (page.__webkit) {
    await run();
    await page.evaluate(() => window.__settled());
    const ms = await page.evaluate(() => window.__handlers);
    // a move does almost nothing (half a frame at most); the touch down lays out the pages beside and the lift starts
    // the glide, so each of those may take a frame
    const moves = ms.slice(1, -1), ends = [ms[0], ms.at(-1)];
    const r = x => Math.round(x * 10) / 10;
    const got = { touches: ms.length, move: r(Math.max(...moves)), ends: r(Math.max(...ends)) };
    console.log(`jank ${what}: ${JSON.stringify(got)}`);
    expect(got.touches, `${what}: enough touches to judge`).toBeGreaterThan(4);
    expect(got.move, `${what}: every move's handlers within ${BUDGET.handler} ms`).toBeLessThanOrEqual(BUDGET.handler);
    expect(got.ends, `${what}: the touch down's and the lift's within ${BUDGET.ends} ms`).toBeLessThanOrEqual(BUDGET.ends);
    return;
  }
  await page.evaluate(() => window.__jank.start());
  await run();
  const { drag, glide, tasks } = await page.evaluate(() => window.__jank.stop());
  const got = {
    frames: drag.length, late: drag.filter(x => x > BUDGET.frame).length, worst: Math.round(Math.max(...drag)),
    glide: glide.length, glideWorst: Math.round(Math.max(0, ...glide)), task: Math.round(Math.max(0, ...tasks)),
  };
  console.log(`jank ${what}: ${JSON.stringify(got)}`);
  if (process.env.JANK_DEBUG) console.log(drag.map(Math.round).join(' '), '|', glide.map(Math.round).join(' '));
  expect(got.frames, `${what}: enough frames to judge`).toBeGreaterThan(4);
  expect(got.late, `${what}: drag frames over ${BUDGET.frame} ms (at most ${BUDGET.late})`).toBeLessThanOrEqual(BUDGET.late);
  expect(got.worst, `${what}: no drag frame over ${BUDGET.worst} ms`).toBeLessThanOrEqual(BUDGET.worst);
  expect(got.glide, `${what}: a glide to judge`).toBeGreaterThan(4);
  expect(got.glideWorst, `${what}: no frame of the glide held over ${BUDGET.worst} ms`).toBeLessThanOrEqual(BUDGET.worst);
  expect(got.task, `${what}: no task over ${BUDGET.task} ms`).toBeLessThanOrEqual(BUDGET.task);
}

test('a tab swipe and its glide keep every frame on time on a slow phone', async ({ sized, browserName }) => {
  const page = await load(sized, browserName);
  await gate(page, `tab swipe (${browserName})`, () => page.__drag(path([300, 420], [90, 420], 14)));
  expect(await page.evaluate(() => window.__shown())).toEqual(['rooms']);
  // and back, a quick flick
  await gate(page, `tab flick back (${browserName})`, () => page.__drag(path([100, 420], [260, 420], 5)));
  expect(await page.evaluate(() => window.__shown())).toEqual(['home']);
});

test('a pull past the list\'s top and bottom and the spring back keep every frame on time on a slow phone', async ({ sized, browserName }) => {
  const page = await load(sized, browserName);
  const moved = () => page.evaluate(() => [...document.querySelectorAll('.ui-screen:not([hidden]) > *')].some(e => e.getAnimations().length));
  await gate(page, `pull at the top (${browserName})`, async () => {
    await page.__drag(path([200, 300], [200, 480], 12));
    expect(await moved(), 'a spring back').toBe(true);
  });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await gate(page, `pull at the end (${browserName})`, async () => {
    await page.__drag(path([200, 600], [200, 420], 12));
    expect(await moved(), 'a spring back').toBe(true);
  });
});

test('a sheet dragged by its grabber and let go keeps every frame on time on a slow phone', async ({ sized, browserName }) => {
  const page = await load(sized, browserName);
  await page.locator('.ui-tabbar [data-open-sheet="#sheet"]').click();
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await page.evaluate(() => window.__settled());
  // up to full height, down to half, then down and away
  const grab = async () => {
    const g = await page.locator('#sheet .ui-sheet-grabber').boundingBox();
    return [Math.round(g.x + g.width / 2), Math.round(g.y + g.height / 2)];
  };
  let at = await grab();
  await gate(page, `sheet up (${browserName})`, () => page.__drag(path(at, [at[0], at[1] - 260], 12)));
  await expect(sheet).toHaveAttribute('data-detent', 'large');
  at = await grab();
  await gate(page, `sheet down (${browserName})`, () => page.__drag(path(at, [at[0], at[1] + 300], 10)));
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  at = await grab();
  await gate(page, `sheet down to close (${browserName})`, () => page.__drag(path(at, [at[0], 820], 8)));
  await expect(sheet).not.toHaveAttribute('open', '');
});

test('a touched button shows pressed in the first frame on a slow phone', async ({ sized, browserName }) => {
  const page = await load(sized, browserName);
  const tab = page.locator('.ui-tabbar [data-tab-page="#jobs"]');
  const b = await tab.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  if (page.__webkit) {
    // pressed by the touch itself, its handlers quick (the frame that shows it is software drawing here)
    const got = await page.evaluate(([x, y]) => {
      const t0 = performance.now();
      const t = window.__fire('down', x, y);
      return { handler: Math.round((performance.now() - t0) * 10) / 10, pressed: !!t.closest('.ui-tab')?.hasAttribute('data-pressed') };
    }, [x, y]);
    console.log(`jank press (webkit): ${JSON.stringify(got)}`);
    expect(got.pressed, 'pressed by the touch itself').toBe(true);
    expect(got.handler, `the touch's handlers within ${BUDGET.ends} ms`).toBeLessThanOrEqual(BUDGET.ends);
    await page.__lift(x, y);
    await expect(tab).not.toHaveAttribute('data-pressed');
    return;
  }
  // when the touch arrived, and the first painted frame that shows it pressed
  await page.evaluate(() => {
    window.__press = new Promise(r => {
      addEventListener('pointerdown', e => {
        const t0 = performance.now(), el = e.target.closest('.ui-tab');
        const look = () => requestAnimationFrame(() => el.hasAttribute('data-pressed') ? r(performance.now() - t0) : look());
        look();
      }, { once: true, capture: true });
    });
  });
  await page.__touch(x, y);
  const ms = Math.round(await page.evaluate(() => window.__press));
  console.log(`jank press (${browserName}): ${ms} ms`);
  expect(ms, `pressed within ${BUDGET.press} ms`).toBeLessThanOrEqual(BUDGET.press);
  await expect(tab).toHaveAttribute('data-pressed', '');
  await page.__lift(x, y);
  await expect(tab).not.toHaveAttribute('data-pressed');
});
