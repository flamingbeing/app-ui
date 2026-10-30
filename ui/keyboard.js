// The on-screen keyboard: while it is up (a field has focus and the visible part of the page is more than
// KEYBOARD_MIN px shorter than the tallest it has been at this width), html gets .ui-keyboard-open and
// --ui-keyboard-h is how far the keyboard covers the layout's bottom edge. The tab bar hides, a sheet and the action
// bar sit above the keyboard (ui/gestures/*.css).
// Apps put interactive-widget=resizes-content in their viewport meta: the page then shrinks to the space above the
// keyboard (Chrome on Android otherwise only shrinks the visible part, Chrome 108+), so fixed bars and 100dvh sheets
// fit without --ui-keyboard-h (it stays 0). Without it, or in a browser that ignores it, --ui-keyboard-h lifts them.
// A bar that stays above the keyboard (the action bar, or an app's own fixed bar marked [data-over-keyboard], such as
// a Save bar) would cover the field being typed in: while the keyboard is up, --ui-keyboard-bar-h is the tallest shown
// one's height, and fields scroll into view that far above it (scroll-margin-bottom, ui/gestures/action-bar.css).
// Nothing runs on import: startGestures starts it ({ keyboard: false } leaves it out).

export const KEYBOARD_MIN = 150;

/**
 * Whether the keyboard is up and how far it covers the layout (pure).
 * @param {{ base: number, inner: number, height: number, top: number, editing: boolean }} s
 *   base: the tallest innerHeight seen at this width; inner: innerHeight now; height, top: the visual viewport's
 * @returns {{ open: boolean, lift: number }}
 */
export function keyboardState({ base, inner, height, top, editing }) {
  const open = editing && base - height > KEYBOARD_MIN;
  return { open, lift: open ? Math.max(0, Math.round(inner - height - top)) : 0 };
}

/** The fixed bars that sit above the keyboard. */
export const OVER_KEYBOARD = '.ui-action-bar, [data-over-keyboard]';

/**
 * How far the bars over the keyboard reach up (pure): the tallest shown one.
 * @param {{ height: number, shown: boolean }[]} bars
 */
export function barCover(bars) {
  return Math.round(Math.max(0, ...bars.filter(b => b.shown).map(b => b.height)));
}

const TYPED = /^(text|search|email|url|tel|password|number|date|datetime-local|month|time|week)$/;
/** @param {Element | null} el */
const typing = el => !!el && ((el instanceof HTMLInputElement && TYPED.test(el.type)) || el instanceof HTMLTextAreaElement
  || (el instanceof HTMLElement && el.isContentEditable));

/** Watches the keyboard; gives back the function that stops it. @returns {() => void} */
export function watchKeyboard() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return () => {};
  const html = document.documentElement;
  let width = innerWidth, base = innerHeight, was = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let later;
  function update() {
    const view = /** @type {VisualViewport} */ (window.visualViewport);
    if (innerWidth !== width) { width = innerWidth; base = innerHeight; }   // turned: a new tallest
    const editing = typing(document.activeElement);
    if (!editing) base = Math.max(base, innerHeight);
    const { open, lift } = keyboardState({ base, inner: innerHeight, height: view.height, top: view.offsetTop, editing });
    html.style.setProperty('--ui-keyboard-h', `${lift}px`);
    // (a fixed bar has no offsetParent, so "shown" is: it has a box)
    const bars = open ? [...document.querySelectorAll(OVER_KEYBOARD)].map(el => {
      const bar = /** @type {HTMLElement} */ (el);
      return { height: bar.offsetHeight, shown: !bar.hidden && bar.getClientRects().length > 0 };
    }) : [];
    html.style.setProperty('--ui-keyboard-bar-h', `${barCover(bars)}px`);
    if (open !== was) {
      was = open;
      html.classList.toggle('ui-keyboard-open', open);
      html.dispatchEvent(new CustomEvent('ui-keyboard', { detail: { open } }));
    }
  }
  // focus moving from one field to the next is not a close: look once it has landed
  const soon = () => { clearTimeout(later); later = setTimeout(update, 50); };
  const on = /** @type {[EventTarget, string, () => void][]} */ ([[vv, 'resize', update], [vv, 'scroll', update],
    [window, 'resize', update], [document, 'focusin', soon], [document, 'focusout', soon]]);
  for (const [t, type, f] of on) t.addEventListener(type, f);
  update();
  return () => {
    clearTimeout(later);
    for (const [t, type, f] of on) t.removeEventListener(type, f);
    html.classList.remove('ui-keyboard-open');
    html.style.removeProperty('--ui-keyboard-h');
    html.style.removeProperty('--ui-keyboard-bar-h');
  };
}
