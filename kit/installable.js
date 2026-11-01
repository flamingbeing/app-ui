// The gallery is installable, to try it as a home-screen app: the pages link manifest.webmanifest and load this file in
// their <head> (a file, not inline: the page policy has no inline scripts). Never prompted: the browser's own install
// prompt is cancelled and kept for the settings screen's Install this app row (ui/install.js), so it shows only on a tap.
// sw.js keeps the pages for offline.
addEventListener('beforeinstallprompt', e => { e.preventDefault(); /** @type {any} */ (globalThis).coreInstallPrompt = e; });
if ('serviceWorker' in navigator && document.currentScript instanceof HTMLScriptElement) {
  navigator.serviceWorker.register(new URL('sw.js', document.currentScript.src)).catch(() => {});
}
