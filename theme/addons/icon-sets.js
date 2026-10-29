// Add-on: icon sets (ported from the logbook engine). The kit's icons (.ui-icon, Lucide line icons) drawn in another
// style: sharp ends, soft (tinted inside), thin, or even. A set is CSS on <html data-icons="<set>"> (addons.css), so
// every icon follows without being drawn again; an app may give a set its own drawing for some icons (paths). Per tab:
// an app may let a person pick an icon for any tab from a list the app passes (cleanIconPicks). Pure; unit-tested.

export const ICON_SETS = Object.freeze({
  line: { label: 'Line (default)' },
  sharp: { label: 'Sharp (square ends)' },
  soft: { label: 'Soft (rounded, tinted inside)' },
  thin: { label: 'Thin (light, round)' },
  even: { label: 'Even (square-ish)' },
});
/** @typedef {keyof typeof ICON_SETS} IconSet */
// the logbook's names for the same sets, so a theme saved there reads as the same set here
const ALIASES = Object.freeze({ ios: 'thin', material: 'even' });
/** @param {unknown} v @returns {IconSet | null}  a set other than the default, or null */
export function cleanIconSet(v) {
  const k = typeof v === 'string' ? (/** @type {Record<string, string>} */ (ALIASES)[v] ?? v) : '';
  return k && k !== 'line' && Object.hasOwn(ICON_SETS, k) ? /** @type {IconSet} */ (k) : null;
}
/** the set's labels for a picker @returns {[string, string][]} */
export const iconSetChoices = () => Object.entries(ICON_SETS).map(([k, s]) => /** @type {[string, string]} */ ([k, s.label]));

/**
 * The path to draw for an icon: the set's own (paths the app gave it), else the default.
 * @param {string} name @param {string} fallback
 * @param {unknown} [set]  the set (default: <html data-icons>)
 * @param {Record<string, Record<string, string>>} [paths]  set -> icon name -> SVG path
 */
export function iconSetPath(name, fallback, set = typeof document !== 'undefined' ? document.documentElement.dataset.icons : '', paths = {}) {
  const k = cleanIconSet(set);
  return (k && paths[k]?.[name]) || fallback;
}

/**
 * A saved icon-per-tab choice: tab ids (lowercase letters) to names in the app's list only, at most max; {} when none.
 * @param {unknown} v @param {Record<string, unknown> | string[]} names  the icons a tab may take @param {number} [max]
 * @returns {Record<string, string>}
 */
export function cleanIconPicks(v, names, max = 13) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const ok = Array.isArray(names) ? new Set(names) : new Set(Object.keys(names));
  return Object.fromEntries(Object.entries(v).filter(([k, x]) => /^[a-z]{1,12}$/.test(k) && typeof x === 'string' && ok.has(x))
    .sort(([a], [b]) => (a < b ? -1 : 1)).slice(0, max));
}
