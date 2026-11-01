// Install this app, only when the person asks (owner 1 Nov 2026: a Settings row, never a banner or a prompt of its own).
// The page's boot.js cancels the browser's own install prompt and keeps the event in globalThis.coreInstallPrompt; a
// tap on Install shows that prompt (Chrome, Edge, Samsung Internet). Where there is none (iPhone and iPad, Firefox, or
// Chrome before it has offered one) it says how to install from the browser instead. Already installed (opened from
// the home screen): no row. Nothing runs on import.
import { alertModal } from './modal.js';

/** @typedef {{ prompt: () => Promise<void>, userChoice: Promise<{ outcome: string }> }} InstallPromptEvent */

/** @type {Readonly<Record<string, string>>} */
export const INSTALL_WORDS = Object.freeze({
  installRow: 'Install this app',
  installSub: 'Opens from your home screen, like any other app',
  installButton: 'Install',
  installTitle: 'Install this app',
  installIos: 'Tap the Share button (the square with an arrow), then Add to Home Screen.',
  installOther: 'Open the browser menu (the three dots), then Install app or Add to Home screen.',
  installed: 'Installed. Open it from your home screen.',
});

/**
 * How this page can be installed (pure).
 * @param {Navigator} [nav] @param {(q: string) => boolean} [media]
 * @returns {'installed' | 'ios' | 'other'}  installed: opened as an installed app; ios: iPhone or iPad (Share → Add
 *   to Home Screen); other: the browser's prompt if it kept one, else its menu
 */
export function installMode(nav = navigator, media = q => typeof matchMedia === 'function' && matchMedia(q).matches) {
  if (/** @type {any} */ (nav).standalone === true || media('(display-mode: standalone)') || media('(display-mode: fullscreen)')
    || media('(display-mode: minimal-ui)') || media('(display-mode: window-controls-overlay)')) return 'installed';
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return ios ? 'ios' : 'other';
}

/** The kept prompt, if the browser offered one and it is still unused. @returns {InstallPromptEvent | null} */
const kept = () => /** @type {any} */ (globalThis).coreInstallPrompt || null;

/**
 * Install now (call from a tap: the browser shows its prompt only on a user gesture).
 * @param {{ words?: Record<string, string>, nav?: Navigator, ask?: (message: string, o: { title: string }) => Promise<unknown> }} [o]
 * @returns {Promise<'accepted' | 'dismissed' | 'help'>}  help: no prompt here, the how-to was shown
 */
export async function installApp({ words = {}, nav = navigator, ask = alertModal } = {}) {
  const w = { ...INSTALL_WORDS, ...words };
  const event = kept();
  if (event && installMode(nav) === 'other') {
    /** @type {any} */ (globalThis).coreInstallPrompt = null;   // a prompt shows once; the browser offers a new one if needed
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  }
  await ask(installMode(nav) === 'ios' ? w.installIos : w.installOther, { title: w.installTitle });
  return 'help';
}
