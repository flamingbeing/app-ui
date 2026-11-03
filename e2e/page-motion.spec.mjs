// Page push / pop, fade-through, settings sub-page slide (rc.84 items 5-7). Runs on GitHub.
import { test, expect, BASE } from './fixtures.mjs';

test('a pushed screen slides 250 ms, the one under shifts; the pop takes 300 ms', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    const { screenStack } = await import(BASEJS + 'ui/index.js');
    const host = document.querySelector('.ui-screens');
    if (!host) return null;
    const st = screenStack(host);
    const target = host.querySelectorAll(':scope > .ui-screen')[1];
    st.push(target);
    const anims = target.getAnimations().concat(host.getAnimations({ subtree: true }));
    const dur = new Set(anims.map(a => a.effect.getTiming().duration));
    const under = host.querySelector('.ui-screen.is-under')?.getAnimations()[0]?.effect.getKeyframes().map(k => k.transform);
    st.stop();
    return { dur: [...dur], under };
  }, BASE);
  test.skip(!r, 'no screens in this gallery page');
  expect(r.dur).toContain(250);
  expect(r.under?.[1]).toContain('translateX');   // the one under shifts (parallax)
});

test('push with motion fade is a cut, then its blocks fade 150 ms, 20 ms apart, no transform', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    const { screenStack } = await import(BASEJS + 'ui/index.js');
    const host = document.querySelector('.ui-screens');
    if (!host) return null;
    const st = screenStack(host);
    const target = host.querySelectorAll(':scope > .ui-screen')[1];
    st.push(target, { motion: 'fade' });
    const own = target.getAnimations().length;
    const kids = target.getAnimations({ subtree: true }).filter(x => x.effect.target !== target);
    const a = kids[0];
    const out = { own, delays: kids.map(x => x.effect.getTiming().delay), dur: a.effect.getTiming().duration, props: a.effect.getKeyframes().map(k => Object.keys(k).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))).flat() };
    st.stop();
    return out;
  }, BASE);
  test.skip(!r, 'no screens in this gallery page');
  expect(r.own).toBe(0);   // the screen itself shows at once
  expect(r.dur).toBe(150);
  expect(r.delays.slice(0, 2)).toEqual([0, 20]);
  expect(r.props.every(p => p === 'opacity')).toBe(true);
});

test('settings page slides in full width over 250 ms without fading', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/settings/?menu`);
  await expect.poll(() => page.evaluate(() => !!window.kit)).toBe(true);
  const r = await page.evaluate(() => {
    const go = document.querySelector('.ui-settings-menu button, .ui-settings-menu a');
    if (!go) return null;
    go.click();
    const anims = document.querySelector('.ui-settings')?.getAnimations({ subtree: true }) ?? [];
    return anims.map(a => ({ d: a.effect.getTiming().duration, k: a.effect.getKeyframes().map(k => k.opacity ?? null) }));
  });
  expect(r).not.toBeNull();
  expect(r.some(a => a.d === 250)).toBe(true);
  expect(r.every(a => a.k.every(o => o === null))).toBe(true);
});
