// The Cloudflare Worker for core.anawj.com/ui/*: serves each released version of the UI core (dist/ui/<x.y.z>/, built
// from the release tags by tools/build-ui.mjs, bound as ASSETS) and the list of versions. Files only. The rest of
// core.anawj.com (/sync/, /update/) is app-sync's Worker; this route runs first for /ui/ addresses only.
// wrangler.jsonc: "run_worker_first" sends every request here.
// core.anawj.com/kit and /kit/… (routes too) is the one fixed link to the newest gallery: a 302 to /ui/<latest>/kit/…,
// "latest" read from the same versions.json the build writes, so no version is typed by hand per release.
// /ui/kit and /ui/kit/… do the same: the installed gallery starts at /ui/kit/ (its manifest), inside its /ui/ scope.

const NOINDEX = 'noindex, nofollow';
// x.y.z with an optional pre-release (1.0.0-rc.1), the same shape as tools/semver.mjs VERSION_RE
const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?`;
// a released version's files never change: browsers and the CDN may keep them for a year. The list of versions can.
// Files by type (the gallery's manifest and icons too: it is installable), and the gallery's folders (/kit/, /kit/shell/, …: their index.html; without the "/", a redirect).
const VERSIONED = new RegExp(String.raw`^/ui/${SEMVER}/(?:(?:ui|theme|settings|kit|icons)/[\w./-]*\.(?:js|css|html|svg|png|webmanifest|d\.ts)|kit(?:/[\w-]+)*/?)$`);
const LISTING = '/ui/versions.json';
// the sub-folder with or without its "/" (/kit/shell and /kit/shell/ both reach /ui/<latest>/kit/shell/)
const NEWEST_KIT = /^\/(?:ui\/)?kit((?:\/[\w-]+)*)\/?$/;
const TYPES = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', html: 'text/html; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json', json: 'application/json; charset=utf-8', ts: 'text/plain; charset=utf-8' };
// public code, no cookies or credentials, so any app origin may import it (and <link> its CSS)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin' };
// the gallery pages: their own files, the design kit's tokens and its fonts; nothing else
const KIT = 'https://design.flamingbeing.com';
export const PAGE_CSP = [
  "default-src 'self'", `script-src 'self' ${KIT}`, `style-src 'self' ${KIT} https://fonts.googleapis.com`,
  `font-src 'self' ${KIT} https://fonts.gstatic.com`, `img-src 'self' data: blob: ${KIT}`,
  `connect-src 'self' ${KIT} https://fonts.googleapis.com https://fonts.gstatic.com`, "object-src 'none'", "base-uri 'self'",
  "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const url = new URL(request.url);
    const kit = NEWEST_KIT.exec(url.pathname);
    if (kit) return newestKit(env, url, `${kit[1]}/`);
    if ((url.pathname !== LISTING && !VERSIONED.test(url.pathname)) || url.pathname.includes('..')) return notFound();   // no folder listings, no other files

    // a folder (address ending in "/") serves its index.html; without the "/", the browser is sent to it (as GitHub
    // Pages does), so the page's relative links work
    let file = url.pathname.slice(1);
    if (file.endsWith('/')) file += 'index.html';
    else if (!/\.[^/]+$/.test(file)) {
      const dir = await asset(env, url, file + '/index.html');
      return dir.status === 200 ? redirect(url, url.pathname + '/') : notFound();
    }
    let res = await asset(env, url, file);
    if (res.status !== 200) return notFound();
    const ext = file.endsWith('.d.ts') ? 'ts' : file.split('.').pop() || '';
    res = new Response(res.body, res);
    res.headers.set('X-Robots-Tag', NOINDEX);
    res.headers.set('X-Content-Type-Options', 'nosniff');
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    res.headers.set('Cache-Control', url.pathname === LISTING ? 'public, max-age=300' : 'public, max-age=31536000, immutable');
    res.headers.set('Content-Type', TYPES[ext]);
    if (ext === 'html') res.headers.set('Content-Security-Policy', PAGE_CSP);
    return res;
  },
};

const asset = (env, url, file) => env.ASSETS.fetch(new Request(new URL('/' + file, url), { method: 'GET' }));
const redirect = (url, path) => Response.redirect(new URL(path + url.search, url).toString(), 301);
const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': NOINDEX } });

// a short-lived redirect (the target moves with each release); no listing yet or a broken one: 404, not a loop
async function newestKit(env, url, rest) {
  const res = await asset(env, url, LISTING.slice(1));
  const latest = res.status === 200 ? (await res.json().catch(() => null))?.latest : null;
  if (typeof latest !== 'string' || !new RegExp(`^${SEMVER}$`).test(latest)) return notFound();
  return new Response(null, { status: 302, headers: { Location: new URL(`/ui/${latest}/kit${rest}${url.search}`, url).toString(), 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': NOINDEX } });
}
