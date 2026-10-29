// Browser tests: npx playwright test (README, "Tests"). The e2e server (the real Worker in Node, e2e/serve.mjs) starts
// here unless already running. The base config comes from app-devkit (.devkit/, put there by setup-browser in CI; copy
// it once locally).
// Chromium runs every spec (the finger tests drive touch through the DevTools protocol, which only Chromium has);
// Firefox and WebKit run the gallery smoke spec (each gallery page starts, is clean and keeps to the page policy);
// WebKit, the iPhone's engine, also runs the swipe-feel spec (a finger from page-sent touch events).
// The jank gate (jank.spec.mjs) times frames, so it runs alone, after the rest: its tests one at a time, Chromium then
// WebKit, with no other browser busy beside it.
import { baseConfig, phone } from './.devkit/playwright/base.mjs';

export const PORT = 4174;
const config = baseConfig({
  testDir: 'e2e',
  testMatch: '*.spec.mjs',
  projects: ['phone'],
  retries: 0,   // a flake is a bug to fix, not a retry
  // PW_CHROMIUM: a Chromium already on the machine (when the pinned Playwright's own download isn't there)
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: [
    { command: `node e2e/serve.mjs ${PORT}`, url: `http://localhost:${PORT}/ui/versions.json`, reuseExistingServer: !process.env.CI, timeout: 30_000 },
  ],
});
const { isMobile, ...touch } = phone.use;   // (Firefox has no isMobile)
const chromium = { ...phone.use, browserName: 'chromium', launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {} };
const JANK = 'jank.spec.mjs';
config.projects = [
  { ...phone, testIgnore: JANK, use: chromium },
  { name: 'firefox', testMatch: 'gallery.spec.mjs', use: { ...touch, browserName: 'firefox' } },
  { name: 'webkit', testMatch: /(gallery|swipe-feel|bounce|ios)\.spec\.mjs/, use: { ...phone.use, browserName: 'webkit' } },
  { name: 'jank', testMatch: JANK, fullyParallel: false, dependencies: ['phone', 'firefox', 'webkit'], use: chromium },
  { name: 'jank-webkit', testMatch: JANK, fullyParallel: false, dependencies: ['jank'], use: { ...phone.use, browserName: 'webkit' } },
];
export default config;
