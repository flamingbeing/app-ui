// Adaptive shell: one page that is a phone, a tablet or a laptop layout by its width (Material 3 window size classes).
//   < 600 px   phone    tab bar + one pane; opening a row pushes the detail as a screen (Back pops it)
//   600-839    tablet   side bar + list and detail side by side
//   >= 840     laptop   side bar + list + detail; sheets become centred dialogs, or a side panel (data-wide="panel")
// Markup (ui/shell/shell.css): .ui-shell > nav.ui-sidebar, main.ui-screens.ui-panes > section.ui-pane-list (with a
// .ui-list[data-select]) + section.ui-pane-detail.ui-screen, and nav.ui-tabbar. The root and <html> carry
// data-size="phone|tablet|laptop" and the root sends "ui-size" (detail.size) when it changes.
//   open a row   click, Enter, or the hold menu's "open" (a "ui-menu" event with detail.action "open"); the row gets
//                aria-current and sends "ui-open" (detail.row, detail.size); wide: the detail pane shows it; phone: the
//                detail screen is pushed. The detail pane is optional: without one, "ui-open" is all that happens
//   no row open  the detail pane carries data-empty (its .ui-detail-actions hide) and shows its first words; a deleted
//                open row empties it again
//   many ticked  "ui-select" with 2+ rows swaps .ui-detail-one for .ui-detail-multi ([data-multi-count], [data-multi-names])
//   search       [data-shell-search] fields (the side bar's and the phone's) filter the rows and mirror each other;
//                Ctrl/Cmd+K focuses the visible one; Esc clears it, then leaves it
//   Esc          on a phone's pushed detail, goes back (select mode, menus and dialogs keep their own Esc)
//   side bar     a .ui-bar-menu button (in the bar's [data-bar-lead]) opens the side bar as a drawer on a phone
//                (.ui-shell.is-drawer-open, over a .ui-drawer-shade); a side link, a tap on the shade, Esc or growing
//                past phone width closes it. Open, it is a history entry (Back closes it) and the page behind is inert. It follows the finger: .drawer (returned) is what tab-pages.js pulls out
//                on a right swipe from the first tab page; a left swipe on the drawer or the shade pushes it back
// Pointer: right-click is the hold menu; Shift-click takes a range and Ctrl/Cmd-click adds a row (select-mode.js).
import { claim, haptic, listeners, still, swipeIntent, THROW_MS } from '../gesture.js';
import { glide as springGlide, tracker } from '../motion.js';
import { ourStep, stepBack, stepping, stepsSettled } from '../steps.js';

export const TABLET_MIN = 600;
export const LAPTOP_MIN = 840;

/** The window size class for a width in px (pure). @param {number} w */
export const sizeClass = w => w < TABLET_MIN ? 'phone' : w < LAPTOP_MIN ? 'tablet' : 'laptop';

/** Whether a row's text matches a search: every word, any case (pure). @param {string} text @param {string} query */
export function matchesSearch(text, query) {
  const t = text.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w));
}

/** @param {HTMLElement} row @param {HTMLElement} detail */
function defaultRender(row, detail) {
  detail.querySelectorAll('[data-detail-title]').forEach(el => { el.textContent = row.dataset.name ?? ''; });
  detail.querySelectorAll('[data-detail-sub]').forEach(el => { el.textContent = row.querySelector('.ui-row-sub')?.textContent ?? ''; });
}

/**
 * @param {HTMLElement} shell  .ui-shell
 * @param {{ screens?: { push: (t: string | HTMLElement, from?: HTMLElement | null) => void, pop: (a?: boolean) => void, depth: () => number } | null,
 *   render?: (row: HTMLElement, detail: HTMLElement) => void }} [opts]  screens: the page's screen stack (startGestures().screens)
 * @returns {{ open: (row: HTMLElement) => void, current: () => HTMLElement | null, size: () => string,
 *   drawer: { pull: (x: number) => void, release: (x: number, v: number) => void } | null, stop: () => void }}
 *   drawer: the side bar's drawer for tab-pages.js to pull out (null without a side bar)
 */
export function adaptiveShell(shell, { screens = null, render = defaultRender } = {}) {
  const l = listeners();
  const html = document.documentElement;
  const list = /** @type {HTMLElement} */ (shell.querySelector('.ui-list'));
  // (no .ui-pane-detail: a list-only shell; opening a row marks it and sends "ui-open", the app shows it its own way)
  const detail = /** @type {HTMLElement | null} */ (shell.querySelector('.ui-pane-detail'));
  const one = /** @type {HTMLElement | null} */ (detail?.querySelector('.ui-detail-one') ?? null);
  const multi = /** @type {HTMLElement | null} */ (detail?.querySelector('.ui-detail-multi') ?? null);
  const searches = /** @type {HTMLInputElement[]} */ ([...shell.querySelectorAll('[data-shell-search]')]);
  const empty = /** @type {HTMLElement | null} */ (shell.querySelector('[data-shell-empty]'));
  const rows = () => /** @type {HTMLElement[]} */ ([...list.querySelectorAll('.ui-row')]);
  const editing = () => list.classList.contains('is-editing');
  let size = sizeClass(innerWidth);

  // size class: from the media queries, so a rotated or resized window follows
  const queries = [matchMedia(`(min-width: ${TABLET_MIN}px)`), matchMedia(`(min-width: ${LAPTOP_MIN}px)`)];
  function applySize() {
    size = sizeClass(innerWidth);
    shell.dataset.size = size;
    html.dataset.size = size;
    shell.dispatchEvent(new CustomEvent('ui-size', { bubbles: true, detail: { size } }));
  }
  for (const q of queries) l.on(q, 'change', applySize);
  applySize();

  /** @type {HTMLElement | null} */
  let current = null;
  // the detail's words before any row opens ("Pick a plant"), put back when it empties
  const blank = [...(detail?.querySelectorAll('[data-detail-title], [data-detail-sub]') ?? [])].map(el => /** @type {[Element, string]} */ ([el, el.textContent ?? '']));
  detail?.toggleAttribute('data-empty', true);
  /** @param {HTMLElement} row */
  function open(row) {
    for (const r of rows()) r.removeAttribute('aria-current');
    row.setAttribute('aria-current', 'true');
    current = row;
    row.dispatchEvent(new CustomEvent('ui-open', { bubbles: true, detail: { row, size } }));
    if (!detail) return;
    detail.toggleAttribute('data-empty', false);
    render(row, detail);
    if (size === 'phone') screens?.push(detail, row);
  }
  const gone = new MutationObserver(() => {
    if (!current || list.contains(current)) return;
    current = null;
    for (const [el, text] of blank) el.textContent = text;
    detail?.toggleAttribute('data-empty', true);
  });
  gone.observe(list, { childList: true });

  l.on(list, 'click', (/** @type {MouseEvent} */ e) => {
    if (e.defaultPrevented || editing()) return;
    const row = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.ui-row'));
    if (row) open(row);
  });
  l.on(list, 'keydown', (/** @type {KeyboardEvent} */ e) => {
    if (editing()) return;
    const row = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.ui-row'));
    if (!row) return;
    if (e.key === 'Enter') { e.preventDefault(); open(row); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const shown = rows().filter(r => !r.hidden), next = shown[shown.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); }
    }
  });
  l.on(list, 'ui-menu', (/** @type {CustomEvent} */ e) => { if (e.detail?.action === 'open') open(/** @type {HTMLElement} */ (e.target)); });

  // several ticked: the detail pane says what they share instead of showing one
  l.on(list, 'ui-select', (/** @type {CustomEvent} */ e) => {
    const { count, rows: ticked } = e.detail, many = count > 1;
    if (one) one.hidden = many;
    if (multi) {
      multi.hidden = !many;
      multi.querySelectorAll('[data-multi-count]').forEach(el => { el.textContent = `${count} selected`; });
      multi.querySelectorAll('[data-multi-names]').forEach(el => { el.textContent = ticked.map((/** @type {HTMLElement} */ r) => r.dataset.name).join(', '); });
    }
  });

  // search
  function filter(/** @type {string} */ q) {
    let shown = 0;
    for (const r of rows()) { r.hidden = !matchesSearch(r.textContent || '', q); if (!r.hidden) shown++; }
    if (empty) empty.hidden = shown > 0;
    list.hidden = shown === 0;
    list.dispatchEvent(new CustomEvent('ui-search', { bubbles: true, detail: { query: q, shown } }));
  }
  for (const s of searches) l.on(s, 'input', () => { for (const o of searches) if (o !== s) o.value = s.value; filter(s.value); });
  const visibleSearch = () => searches.find(s => s.getClientRects().length > 0) ?? null;

  // the phone's drawer: the side bar over the page, on a shade. It follows the finger: a right swipe on the first tab
  // page pulls it out (tab-pages.js, the drawer option), a left swipe on it or the shade pushes it back; let go, it
  // glides open or shut at the finger's speed (the tab pages' spring). The menu button and the shade's tap glide it too.
  const side = /** @type {HTMLElement | null} */ (shell.querySelector('.ui-sidebar'));
  const menus = /** @type {HTMLElement[]} */ ([...shell.querySelectorAll('.ui-bar-menu')]);
  const drawerOpen = () => shell.classList.contains('is-drawer-open');
  /** @type {HTMLElement | null} */
  let shade = null;
  /** how far out the drawer is (0 shut, dw open), and its width */
  let dx = 0, dw = 0;
  /** the drawer's glide, or null @type {{ run: import('../motion.js').Glide, open: boolean } | null} */
  let slid = null;
  /** the drawer and its shade show, for the finger or a glide */
  function lay() {
    if (!side) return;
    if (!shade) {
      shade = document.createElement('div');
      shade.className = 'ui-drawer-shade';
      shell.append(shade);
      l.on(shade, 'click', () => drawer(false));
      swipeShut(shade);
    }
    shell.classList.add('is-drawer-moving');
    dw = side.offsetWidth || 288;
  }
  /** @param {number} x */
  function place(x) {
    dx = Math.max(0, Math.min(dw, x));
    /** @type {HTMLElement} */ (side).style.transform = `translateX(${dx - dw}px)`;
    /** @type {HTMLElement} */ (shade).style.opacity = String(dx / dw);
  }
  /** place, for a finger: a haptic as the drawer crosses half (where a still let-go would turn) @param {number} x */
  function follow(x) {
    const was = dx > dw / 2;
    place(x);
    if (dx > dw / 2 !== was) haptic('threshold');
  }
  /** the drawer stops where its glide has it (the finger caught it) */
  function hold() {
    const g = slid;
    if (!g) return;
    slid = null;
    dx = g.run.stop();
  }
  // open, the drawer is a history entry (Android's Back closes it, as it does a sheet) and the page behind is inert
  // (Tab and TalkBack stay in the drawer); its entry goes as soon as it starts to shut, so a side link's new page
  // isn't undone by the step back (tab-back.js waits on it)
  let pushed = false;
  /** @param {boolean} on */
  function entry(on) {
    for (const el of shell.children) if (el !== side && el !== shade) /** @type {HTMLElement} */ (el).inert = on;
    if (on && !pushed) {
      const go = () => {
        if (pushed || !drawerOpen()) return;
        try { history.pushState({ ...(history.state || {}), uiDrawer: 1 }, ''); pushed = true; } catch { /* no history here */ }
      };
      if (stepping()) void stepsSettled().then(go); else go();
    } else if (!on && pushed) { pushed = false; stepBack(); }
  }
  l.on(window, 'popstate', () => { if (pushed && !ourStep() && !history.state?.uiDrawer) { pushed = false; drawer(false); } });
  /** the drawer comes to rest open or shut @param {boolean} on @param {boolean} [touch] */
  function rest(on, touch = false) {
    const was = drawerOpen();
    shell.classList.toggle('is-drawer-open', on);
    entry(on);
    shell.classList.remove('is-drawer-moving');
    if (side) side.style.transform = '';
    if (shade) shade.style.opacity = '';
    dx = on ? dw : 0;
    if (on === was) return;
    for (const m of menus) m.setAttribute('aria-expanded', String(on));
    // (a finger's open doesn't focus a field: the keyboard would come up)
    if (on) /** @type {HTMLElement | null} */ (side?.querySelector(touch ? 'a, button' : 'a, button, input'))?.focus({ preventScroll: true });
    else if (side?.contains(document.activeElement)) menus[0]?.focus({ preventScroll: true });
  }
  /** the drawer glides open or shut from where it is, starting at v px/ms @param {boolean} on @param {number} [v] @param {boolean} [touch] */
  function glide(on, v = 0, touch = false) {
    if (!side) return;
    hold();
    if (!on) entry(false);
    if (still() && !touch) { rest(on, touch); return; }   // (a finger's let-go glides on, as its drag did)
    lay();
    const run = springGlide([[side, x => ({ transform: `translateX(${x - dw}px)` })],
      [/** @type {HTMLElement} */ (shade), x => ({ opacity: x / dw })]], dx, on ? dw : 0, v);
    const g = slid = { run, open: on };
    if (on) rest(on, touch), shell.classList.add('is-drawer-moving');   // open at once for focus and Esc; still moving
    void run.done.then(landed => {
      if (!landed || slid !== g) return;
      slid = null;
      run.stop();
      rest(on, touch);
    });
  }
  /** @param {boolean} on */
  function drawer(on) {
    if (!side || (on === drawerOpen() && !slid)) return;
    glide(on);
  }
  /** a release: open if it is out past half, counting the throw @param {number} x @param {number} v */
  const opens = (x, v) => x + v * THROW_MS > dw / 2;
  let pull0 = 0;
  /** The drawer for a finger that started elsewhere (tab-pages.js): pull(x) has it x px out, release lets it go.
   * @type {{ pull: (x: number) => void, release: (x: number, v: number) => void } | null} */
  const pull = side && {
    pull(x) {
      if (!shell.classList.contains('is-drawer-moving') || slid) { hold(); lay(); pull0 = dx; }
      follow(pull0 + x);
    },
    release(x, v) { void x; glide(opens(dx, v), v, true); pull0 = 0; },
  };
  /** a left swipe on the open drawer, or its shade, pushes it back with the finger @param {HTMLElement} el */
  function swipeShut(el) {
    /** @type {number | null} */
    let x0 = null;
    let y0 = 0, from = 0;
    /** @type {'x' | 'y' | null} */
    let way = null;
    let going = false;
    const hist = tracker();
    l.on(el, 'touchstart', (/** @type {TouchEvent} */ e) => {
      x0 = null;
      if (e.touches.length > 1 || (!drawerOpen() && !slid) || size !== 'phone') return;
      const t = e.touches[0];
      going = slid ? slid.open : drawerOpen();
      const moving = !!slid;
      hold(); lay();
      if (!moving) dx = dw;   // (open and still)
      from = dx; place(dx);
      way = null;
      x0 = t.clientX; y0 = t.clientY;
      hist.reset(e.timeStamp, t.clientX);
    }, { passive: true });
    l.on(el, 'touchmove', (/** @type {TouchEvent} */ e) => {
      if (x0 === null) return;
      const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
      if (!way) {
        way = swipeIntent(mx, my);
        if (way === 'y') { x0 = null; letGo(); return; }   // the side bar's own scroll
        if (!way) return;
        if (!claim('drawer')) { x0 = null; letGo(); return; }
      }
      if (e.cancelable) e.preventDefault();
      hist.add(e.timeStamp, t.clientX);
      follow(from + Math.min(0, mx));
    }, { passive: false });
    const end = (/** @type {TouchEvent} */ e) => {
      if (x0 === null) return;
      x0 = null;
      if (way !== 'x') { letGo(); return; }   // a tap (the shade's click shuts it after)
      if (e.cancelable) e.preventDefault();   // no click under the finger
      const v = e.type === 'touchend' ? hist.speed(e.timeStamp) : 0;
      glide(opens(dx, v), v, true);
    };
    // not a swipe: a caught glide goes on where it was going; a still drawer stays as it was
    const letGo = () => { if (dx === (going ? dw : 0)) rest(going); else glide(going); };
    l.on(el, 'touchend', end, { passive: false });
    l.on(el, 'touchcancel', end, { passive: true });
  }
  if (side) swipeShut(side);
  for (const m of menus) { m.setAttribute('aria-expanded', 'false'); l.on(m, 'click', () => drawer(!drawerOpen())); }
  if (side) l.on(side, 'click', (/** @type {MouseEvent} */ e) => { if (/** @type {Element} */ (e.target).closest('a, .ui-side-link')) drawer(false); });
  l.on(shell, 'ui-size', () => { if (size !== 'phone') { hold(); rest(false); } });

  l.on(document, 'keydown', (/** @type {KeyboardEvent} */ e) => {
    const t = /** @type {Element} */ (e.target);
    if (e.key === 'Escape' && drawerOpen()) { drawer(false); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      const f = visibleSearch();
      if (!f || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      f.focus();
      f.select();
    } else if (e.key === 'Escape') {
      if (t instanceof HTMLInputElement && searches.includes(t)) {
        if (t.value) { t.value = ''; t.dispatchEvent(new Event('input')); } else t.blur();
      } else if (size === 'phone' && screens && screens.depth() > 0 && !editing()
        && !document.querySelector('dialog[open]') && !html.classList.contains('ui-menu-open')) screens.pop();
    }
  });

  return { open, current: () => current, size: () => size, drawer: pull, stop() { gone.disconnect(); l.stop(); hold(); entry(false); shade?.remove(); } };
}
