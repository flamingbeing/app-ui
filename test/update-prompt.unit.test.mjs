// The update prompt tries the owed reload once when it mounts, not only after a later focusout or dialog close.
// node --test test/update-prompt.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { updatePrompt } from '../ui/update-prompt.js';

function fakeDocument() {
  const listeners = [];
  const node = () => ({
    hidden: false, textContent: '',
    setAttribute() {}, append() {}, remove() {}, addEventListener() {},
  });
  return { listeners, createElement: node, addEventListener: (t, f) => listeners.push(t), removeEventListener() {} };
}

test('mounting tries the owed reload once: a field left before the prompt existed does not strand it', async () => {
  const saved = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const calls = [];
    const update = { versionLabel: () => Promise.resolve('v'), checkNow: async () => false, retryUpdate: () => { calls.push('retry'); } };
    const stop = updatePrompt({ append() {} }, { update });
    assert.deepEqual(calls, []);   // (deferred, so the host can finish mounting)
    await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(calls, ['retry']);
    assert.deepEqual(globalThis.document.listeners, ['focusout', 'close']);
    stop();
  } finally { globalThis.document = saved; }
});
