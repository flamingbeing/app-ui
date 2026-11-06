// The orbit loader (from an app): five dots that speed up and slow down round a ring, as a desktop's start-up circle
// does. CSS only (ui/ui.css, "orbit loader"): each dot is a full-size box turned about its centre (transform) that fades
// in and out (opacity), so the compositor runs it. Less motion (Still or the device's Reduce Motion): a still ring of
// dots. Sized by --ui-orbit-size and --ui-orbit-dot; the colour is the text's (currentColor), the accent by default.
// Opt-in: loadState(host, { orbit: true }) for "Loading…", syncButton(host, { orbit: true }) while it sends, or
// orbit() anywhere. Nothing runs on import.

/** The dots in a ring. */
export const ORBIT_DOTS = 5;

/**
 * An orbit loader, hidden from screen readers (the words beside it say what is loading).
 * @param {{ size?: number, dot?: number, class?: string }} [o]  size, dot: the ring's and a dot's size in px
 *   (default 34 and 4.5; the sync button's is 22 and 3); class: added after ui-orbit
 * @returns {HTMLSpanElement}
 */
export function orbit({ size, dot, class: cls = '' } = {}) {
  const ring = document.createElement('span');
  ring.className = `ui-orbit${cls ? ` ${cls}` : ''}`;
  ring.setAttribute('aria-hidden', 'true');
  if (size) ring.style.setProperty('--ui-orbit-size', `${size}px`);
  if (dot) ring.style.setProperty('--ui-orbit-dot', `${dot}px`);
  for (let n = 0; n < ORBIT_DOTS; n++) ring.append(document.createElement('i'));
  return ring;
}
