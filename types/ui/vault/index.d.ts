/**
 * Links the vault shell's styles (ui/vault/vault.css, beside this file) once; resolves when they have loaded (or
 * failed: the page goes on unstyled rather than waiting).
 * @returns {Promise<void>}
 */
export function vaultStyles(): Promise<void>;
export { navPill } from "./nav-pill.js";
export { menuSheet } from "./menu-sheet.js";
export { vaultIcon } from "./icons.js";
export { sidebar } from "./sidebar.js";
export function loadSettingsSheet(): Promise<typeof import("./settings-sheet.js").settingsSheet>;
export { sideDrawer, DRAWER_EDGE } from "./side-drawer.js";
