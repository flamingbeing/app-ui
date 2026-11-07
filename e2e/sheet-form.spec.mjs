// A sheet whose head and body sit in a <form method="dialog"> (the usual edit sheet): the body scrolls when its rows
// run past the screen, on a phone (bottom sheet) and on a laptop (the data-wide="panel" side panel).
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/';

for (const width of [390, 1280]) {
  test(`a sheet with a form scrolls its body to the last row at ${width} px`, async ({ sized }) => {
    const page = await sized(width);
    await page.goto(SHELL);
    await page.evaluate(() => {
      const d = document.createElement('dialog');
      d.className = 'ui-sheet'; d.id = 'form-sheet'; d.dataset.wide = 'panel'; d.dataset.detent = 'large';
      const rows = Array.from({ length: 60 }, (_, i) => `<p>Row ${i + 1}</p>`).join('');
      d.innerHTML = `<form method="dialog"><div class="ui-sheet-head"><h2>Edit</h2></div><div class="ui-sheet-body">${rows}<button id="last">Save</button></div></form>`;
      document.body.append(d);
      d.showModal();
    });
    const body = page.locator('#form-sheet .ui-sheet-body');
    const box = await page.locator('#form-sheet').boundingBox();
    const b = await body.boundingBox();
    expect(b && box && b.y + b.height).toBeLessThanOrEqual((box?.y ?? 0) + (box?.height ?? 0) + 1);
    expect(await body.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(page.locator('#last')).toBeInViewport();
  });
}
