// The sign-in screen (/kit/sign-in/): covers the page and its tab bar, signs in, says why not, shows Forget only
// while this phone holds a copy, and the passcode variant. The list is docs/kit-tests.md.
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const PAGE = '/ui/0.0.0-dev/kit/sign-in/';

for (const width of [390, 1280]) {
  test.describe(`at ${width} px`, () => {
    test('covers the page: name, tagline, Google button; no Forget on a fresh phone; signs in', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(PAGE);
      await expect(page.locator('.ui-signin-name')).toHaveText('Garden');
      await expect(page.locator('#signed-out'), 'the section holding the screen counts as showing').toBeVisible();
      await expect(page.locator('.ui-signin-tagline')).toBeVisible();
      await expect(page.locator('#sign-in')).toHaveText('Continue with Google');
      await expect(page.locator('#forget')).toBeHidden();
      // the screen is on top: the tab bar under it can't be tapped
      const top = await page.evaluate(() => {
        const t = document.querySelector('#tabs button')?.getBoundingClientRect();
        return t ? document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2)?.closest('.ui-signin') !== null : true;
      });
      expect(top).toBe(true);
      expect(await AxeBuilder(page), 'axe on the sign-in screen').toEqual([]);
      await page.locator('#sign-in').click();
      await expect(page.locator('#signed-in')).toBeVisible();
      await expect(page.locator('.ui-signin')).toBeHidden();
      await expect(page.locator('#signed-out')).toBeHidden();
    });

    test('Forget shows while this phone holds a copy, and goes once forgotten', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(`${PAGE}?copy=1`);
      await expect(page.locator('#forget')).toBeVisible();
      await page.locator('#forget').click();
      await expect(page.locator('#forget-msg')).toHaveText(/Forgotten/);
      await expect(page.locator('#forget')).toBeHidden();
    });

    test('a failed or refused sign-in says why', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(`${PAGE}?fail=1`);
      await page.locator('#sign-in').click();
      await expect(page.locator('#sign-in-error')).toHaveText(/No signal/);
      await page.goto(`${PAGE}?refuse=unsent`);
      await page.locator('#sign-in').click();
      await expect(page.locator('#sign-in-error')).toHaveText(/someone@example\.com/);
    });

    test('passcode variant: the app\'s form instead of Google, no Forget', async ({ sized }) => {
      const page = await sized(width);
      await page.goto(`${PAGE}?variant=passcode`);
      await expect(page.locator('#sign-in')).toHaveCount(0);
      await expect(page.locator('#forget')).toBeHidden();
      expect(await AxeBuilder(page), 'axe on the passcode screen').toEqual([]);
      await page.locator('#passcode').fill('1234');
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.locator('#signed-in')).toBeVisible();
    });
  });
}
