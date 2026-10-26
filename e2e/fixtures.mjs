// Shared steps for the specs. A page that reports a Content-Security-Policy violation fails its test (the gallery
// pages get the Worker's page policy on the e2e server, as they do live).
import { test as base, expect } from '@playwright/test';

// the address the e2e server serves the working tree at (e2e/serve.mjs), as a released version would be
export const BASE = '/ui/0.0.0-dev/';

// every new context: collect CSP reports; and the glass guard has already found this device fast (theme/guard.js),
// so a slow CI runner's frames can't turn glass down mid-test (looks.spec runs the guard itself, on its own context)
const seed = () => {
  window.__csp = [];
  addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  try {
    if (!localStorage.getItem('core-glass-guard')) localStorage.setItem('core-glass-guard', JSON.stringify({ solid: false, why: '' }));
  } catch { /* an opaque origin: nothing to keep */ }
};

export const test = base.extend({
  // a new phone: its own browser context; CSP reports collected for the check after the test
  phone: async ({ browser }, use) => {
    const made = [];
    await use(async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await context.addInitScript(seed);
      const page = await context.newPage();
      made.push({ context, page });
      return page;
    });
    await check(made);
  },
  // a touch screen of this width (390 phone, 820 tablet, 1280 laptop with touch): the same CSP check after the test
  sized: async ({ browser }, use) => {
    const made = [];
    await use(async (/** @type {number} */ width) => {
      const height = width < 600 ? 844 : width < 1000 ? 1180 : 800;
      const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 1000, hasTouch: true });
      await context.addInitScript(seed);
      const page = await context.newPage();
      made.push({ context, page });
      return page;
    });
    await check(made);
  },
});
export { expect };

// close each context and fail the test on any CSP report
async function check(made) {
  for (const { context, page } of made) {
    const v = await page.evaluate(() => window.__csp || []).catch(() => []);
    await context.close();
    expect(v, 'CSP violations').toEqual([]);
  }
}
