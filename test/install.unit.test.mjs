// Install this app: which way this page installs, and a tap shows the kept prompt once or else says how.
// node --test test/install.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { installApp, installMode, INSTALL_WORDS } from '../ui/install.js';

const android = /** @type {any} */ ({ userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/140 Mobile', platform: 'Linux armv8l', maxTouchPoints: 5 });
const iphone = /** @type {any} */ ({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
const ipad = /** @type {any} */ ({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 });
const none = () => false;

test('installMode: installed when opened from the home screen, ios on iPhone and iPad, other elsewhere', () => {
  assert.equal(installMode(android, none), 'other');
  assert.equal(installMode(iphone, none), 'ios');
  assert.equal(installMode(ipad, none), 'ios');
  assert.equal(installMode(android, q => q === '(display-mode: standalone)'), 'installed');
  assert.equal(installMode(android, q => q === '(display-mode: minimal-ui)'), 'installed');
  assert.equal(installMode({ ...iphone, standalone: true }, none), 'installed');
});

test('installApp shows the kept prompt once and says what was chosen', async () => {
  const g = /** @type {any} */ (globalThis);
  const calls = [];
  g.matchMedia = () => ({ matches: false });
  g.coreInstallPrompt = { prompt: async () => { calls.push('prompt'); }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
  try {
    assert.equal(await installApp({ nav: android, ask: async () => { calls.push('ask'); } }), 'accepted');
    assert.deepEqual(calls, ['prompt']);
    assert.equal(g.coreInstallPrompt, null);
    // no prompt left: the how-to instead
    assert.equal(await installApp({ nav: android, ask: async (m) => { calls.push(m); } }), 'help');
    assert.deepEqual(calls, ['prompt', INSTALL_WORDS.installOther]);
  } finally { delete g.coreInstallPrompt; delete g.matchMedia; }
});

test('installApp on an iPhone says Share, then Add to Home Screen, in the app\'s own words if given', async () => {
  const g = /** @type {any} */ (globalThis);
  g.matchMedia = () => ({ matches: false });
  try {
    /** @type {string[]} */
    const said = [];
    assert.equal(await installApp({ nav: iphone, ask: async (m, o) => { said.push(m, o.title); } }), 'help');
    assert.deepEqual(said, [INSTALL_WORDS.installIos, INSTALL_WORDS.installTitle]);
    said.length = 0;
    await installApp({ nav: iphone, words: { installIos: 'Share, then Home Screen' }, ask: async (m) => { said.push(m); } });
    assert.deepEqual(said, ['Share, then Home Screen']);
  } finally { delete g.matchMedia; }
});
