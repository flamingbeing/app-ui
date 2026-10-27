// The gallery's service worker (scope: this version's kit/): network first, the last copy when offline. A version's
// files never change, so a kept copy is never wrong; each version keeps its own cache.
// VERSION and SHELL: the devkit's check reads them (a cache name with the folder's prefix, the files kept at install).
const VERSION = 'kit-gallery';
const SHELL = ['./'];
const CACHE = `${VERSION}:${new URL('./', location.href).pathname}`;

addEventListener('install', ev => {
  const e = /** @type {any} */ (ev);
  /** @type {any} */ (self).skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
addEventListener('activate', e => /** @type {any} */ (e).waitUntil(/** @type {any} */ (self).clients.claim()));
addEventListener('fetch', ev => {
  const e = /** @type {any} */ (ev), req = /** @type {Request} */ (e.request);
  if (req.method !== 'GET' || !req.url.startsWith(location.origin)) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); }
    return res;
  }, () => caches.match(req, { ignoreSearch: true }).then(hit => hit || Response.error())));
});
