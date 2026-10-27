// The gallery's service worker (scope: this version's kit/): network first, the last copy when offline. A version's
// files never change, so a kept copy is never wrong; each version keeps its own cache.
const CACHE = `kit:${new URL('./', location.href).pathname}`;

addEventListener('install', () => /** @type {any} */ (self).skipWaiting());
addEventListener('activate', e => /** @type {any} */ (e).waitUntil(/** @type {any} */ (self).clients.claim()));
addEventListener('fetch', ev => {
  const e = /** @type {any} */ (ev), req = /** @type {Request} */ (e.request);
  if (req.method !== 'GET' || !req.url.startsWith(location.origin)) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); }
    return res;
  }, () => caches.match(req, { ignoreSearch: true }).then(hit => hit || Response.error())));
});
