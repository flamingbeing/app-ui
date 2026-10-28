// worker/sites.js with a stand-in for the static assets (dist/). Run: node --test 'worker/test/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { PAGE_CSP } from '../sites.js';

const FILES = {
  '/ui/versions.json': '{"latest":"1.0.0","versions":["1.0.0"]}',
  '/ui/1.0.0/ui/index.js': 'export {};',
  '/ui/1.0.0/ui/ui.css': '.x{}',
  '/ui/1.0.0/ui/types.d.ts': 'export {};',
  '/ui/1.0.0/kit/index.html': '<h1>kit</h1>',
  '/ui/1.0.0/kit/shell/index.html': '<h1>shell</h1>',
  '/ui/1.0.0/icons/icon.svg': '<svg/>',
  '/ui/1.0.0/icons/icon-192.png': 'png',
  '/ui/1.0.0/kit/manifest.webmanifest': '{}',
  '/ui/1.0.0-rc.1/theme/index.js': 'export {};',
};
const env = { ASSETS: { fetch: async req => {
  const p = new URL(req.url).pathname;
  return p in FILES ? new Response(FILES[p], { status: 200 }) : new Response('', { status: 404 });
} } };
const BASE = 'https://core.anawj.com';
const get = (path, method = 'GET') => worker.fetch(new Request(BASE + path, { method }), env);

test('a released file: its type, a year immutable, any origin may load it, noindex', async () => {
  for (const [path, type] of [['/ui/1.0.0/ui/index.js', 'text/javascript'], ['/ui/1.0.0/ui/ui.css', 'text/css'], ['/ui/1.0.0/icons/icon.svg', 'image/svg+xml'],
    ['/ui/1.0.0/icons/icon-192.png', 'image/png'], ['/ui/1.0.0/kit/manifest.webmanifest', 'application/manifest+json'],
    ['/ui/1.0.0/ui/types.d.ts', 'text/plain'], ['/ui/1.0.0-rc.1/theme/index.js', 'text/javascript']]) {
    const r = await get(path);
    assert.equal(r.status, 200, path);
    assert.ok(r.headers.get('Content-Type').startsWith(type), path);
    assert.equal(r.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(r.headers.get('Cross-Origin-Resource-Policy'), 'cross-origin');
    assert.equal(r.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(r.headers.get('Content-Security-Policy'), null);
  }
});

test('the list of versions: JSON, kept 5 minutes', async () => {
  const r = await get('/ui/versions.json');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('Content-Type'), /^application\/json/);
  assert.equal(r.headers.get('Cache-Control'), 'public, max-age=300');
});

test('the gallery: a folder serves its index.html with the page policy; without the "/" it redirects', async () => {
  const r = await get('/ui/1.0.0/kit/');
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '<h1>kit</h1>');
  assert.match(r.headers.get('Content-Type'), /^text\/html/);
  assert.equal(r.headers.get('Content-Security-Policy'), PAGE_CSP);
  assert.equal((await get('/ui/1.0.0/kit/shell/')).status, 200);
  const moved = await get('/ui/1.0.0/kit/shell?edge=always');
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('Location'), `${BASE}/ui/1.0.0/kit/shell/?edge=always`);
  assert.equal((await get('/ui/1.0.0/kit/nope')).status, 404);
});

test('nothing else: other folders, unversioned or moving addresses, missing files, other types', async () => {
  for (const path of ['/ui/', '/ui/1.0.0/', '/ui/1.0.0/ui/', '/ui/latest/ui/index.js', '/ui/v1/ui/index.js', '/ui/1.0.0/ui/nope.js',
    '/ui/1.0.0/test/x.js', '/ui/1.0.0/package.json', '/ui/1.0.0/ui/../package.json', '/ui/1.0.0/ui/index.mjs', '/sync/1.3.13/app.js', '/']) {
    assert.equal((await get(path)).status, 404, path);
  }
});

test('only GET and HEAD', async () => {
  assert.equal((await get('/ui/1.0.0/ui/index.js', 'POST')).status, 405);
  assert.equal((await get('/ui/1.0.0/ui/index.js', 'HEAD')).status, 200);
});

test('/kit/shell and /ui/kit/shell (no "/"): a 302 to the newest gallery\'s folder', async () => {
  for (const [from, to] of [['/kit/shell', '/ui/1.0.0/kit/shell/'], ['/ui/kit/shell', '/ui/1.0.0/kit/shell/'], ['/kit/shell?x=1', '/ui/1.0.0/kit/shell/?x=1']]) {
    const r = await get(from);
    assert.equal(r.status, 302, from);
    assert.equal(r.headers.get('Location'), BASE + to, from);
  }
});

test('/kit and /kit/…: a 302 to the newest gallery, kept only a minute; the version comes from versions.json', async () => {
  for (const [from, to] of [['/kit', '/ui/1.0.0/kit/'], ['/kit/', '/ui/1.0.0/kit/'], ['/kit/shell/', '/ui/1.0.0/kit/shell/'], ['/kit?x=1', '/ui/1.0.0/kit/?x=1'],
    ['/ui/kit', '/ui/1.0.0/kit/'], ['/ui/kit/', '/ui/1.0.0/kit/'], ['/ui/kit/shell/', '/ui/1.0.0/kit/shell/']]) {
    const r = await get(from);
    assert.equal(r.status, 302, from);
    assert.equal(r.headers.get('Location'), BASE + to, from);
    assert.equal(r.headers.get('Cache-Control'), 'public, max-age=60');
  }
  assert.equal((await get('/kit', 'HEAD')).status, 302);
  for (const p of ['/kitchen', '/kit/../x', '/kit/a.js', '/kit//', '/ui/kitchen', '/ui/kit/a.js']) assert.equal((await get(p)).status, 404, p);
  const next = { ASSETS: { fetch: async () => new Response('{"latest":"2.1.0-rc.2"}') } };
  assert.equal((await worker.fetch(new Request(BASE + '/kit'), next)).headers.get('Location'), BASE + '/ui/2.1.0-rc.2/kit/');
  for (const body of ['', 'nope', '{"latest":"../x"}', '{}']) {
    const bad = { ASSETS: { fetch: async () => new Response(body) } };
    assert.equal((await worker.fetch(new Request(BASE + '/kit'), bad)).status, 404, body);
  }
});
