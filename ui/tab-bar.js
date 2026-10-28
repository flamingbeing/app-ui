// Shrinking tab bar: nav.ui-tabbar[data-minimise] shrinks to the current tab while the page scrolls down and comes
// back on a scroll up, near the top, or a tap on the current tab. It never moves with a swipe (the edge swipe moves
// the screen's content only).
import { listeners } from './gesture.js';

/** -> the next accumulated scroll and whether the bar is small, from the last state and a scroll step (pure) */
export function tabBarStep(/** @type {{ acc: number, small: boolean }} */ s, /** @type {number} */ y, /** @type {number} */ d) {
  const acc = (d > 0) === (s.acc > 0) ? s.acc + d : d;
  if (y < 40 || acc < -24) return { acc, small: false };
  if (acc > 40) return { acc, small: true };
  return { acc, small: s.small };
}

/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ scroller?: HTMLElement | Window }} [opts]  what scrolls (default the page)
 * @returns {() => void} stop
 */
export function shrinkingTabBar(bar, { scroller = window } = {}) {
  const l = listeners();
  const y = () => scroller instanceof Window ? scroller.scrollY : scroller.scrollTop;
  let last = y(), s = { acc: 0, small: false };
  l.on(scroller, 'scroll', () => {
    const now = y();
    s = tabBarStep(s, now, now - last);
    last = now;
    bar.classList.toggle('is-minimised', s.small);
  }, { passive: true });
  l.on(bar, 'click', (/** @type {MouseEvent} */ e) => {
    const t = /** @type {Element} */ (e.target);
    if (bar.classList.contains('is-minimised') && t.closest('[aria-current="page"]')) {
      e.preventDefault();
      s = { acc: 0, small: false };
      bar.classList.remove('is-minimised');
    }
  });
  return () => { l.stop(); bar.classList.remove('is-minimised'); };
}

/**
 * The room the floating tab bar takes at the bottom of the screen, from its top to the bottom edge, as
 * --ui-tabbar-room on the page (0 while it is hidden): tabbar.css gives each screen that much room under its last row.
 * startGestures() starts it; an app that builds its own parts calls it once.
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @returns {() => void} stop
 */
export function tabBarRoom(bar) {
  const html = document.documentElement;
  const set = () => {
    // (a fixed element has no offsetParent, so its display says whether it shows)
    const r = !bar.hidden && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect() : null;
    html.style.setProperty('--ui-tabbar-room', r && r.height ? `${Math.max(0, Math.round(innerHeight - r.top))}px` : '0px');
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(set) : null;
  ro?.observe(bar);
  const mo = new MutationObserver(set);
  mo.observe(bar, { attributes: true, attributeFilter: ['hidden', 'class'] });
  addEventListener('resize', set);
  set();
  return () => { ro?.disconnect(); mo.disconnect(); removeEventListener('resize', set); html.style.removeProperty('--ui-tabbar-room'); };
}
