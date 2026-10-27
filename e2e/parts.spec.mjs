// The reference parts on the /kit/parts/ gallery (undo toast, loading and error states, About sheet): behaviour,
// axe in each state, at phone and laptop widths. The list is docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const PARTS = '/ui/0.0.0-dev/kit/parts/';

for (const width of [390, 1280]) {
  test.describe(`at ${width} px`, () => {
    test('undo toast: Undo puts the row back where it was; one toast at a time', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      const names = () => page.locator('#fruit li').evaluateAll(rows => rows.map(r => r.dataset.name));
      await page.locator('#fruit li[data-name="Pear"] button').click();
      expect(await names()).toEqual(['Apple', 'Plum', 'Fig']);
      await expect(page.locator('.toast')).toHaveText(/Deleted Pear/);
      expect(await AxeBuilder(page), 'axe with a toast').toEqual([]);
      await page.locator('#fruit li[data-name="Fig"] button').click();
      await expect(page.locator('.toast')).toHaveCount(1);
      await expect(page.locator('.toast')).toHaveText(/Deleted Fig/);
      await page.getByRole('button', { name: 'Undo' }).click();
      expect(await names()).toEqual(['Apple', 'Plum', 'Fig']);
      await expect(page.locator('.toast')).toHaveCount(0);
    });

    test('loading: skeleton rows, then the list; a failure shows the error and Try again recovers', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#load-fail').click();
      await expect(page.locator('.load-row')).toHaveCount(3);
      await expect(page.locator('#load-host')).toHaveAttribute('aria-busy', 'true');
      expect(await AxeBuilder(page), 'axe while loading').toEqual([]);
      await expect(page.locator('.load-error')).toHaveText('Could not load the list.');
      await expect(page.locator('#load-host')).not.toHaveAttribute('aria-busy', 'true');
      expect(await AxeBuilder(page), 'axe with the error').toEqual([]);
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.locator('#loaded li')).toHaveText(['Rose', 'Tulip']);
      await expect(page.locator('.load-state')).toBeHidden();
    });

    test('About: version, the newest-version check and the outside code from the import map; Esc closes', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PARTS);
      await page.locator('#about-open').click();
      const sheet = page.locator('dialog.about-sheet');
      await expect(sheet).toContainText('Version 1.2.3');
      await expect(sheet.locator('li')).toHaveText(['demo-markdown · 4.2.1 · MIT', 'demo-zip · 1.0.0 · MIT']);
      expect(await AxeBuilder(page), 'axe with the sheet').toEqual([]);
      await sheet.getByRole('button', { name: 'Get the newest version' }).click();
      await expect(sheet.locator('[role=status]')).toContainText('This is the newest version');
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(page.locator('#about-open')).toBeFocused();
    });
  });
}
