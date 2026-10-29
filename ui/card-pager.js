// Card pager: one card at a time in a stage, a sideways swipe for the next or the previous (a flashcard deck, a
// review queue). The card beside comes in with the finger 1:1, and the let-go hands the finger's speed to a spring
// (motion.js glide, transform only, run by the compositor); a finger on the glide catches it. The cards beside are
// laid out before the finger moves (three slots: previous, this, next), and the app's own work on a new card
// (onShow: a save, a fetch) waits until the glide has landed (afterGesture). The stage is marked data-no-gesture, so
// a tab swipe never starts on it. Nothing runs on import.
import { drag, glide, afterGesture } from './motion.js';
import { pageStep } from './tab-pages.js';

/**
 * @typedef {{ index: () => number, go: (step: 1 | -1) => boolean, refresh: () => void, stop: () => void }} CardPager
 *   index: the card shown; go: animate one card on or back (false when there is none); refresh: render the three
 *   cards again (the queue changed); stop: remove the listeners
 */

/**
 * @param {HTMLElement} stage  the box the cards fill (`.ui-cards`)
 * @param {{ card: (i: number) => HTMLElement | null, start?: number, onShow?: (i: number) => void, mouse?: boolean }} o
 *   card(i): the card at i, or null when there is none (the deck's ends; i may go below 0 for a deck with history);
 *   onShow(i): a card is shown, once its glide has landed
 * @returns {CardPager}
 */
export function cardPager(stage, { card, start = 0, onShow, mouse = true }) {
  stage.classList.add('ui-cards');
  stage.setAttribute('data-no-gesture', '');
  if (!stage.hasAttribute('tabindex')) stage.tabIndex = 0;
  let i = start;
  /** previous, this, next @type {HTMLElement[]} */
  const slots = [-1, 0, 1].map(() => {
    const s = document.createElement('div');
    s.className = 'ui-card-slot';
    stage.append(s);
    return s;
  });
  /** @type {(HTMLElement | null)[]} */
  const shown = [null, null, null];
  let w = 1;
  /** @type {ReturnType<typeof glide> | null} */
  let moving = null;
  let aim = 0;   // the step the glide in flight lands on (-1, 0, 1)

  /** @param {number} k slot @param {number} at card index */
  const fill = (k, at) => {
    const c = card(at);
    shown[k] = c;
    slots[k].replaceChildren(...(c ? [c] : []));
  };
  const rest = () => {
    slots.forEach((s, k) => {
      s.style.transform = `translate3d(${(k - 1) * 100}%,0,0)`;
      const here = k === 1;
      s.toggleAttribute('inert', !here);
      if (here) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
    });
  };
  /** @param {number} x */
  const place = x => { slots.forEach((s, k) => { s.style.transform = `translate3d(${x + (k - 1) * w}px,0,0)`; }); };
  const has = (/** @type {number} */ k) => !!shown[k];

  // a step has landed (or a finger caught it on the way): the slots turn so the shown card is in the middle again
  /** @param {number} step */
  const turn = step => {
    if (!step) return;
    i += step;
    if (step > 0) { slots.push(/** @type {HTMLElement} */ (slots.shift())); shown.push(shown.shift() ?? null); fill(2, i + 1); }
    else { slots.unshift(/** @type {HTMLElement} */ (slots.pop())); shown.unshift(shown.pop() ?? null); fill(0, i - 1); }
    const at = i;
    afterGesture(() => { if (at === i) onShow?.(i); });
  };

  /** @param {number} from @param {number} step @param {number} v */
  const fly = (from, step, v) => {
    aim = step;
    const to = -step * w;
    const g = moving = glide(slots.map((s, k) => [s, (/** @type {number} */ x) => ({ transform: `translate3d(${x + (k - 1) * w}px,0,0)` })]), from, to, v);
    g.done.then(landed => {
      if (!landed || moving !== g) return;
      moving = null; aim = 0;
      turn(step);
      rest();
      g.stop();
    });
  };

  // a caught glide: finish its turn at once and drag on from where it was
  const catchIt = () => {
    if (!moving) return 0;
    const g = moving, step = aim;
    moving = null; aim = 0;
    const x = g.stop();
    turn(step);
    const from = x + step * w;
    place(from);
    return from;
  };

  const off = drag(stage, {
    axis: 'x', mouse,
    start() {
      w = stage.clientWidth || 1;   // measured at the touch, before any move
      const from = catchIt();
      place(from);
      return from;
    },
    move: place,
    bounds: () => [has(2) ? -w : 0, has(0) ? w : 0],
    end(x, v) {
      if (!x && !v) { rest(); return; }
      fly(x, pageStep(x, v, w, has(0), has(2)), v);
    },
  });

  /** @param {KeyboardEvent} e */
  const key = e => {
    if (e.target !== stage) return;
    if (e.key === 'ArrowRight' && api.go(1)) e.preventDefault();
    else if (e.key === 'ArrowLeft' && api.go(-1)) e.preventDefault();
  };
  stage.addEventListener('keydown', key);

  /** @type {CardPager} */
  const api = {
    index: () => i,
    go(step) {
      const from = catchIt();
      if (!has(step > 0 ? 2 : 0)) { rest(); return false; }
      w = stage.clientWidth || 1;
      place(from);
      fly(from, step, 0);
      return true;
    },
    refresh() { catchIt(); fill(0, i - 1); fill(1, i); fill(2, i + 1); rest(); },
    stop() { off(); stage.removeEventListener('keydown', key); moving?.stop(); },
  };
  api.refresh();
  return api;
}
