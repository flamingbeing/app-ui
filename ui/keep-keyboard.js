// Keep the phone keyboard for a field that isn't there yet: a tap that opens a screen whose field should take the
// focus (a search icon opening Search) loses the keyboard on iOS, which only shows it for a focus made during the tap
// itself, and the field draws after it. holdKeyboard(), called in the tap, focuses a hidden stand-in box at once;
// handTo(field) moves the focus (and so the keyboard) to the real field once it is drawn. A stand-in nobody takes is
// gone after `ms`. On a computer (fine pointer) there is no stand-in and handTo just focuses the field.
// Nothing runs on import.

/** How long a stand-in waits for its field. */
export const HOLD_MS = 3000;

/** @typedef {{ handTo: (field: HTMLElement | null | undefined) => void, release: () => void, held: () => boolean }} KeyboardHold */

/**
 * @param {{ ms?: number, coarse?: boolean }} [o]  ms: how long the stand-in waits (default HOLD_MS);
 *   coarse: whether this is a touch screen (default: `(pointer: coarse)`)
 * @returns {KeyboardHold}
 */
export function holdKeyboard({ ms = HOLD_MS, coarse } = {}) {
  const touch = coarse ?? (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  /** @type {HTMLInputElement | null} */
  let box = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  if (touch && typeof document !== 'undefined') {
    box = document.createElement('input');
    box.type = 'search';
    box.tabIndex = -1;
    box.setAttribute('aria-hidden', 'true');
    box.className = 'ui-keyboard-hold';
    // 16px so iOS doesn't zoom; inline sizes so it holds even before the kit's CSS loads
    Object.assign(box.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0',
      fontSize: '16px', border: '0', padding: '0' });
    document.body.append(box);
    box.focus();
    timer = setTimeout(() => release(), ms);
  }
  function release() {
    clearTimeout(timer);
    box?.remove();
    box = null;
  }
  return {
    handTo(field) {
      if (field?.isConnected) field.focus();
      release();
    },
    release,
    held: () => !!box,
  };
}
