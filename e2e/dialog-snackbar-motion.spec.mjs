// Dialog / menu enter-exit and snackbar timing (rc.84 items 3-4). Runs on GitHub.
import { test, expect } from './fixtures.mjs';
import { BASE } from './fixtures.mjs';

test('a confirm dialog pops in over 120 ms and leaves over 80 ms', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    const { confirmModal } = await import(BASEJS + 'ui/index.js');
    const p = confirmModal('Sure?');
    const d = document.querySelector('dialog.modal');
    const enter = d.getAnimations().find(a => a.animationName === 'ui-pop');
    const out = { enter: enter && enter.effect.getTiming().duration };
    d.querySelector('button').click();
    await p;
    const leave = d.getAnimations().find(a => a.animationName === 'ui-shrink');
    out.leave = leave && leave.effect.getTiming().duration;
    await new Promise(r => setTimeout(r, 300));
    out.gone = !d.isConnected;
    return out;
  }, BASE);
  expect(r.enter).toBe(120);
  expect(r.leave).toBe(80);
  expect(r.gone).toBe(true);
});

test('a snackbar fades in over 150 ms and, with exit set, out over the exit time', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    document.documentElement.classList.remove('glass');   // the glass look springs its own toast in (theme/glass.css)
    const { toaster } = await import(BASEJS + 'ui/index.js');
    const t = toaster(document.body, { exit: 300 });
    const dismiss = t.show('Saved');
    const n = document.querySelector('.toast');
    const inn = n.getAnimations().find(a => a.animationName === 'ui-fade');
    const out = { enter: inn && inn.effect.getTiming().duration };
    dismiss();
    const leave = n.getAnimations().find(a => a.animationName === 'ui-fade-out');
    out.leave = leave && leave.effect.getTiming().duration;
    return out;
  }, BASE);
  expect(r.enter).toBe(150);
  expect(r.leave).toBe(300);
});

test('swap changes the showing snackbar in place with a short cross-fade', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    const { toaster } = await import(BASEJS + 'ui/index.js');
    const t = toaster(document.body);
    t.show('Order changed', { swap: true });
    t.show('Completed', { swap: true });
    await new Promise(r => setTimeout(r, 200));
    return { count: document.querySelectorAll('.toast').length, text: document.querySelector('.toast span').textContent };
  }, BASE);
  expect(r.count).toBe(1);
  expect(r.text).toBe('Completed');
});

test('Still: dialog and snackbar have no animation', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    document.documentElement.dataset.motion = 'still';
    const { toaster } = await import(BASEJS + 'ui/index.js');
    toaster(document.body).show('Saved');
    return getComputedStyle(document.querySelector('.toast')).animationName;
  }, BASE);
  expect(r).toBe('none');
});

test('a tap-menu bottom panel rises like a sheet (280 ms) and sinks over 200 ms; a popover shrinks over 80 ms; focus returns', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const r = await page.evaluate(async BASEJS => {
    const { openMenu } = await import(BASEJS + 'ui/tap-menu.js');
    const wait = ms => new Promise(res => setTimeout(res, ms));
    const out = {};
    const a = Object.assign(document.createElement('button'), { id: 'tm-a', textContent: 'menu' });
    a.style.cssText = 'position:fixed;top:100px;right:20px;z-index:1';
    document.body.append(a);
    // the bottom panel
    let close = openMenu(a, [{ label: 'One' }], { sheet: true });
    const panel = document.querySelector('.ui-menu-panel');
    const inA = panel.getAnimations().find(x => x.animationName === 'ui-sheet-in');
    out.panelIn = inA && inA.effect.getTiming().duration;
    out.veilIn = getComputedStyle(panel.parentElement.querySelector('.ui-menu-veil')).animationDuration;
    await wait(350);
    close();
    const layer = panel.closest('.ui-menu-layer');
    out.leaving = layer.classList.contains('is-leaving');
    const outA = panel.getAnimations().find(x => x.animationName === 'ui-sheet-out');
    out.panelOut = outA && outA.effect.getTiming().duration;
    out.focus = document.activeElement === a;
    await wait(500);
    out.panelGone = !layer.isConnected;
    // a popover
    close = openMenu(a, [{ label: 'One' }]);
    const pop = document.querySelector('.ui-menu');
    const popLayer = pop.closest('.ui-menu-layer');
    await wait(200);
    close();
    out.popLeaving = popLayer.classList.contains('is-leaving');
    const shrink = pop.getAnimations().find(x => x.animationName === 'ui-shrink');
    out.popOut = shrink && shrink.effect.getTiming().duration;
    await wait(400);
    out.popGone = !popLayer.isConnected;
    return out;
  }, BASE);
  expect(r.panelIn).toBe(280);
  expect(r.veilIn).toBe('0.28s');
  expect(r.leaving).toBe(true);
  expect(r.panelOut).toBe(200);
  expect(r.focus).toBe(true);
  expect(r.panelGone).toBe(true);
  expect(r.popLeaving).toBe(true);
  expect(r.popOut).toBe(80);
  expect(r.popGone).toBe(true);
});

test('Still closes a tap menu at once', async ({ phone }) => {
  const page = await phone();
  await page.goto(`${BASE}kit/`);
  const gone = await page.evaluate(async BASEJS => {
    document.documentElement.setAttribute('data-motion', 'still');
    const { openMenu } = await import(BASEJS + 'ui/tap-menu.js');
    const a = Object.assign(document.createElement('button'), { textContent: 'menu' });
    document.body.append(a);
    const close = openMenu(a, [{ label: 'One' }], { sheet: true });
    const layer = document.querySelector('.ui-menu-layer');
    close();
    return !layer.isConnected;
  }, BASE);
  expect(gone).toBe(true);
});
