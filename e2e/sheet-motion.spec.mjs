// Sheet open (280 ms, 40px rise + fade, backdrop fade) and the opt-in drop close (rc.84). Runs on GitHub.
import { test, expect } from './fixtures.mjs';
import { BASE } from './fixtures.mjs';

test('a sheet opens with the short rise and a backdrop fade, no spring', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const info = await page.evaluate(() => {
    const s = document.querySelector('dialog.ui-sheet');
    s.showModal();
    const a = s.getAnimations().find(x => x.animationName === 'ui-sheet-in');
    const out = { rise: a && a.effect.getTiming().duration, fade: getComputedStyle(s, '::backdrop').animationDuration };
    s.close();
    return out;
  });
  expect(info.rise).toBe(280);
  expect(info.fade).toBe('0.28s');   // the backdrop's animation is not in getAnimations(); read its style
});

test('data-close-motion="drop": a button close holds, then drops and fades, then closes', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async () => {
    const s = document.querySelector('dialog.ui-sheet[data-detents]');
    s.setAttribute('data-close-motion', 'drop');
    const btn = s.querySelector('[data-close]');
    s.showModal();
    await new Promise(r => setTimeout(r, 400));
    btn.click();
    await new Promise(r => requestAnimationFrame(r));
    const open1 = s.open;
    const run = s.getAnimations().find(a => a.effect.getTiming().duration === 370);
    await new Promise(r => setTimeout(r, 600));
    return { open1, ran: !!run, open2: s.open };
  });
  expect(r.open1).toBe(true);
  expect(r.ran).toBe(true);
  expect(r.open2).toBe(false);
});

test('data-release-motion="settle": a finger let-go past the close line jumps, holds, eases off in 650 ms and pops history once', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/ui/0.0.0-dev/kit/shell/');
  await page.evaluate(() => document.querySelector('#sheet').setAttribute('data-release-motion', 'settle'));
  await page.locator('nav.ui-tabbar [data-open-sheet="#sheet"]').tap();
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  const before = await page.evaluate(() => history.length);
  const r = await page.evaluate(async () => {
    const frame = () => new Promise(res => requestAnimationFrame(() => res(undefined)));
    const s = document.querySelector('#sheet'), grab = s.querySelector('.ui-sheet-grabber');
    const b = grab.getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    const fire = (type, dy) => grab.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true,
      pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y + dy, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    fire('pointerdown', 0);
    for (let i = 1; i <= 8; i++) { await frame(); fire('pointermove', i * 32); }
    for (let i = 0; i < 8; i++) { await frame(); fire('pointermove', 256); }
    window.__pops = 0;
    addEventListener('popstate', () => window.__pops++);
    fire('pointerup', 256);
    await frame();
    const run = s.getAnimations().find(a => a.effect.getTiming().duration === 650 && !a.effect.pseudoElement);
    const out = { ran: !!run, frames: run?.effect.getKeyframes().length, open: s.open };
    await new Promise(res => setTimeout(res, 1000));
    return { ...out, closed: !s.open, pops: window.__pops };
  });
  expect(r.ran).toBe(true);
  expect(r.frames).toBe(4);
  expect(r.open).toBe(true);
  expect(r.closed).toBe(true);
  expect(r.pops).toBe(1);
  expect(await page.evaluate(() => history.length)).toBe(before);
});

test('--ui-sheet-rise sets the rise; data-sheet-bar="fade" fades the tab bar under an open sheet and back', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/ui/0.0.0-dev/kit/shell/');
  const bar = page.locator('nav.ui-tabbar');
  await page.evaluate(() => document.documentElement.setAttribute('data-sheet-bar', 'fade'));
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('nav.ui-tabbar')).opacity)).toBe('1');
  await bar.locator('[data-open-sheet="#sheet"]').tap();
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('nav.ui-tabbar')).opacity)).toBe('0');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('nav.ui-tabbar')).pointerEvents)).toBe('none');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('nav.ui-tabbar')).transitionProperty)).toBe('opacity');
  // the rise reads --ui-sheet-rise (16px here); the default is 40px
  const rise = await page.evaluate(() => {
    const s = document.querySelector('#sheet');
    s.close(); s.style.setProperty('--ui-sheet-rise', '16px'); s.showModal();
    const a = s.getAnimations().find(x => x.animationName === 'ui-sheet-in');
    const f = a.effect.getKeyframes()[0];
    return f.transform;
  });
  expect(rise).toContain('16');
  await page.evaluate(() => document.querySelector('#sheet').close());
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('nav.ui-tabbar')).opacity)).toBe('1');
});

test('gallery demos for the rc.85 opt-ins: ?slide=rise&sheet-bar=fade&ripple=hold&release=settle&sheet-rise=16px', async ({ sized }) => {
  const page = await sized(390);
  await page.goto('/ui/0.0.0-dev/kit/shell/?slide=rise&sheet-bar=fade&ripple=hold&release=settle&sheet-rise=16px');
  const r = await page.evaluate(() => ({ d: { ...document.documentElement.dataset }, rise: document.documentElement.style.getPropertyValue('--ui-sheet-rise'),
    rel: document.querySelector('#sheet').getAttribute('data-release-motion') }));
  expect(r.d).toMatchObject({ slide: 'rise', sheetBar: 'fade', ripple: 'hold' });
  expect(r.rise).toBe('16px');
  expect(r.rel).toBe('settle');
});
