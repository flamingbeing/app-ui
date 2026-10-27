// The gallery smoke test, in every browser (Chromium, Firefox, WebKit: playwright.config.mjs): each /kit/ page starts
// without a page error, has no serious or critical axe problem and keeps to the Worker's page policy (no CSP report).
import AxeBuilder from './axe.mjs';
import { test, expect } from '@playwright/test';
import { BASE } from './fixtures.mjs';

const PAGES = ['kit/', 'kit/shell/', 'kit/dense/', 'kit/parts/'];

for (const path of PAGES) {
  test(`${path} starts clean`, async ({ browser, browserName }) => {
    // a touch phone; Firefox has no isMobile
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
    await context.addInitScript(() => {
      window.__csp = [];
      addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto(BASE + path);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('load');
    await expect(page.locator('body')).not.toBeEmpty();
    expect(await AxeBuilder(page), 'axe').toEqual([]);
    expect(errors, 'page errors').toEqual([]);
    expect(await page.evaluate(() => window.__csp), 'CSP violations').toEqual([]);
    await context.close();
  });
}
