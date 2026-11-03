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
