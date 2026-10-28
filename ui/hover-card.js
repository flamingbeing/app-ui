// Hover cards: rest the mouse on a link and, after a moment, a small card shows what it points to (a note's preview,
// a person's details). Mouse and trackpad only (the pointer's type): a touch has no hover, so taps keep doing what they did.
// The card sits in the top layer (popover), so it shows over a modal sheet too. Styles: ui/ui.css (.ui-hover-card).
import { el } from './dom.js';

const GAP = 6;

/**
 * Where the card goes: below the link, or above it when there is no room below; kept inside the window.
 * @param {{ left: number, top: number, bottom: number }} at  the link's box (viewport px)
 * @param {{ width: number, height: number }} card
 * @param {{ width: number, height: number }} view
 * @returns {{ left: number, top: number }}
 */
export function placeCard(at, card, view) {
  const left = Math.max(GAP, Math.min(at.left, view.width - card.width - GAP));
  const below = at.bottom + GAP;
  const top = below + card.height <= view.height - GAP || at.top - GAP - card.height < GAP ? below : at.top - GAP - card.height;
  return { left, top };
}

/**
 * @param {HTMLElement} root  links inside it get cards
 * @param {string} selector  which elements are links, e.g. 'a.wikilink[data-note]'
 * @param {(link: HTMLElement) => Node | null} fill  the card's content for that link (null: no card)
 * @param {{ wait?: number }} [o]  wait: ms the mouse rests before the card shows (default 400)
 * @returns {{ hide: () => void, stop: () => void }}
 */
export function hoverCard(root, selector, fill, { wait = 400 } = {}) {
  const card = el('div', { class: 'ui-hover-card', popover: 'manual', role: 'tooltip' });
  /** @type {HTMLElement | null} */ let link = null;
  let timer = 0, leaving = 0;
  const hide = () => {
    clearTimeout(timer); clearTimeout(leaving);
    link?.removeAttribute('aria-describedby'); link = null;
    if (card.isConnected) { try { card.hidePopover?.(); } catch { /* already hidden */ } card.remove(); }
  };
  const show = (/** @type {HTMLElement} */ a) => {
    const body = fill(a);
    if (!body || !a.isConnected) return;
    card.replaceChildren(body);
    card.id ||= `ui-hover-card-${Math.random().toString(36).slice(2, 8)}`;
    document.body.append(card);
    try { card.showPopover?.(); } catch { /* no popover support: it is position: fixed anyway */ }
    const r = a.getBoundingClientRect();
    const { left, top } = placeCard(r, { width: card.offsetWidth, height: card.offsetHeight }, { width: innerWidth, height: innerHeight });
    card.style.left = `${left}px`; card.style.top = `${top}px`;
    a.setAttribute('aria-describedby', card.id);
    link = a;
  };
  const over = (/** @type {PointerEvent} */ e) => {
    if (e.pointerType !== 'mouse') return;   // a finger or a pen: no hover
    const a = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest?.(selector));
    if (!a || !root.contains(a)) return;
    clearTimeout(leaving);
    if (a === link) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => { hide(); show(a); }, wait);
  };
  const out = (/** @type {PointerEvent} */ e) => {
    const to = /** @type {Node | null} */ (e.relatedTarget);
    if (to && (card.contains(to) || (link && link.contains(to)))) return;
    clearTimeout(timer);
    if (link) leaving = window.setTimeout(hide, 150);   // a moment to move onto the card
  };
  const key = (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Escape' && link) hide(); };
  root.addEventListener('pointerover', over);
  root.addEventListener('pointerout', out);
  card.addEventListener('pointerover', () => clearTimeout(leaving));
  card.addEventListener('pointerout', out);
  card.addEventListener('click', hide);
  document.addEventListener('keydown', key);
  addEventListener('scroll', hide, { capture: true, passive: true });
  return {
    hide,
    stop() {
      hide();
      root.removeEventListener('pointerover', over); root.removeEventListener('pointerout', out);
      document.removeEventListener('keydown', key); removeEventListener('scroll', hide, { capture: true });
    },
  };
}
