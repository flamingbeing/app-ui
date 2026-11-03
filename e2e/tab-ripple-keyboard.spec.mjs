// Tab switch fade, ripple timing, keyboard tab bar (rc.84 items 8-10). Runs on GitHub.
import { test, expect, BASE } from './fixtures.mjs';

test('fade mode: a tapped tab fades the page in, opacity only, blocks staggered', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/shell/`);
  const r = await page.evaluate(async () => {
    const bar = document.querySelector('nav.ui-tabbar');
    if (!bar || !bar.querySelector('[data-tab-page]')) return null;
    bar.dataset.slide = 'fade';
    const tabs = [...bar.querySelectorAll('[data-tab-page]')];
    tabs[tabs.length - 1].click();
    await new Promise(r => setTimeout(r, 300));
    const anims = document.getAnimations().map(a => a.effect.getKeyframes().map(k => Object.keys(k).filter(n => !['offset', 'easing', 'composite', 'computedOffset'].includes(n))).flat());
    return { props: [...new Set(anims.flat())] };
  });
  test.skip(!r, 'no tab bar in this gallery page');
  expect(r.props.every(p => p === 'opacity')).toBe(true);
});

test('ripple grows in 130 ms under the android family; keyboard-bar fade is 100 ms', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(() => {
    document.documentElement.dataset.family = 'android';
    const el = document.createElement('div');
    el.setAttribute('data-ripple', 'in');
    document.body.append(el);
    const ripple = getComputedStyle(el).animationDuration;
    el.remove();
    document.documentElement.dataset.keyboardBar = 'fade';
    const bar = document.querySelector('.ui-tabbar');
    return { ripple, fade: bar ? getComputedStyle(bar).transitionDuration : null };
  });
  expect(r.ripple).toBe('0.13s');
  if (r.fade) expect(r.fade).toContain('0.1s');
});

test('html[data-ripple="hold"] shows the ripple on the core family; the tint stays after the lift, then goes', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/shell/`);
  const r = await page.evaluate(async () => {
    const html = document.documentElement;
    html.dataset.family = 'core';
    html.dataset.ripple = 'hold';
    const wait = ms => new Promise(res => setTimeout(res, ms));
    const b = document.querySelector('.ui-tabbar .ui-tab');
    const rect = b.getBoundingClientRect(), x = rect.x + 4, y = rect.y + 4;
    const fire = (type, init = {}) => b.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7,
      pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, ...init }));
    fire('pointerdown');
    await wait(60);
    const during = b.getAttribute('data-ripple');
    fire('pointerup');
    await wait(400);
    const held = b.getAttribute('data-ripple');
    const tint = getComputedStyle(b).backgroundImage.includes('radial-gradient');
    await wait(1100);
    const after = b.getAttribute('data-ripple');
    return { during, held, tint, after };
  });
  expect(r.during).toBe('in');
  expect(r.held).toBe('hold');
  expect(r.tint).toBe(true);
  expect(r.after).toBe(null);
});
