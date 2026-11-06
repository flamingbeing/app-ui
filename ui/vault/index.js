// The vault shell (opt-in): the parts of a notes-vault layout on a phone, for an app that wants that look. Nothing
// here loads unless the app imports this file (it is not in @core/ui's index): map it in the import map, e.g.
// "@core/ui/vault": "https://core.anawj.com/ui/<version>/ui/vault/index.js", and import() it when the layout starts.
//   navPill    the floating navigation pill (back, forward, search, +, the open tabs' count, menu; the app's handlers)
//   menuSheet  a bottom sheet of rows in grouped rounded cards (item menus, an app menu, pickers)
//   sidebar    a left or right drawer of the app's views (a view picker pill at the foot, a footer slot), on sideDrawer
//   sideDrawer the drawer alone: opened by a button or a swipe from the content (the screen's edges stay Back)
//   loadSettingsSheet  the full-screen settings (pages of rows, a search, a toggle page for optional modules), loaded
//              when first wanted: import('./settings-sheet.js') (or import that file yourself)
//   vaultStyles  links ui/vault/vault.css (once) and resolves when it has loaded; or link it in the page yourself
// Nothing runs on import.
export { navPill } from './nav-pill.js';
export { menuSheet } from './menu-sheet.js';
export { vaultIcon } from './icons.js';
export { sidebar } from './sidebar.js';
export { sideDrawer, DRAWER_EDGE } from './side-drawer.js';

/** The settings sheet's code, loaded the first time it is wanted. @returns {Promise<typeof import('./settings-sheet.js').settingsSheet>} */
export const loadSettingsSheet = () => import('./settings-sheet.js').then(m => m.settingsSheet);

/** @type {Promise<void> | null} */
let styled = null;
/**
 * Links the vault shell's styles (ui/vault/vault.css, beside this file) once; resolves when they have loaded (or
 * failed: the page goes on unstyled rather than waiting).
 * @returns {Promise<void>}
 */
export function vaultStyles() {
  if (styled) return styled;
  const href = new URL('./vault.css', import.meta.url).href;
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => /** @type {HTMLLinkElement} */ (l).href === href)) return (styled = Promise.resolve());
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  styled = new Promise(resolve => { link.addEventListener('load', () => resolve()); link.addEventListener('error', () => resolve()); });
  document.head.append(link);
  return styled;
}
