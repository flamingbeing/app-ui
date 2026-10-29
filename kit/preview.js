// What every gallery page reads from its address: ?look=a|b|c and ?density=comfortable|regular|compact show that look
// or density on this page without keeping it (links and screenshots); ?edge=always|off forces the edge swipe on or
// off; ?guard=again forgets the glass guard's verdict so it runs again; ?kit=home|nuhs|ntf shows the page on that design
// kit (its tokens.css, with the colour and ground an app on it names). Applies the theme (the iOS look, as the gallery's
// own), then returns the choice shown.
import { applyTheme, previewTheme, themeChoice, keepGlassVerdict } from '../theme/index.js';

// the design kits an app can be made on (app-starter's fill --kit), and the theme an app on each passes to applyTheme
export const KITS = Object.freeze({
  home: { tokens: 'https://design.flamingbeing.com/v1/tokens.css', theme: {} },
  nuhs: { tokens: 'https://design.anawj.com/v1/tokens.css', theme: { accent: '#002f6c', surface: 'white' } },
  ntf: { tokens: 'https://design.anantf.com/v1/tokens.css', theme: { accent: '#633d3c', surface: 'linen' } },
});

/** @param {string | null} id  swaps the page's kit tokens for that kit's @returns {object}  its theme for applyTheme */
function useKit(id) {
  const kit = KITS[/** @type {keyof typeof KITS} */ (id ?? '')];
  if (!kit || id === 'home') return {};
  const link = /** @type {HTMLLinkElement | null} */ (document.querySelector('link[href$="/v1/tokens.css"]'));
  if (link) link.href = kit.tokens;
  document.documentElement.dataset.kit = /** @type {string} */ (id);
  return kit.theme;
}

export function galleryPreview() {
  const params = new URLSearchParams(location.search);
  if (params.get('guard') === 'again') keepGlassVerdict(null);
  // the gallery's own look is iOS (an app's default stays A); a kit's theme may name its own
  applyTheme({ look: 'ios', ...useKit(params.get('kit')) });
  /** @type {Record<string, string>} */
  const preview = {};
  for (const k of ['look', 'density']) { const v = params.get(k); if (v) preview[k] = v; }
  const edge = params.get('edge');
  if (edge === 'always' || edge === 'off') document.documentElement.dataset.edgeBack = edge;
  return Object.keys(preview).length ? previewTheme(preview) : themeChoice();
}
