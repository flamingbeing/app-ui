/**
 * How this page can be installed (pure).
 * @param {Navigator} [nav] @param {(q: string) => boolean} [media]
 * @returns {'installed' | 'ios' | 'other'}  installed: opened as an installed app; ios: iPhone or iPad (Share → Add
 *   to Home Screen); other: the browser's prompt if it kept one, else its menu
 */
export function installMode(nav?: Navigator, media?: (q: string) => boolean): "installed" | "ios" | "other";
/**
 * Install now (call from a tap: the browser shows its prompt only on a user gesture).
 * @param {{ words?: Record<string, string>, nav?: Navigator, ask?: (message: string, o: { title: string }) => Promise<unknown> }} [o]
 * @returns {Promise<'accepted' | 'dismissed' | 'help'>}  help: no prompt here, the how-to was shown
 */
export function installApp({ words, nav, ask }?: {
    words?: Record<string, string>;
    nav?: Navigator;
    ask?: (message: string, o: {
        title: string;
    }) => Promise<unknown>;
}): Promise<"accepted" | "dismissed" | "help">;
/** @typedef {{ prompt: () => Promise<void>, userChoice: Promise<{ outcome: string }> }} InstallPromptEvent */
/** @type {Readonly<Record<string, string>>} */
export const INSTALL_WORDS: Readonly<Record<string, string>>;
export type InstallPromptEvent = {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: string;
    }>;
};
