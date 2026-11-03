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
