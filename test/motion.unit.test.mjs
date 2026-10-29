// @core/ui motion (ui/motion.js) in Node: the glide hands its spring to the elements' animations and stops where it
// is; the main-thread spring lands and can be stopped; the let-go speed; afterGesture waits for a glide to land.
// The finger itself is in e2e (tabs, swipe-feel and the jank gate).
// node --test test/motion.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { glide, spring, tracker, afterGesture, gesturing, springPath, PRESSABLE } from '../ui/motion.js';

/** an element whose animate() records its keyframes and finishes when told */
function fakeEl() {
  /** @type {{ frames: Keyframe[], timing: any, currentTime: number, cancelled: boolean, finished: Promise<void>, end: () => void, cancel: () => void }[]} */
  const runs = [];
  return {
    runs,
    animate(frames, timing) {
      let end = () => {}, fail = () => {};
      const finished = new Promise((r, j) => { end = r; fail = j; });
      finished.catch(() => {});
      const a = { frames, timing, currentTime: 0, cancelled: false, finished, end, cancel() { a.cancelled = true; fail(new Error('cancelled')); } };
      runs.push(a);
      return a;
    },
  };
}

test('glide: every part gets the spring path as linear keyframes, one a frame, transform or opacity as given', async () => {
  const a = fakeEl(), b = fakeEl();
  const g = glide([[a, x => ({ transform: `translateX(${x}px)` })], [b, x => ({ opacity: x / 100 })]], 0, 100, 0.5);
  const path = springPath(0, 100, 0.5);
  assert.deepEqual(g.path, path);
  assert.equal(a.runs[0].frames.length, path.length);
  assert.equal(a.runs[0].frames.at(-1).transform, 'translateX(100px)');
  assert.equal(b.runs[0].frames[0].opacity, 0);
  assert.equal(a.runs[0].timing.easing, 'linear');
  assert.equal(Math.round(a.runs[0].timing.duration), Math.round((path.length - 1) * 1000 / 60));
  assert.ok(g.running() && gesturing(), 'a glide counts as a gesture');
  a.runs[0].end(); b.runs[0].end();
  assert.equal(await g.done, true);
  assert.equal(g.running(), false);
  assert.equal(gesturing(), false);
});

test('glide: stop() gives where it is now (a finger caught it), cancels the animations, and done is false', async () => {
  const a = fakeEl();
  const g = glide([[a, x => ({ transform: `translateY(${x}px)` })]], 0, 300, 0);
  a.runs[0].currentTime = 100;   // ms in: six frames
  const at = g.at();
  assert.equal(at, g.path[6]);
  assert.equal(g.stop(), at);
  assert.equal(a.runs[0].cancelled, true);
  assert.equal(await g.done, false);
  assert.equal(g.at(), 300, 'stopped: at() is where it was going');
});

test('glide: no element that animates (Node) lands at once, at its end', async () => {
  const g = glide([[/** @type {any} */ ({}), x => ({ opacity: x })]], 0, 1);
  assert.equal(await g.done, true);
  assert.equal(g.at(), 1);
});

test('spring: applies the path once a frame and lands on the end; stopped, it stays where it was', async () => {
  const seen = [];
  const g = spring(x => seen.push(x), 0, 40, 0, { response: 0.1 });
  assert.equal(await g.done, true);
  assert.equal(seen.at(-1), 40);
  assert.ok(seen.every((x, i) => i === 0 || x >= seen[i - 1]), 'onward only, no overshoot');
  const s = spring(() => {}, 0, 400);
  const x = s.stop();
  assert.equal(await s.done, false);
  assert.equal(x, 0);
});

test('tracker: the let-go speed over the last 100 ms; a finger that stopped before lifting throws nothing', () => {
  const t = tracker();
  t.reset(0, 0);
  for (let i = 1; i <= 10; i++) t.add(i * 16, i * 8);   // 0.5 px/ms
  assert.equal(t.speed(160), 0.5);
  assert.equal(t.speed(400), 0);
});

test('afterGesture: waits for a glide to land, then runs each job once', async () => {
  const a = fakeEl();
  const g = glide([[a, x => ({ opacity: x })]], 0, 1);
  let runs = 0;
  const job = () => { runs++; };
  afterGesture(job); afterGesture(job);
  await new Promise(r => setTimeout(r, 60));
  assert.equal(runs, 0, 'held while the glide moves');
  a.runs[0].end();
  await g.done;
  await new Promise(r => setTimeout(r, 60));
  assert.equal(runs, 1, 'once, after it lands');
});

test('afterGesture: a job cancelled before it runs never runs', async () => {
  let ran = false, other = false;
  const cancel = afterGesture(() => { ran = true; });
  afterGesture(() => { other = true; });
  cancel();
  await new Promise(r => setTimeout(r, 60));
  assert.equal(ran, false);
  assert.equal(other, true);
});

test('pressed at once: buttons, tabs, menu items, rows that open something and data-press', () => {
  for (const s of ['button', '[role="button"]', '.ui-tab', '.ui-menu-item', '.ui-row[data-push]', '[data-press]']) assert.ok(PRESSABLE.includes(s), s);
});
