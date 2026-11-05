// A classic script, not a module, so the browser runs it before the first paint (a module waits until the page is
// parsed, and the page may paint by then). It puts back the look choice.js last showed on this device (the <html>
// marks, Solid and the palette sheet, which choice.js keeps in localStorage) until boot.js shows the choice itself
// and takes the sheet over. A file, not inline, so the Content-Security-Policy needs no inline script. Nothing kept: no-op.
// It also marks a warm start (the second part, below).
(() => {
  try {
    const kept = JSON.parse(localStorage.getItem('core-theme-paint') || 'null');
    if (!kept || typeof kept.css !== 'string') return;
    const root = document.documentElement;
    for (const key of ['theme', 'dark', 'look', 'density', 'motion', 'haptics', 'header', 'menu', 'glass', 'tick', 'tabbar', 'family']) {
      const value = kept.marks && kept.marks[key];
      if (typeof value === 'string') root.dataset[key] = value;
    }
    if (kept.solid === true) root.classList.remove('glass');
    if (typeof CSSStyleSheet !== 'function' || !('adoptedStyleSheets' in document)) return;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(kept.css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    /** @type {any} */ (globalThis).coreThemeSheet = sheet;
  } catch { /* no storage or an unreadable copy: boot.js shows the choice a moment later */ }
})();
// Warm start (ui/resume.js, opt-in per app): a place an app kept when it was left (its tab page and scroll) and that
// is still within its window is marked on <html> now, so the pages stay unseen (gestures/screens.css) until tabPages
// opens that tab, and the first tab never shows first. The same rule as resume.js placeToOpen; nothing kept: no-op.
(() => {
  try {
    if (location.hash || location.search) return;   // a deep link wins
    const p = JSON.parse(localStorage.getItem('ui-resume') || 'null');
    const now = Date.now();
    if (!p || p.v !== 1 || p.path !== location.pathname || typeof p.tab !== 'string' || !/^[A-Za-z][\w-]{0,63}$/.test(p.tab)) return;
    if (typeof p.at !== 'number' || typeof p.until !== 'number' || !(now >= p.at && now < p.until)) return;
    const y = typeof p.y === 'number' && Number.isFinite(p.y) && p.y > 0 ? Math.round(p.y) : 0;
    document.documentElement.setAttribute('data-resuming', p.tab);
    document.documentElement.setAttribute('data-resume-y', String(y));
  } catch { /* no storage or an unreadable copy: a normal start */ }
})();
