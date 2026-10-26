// The e2e server: the real Worker (worker/sites.js) in Node, with the working tree served as one released version,
// /ui/0.0.0-dev/ (fixtures.mjs BASE), so the tests load the files the way an app does. /test/ serves e2e/pages/: test
// pages that are not part of a release (a page without the gallery's markup). node e2e/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/sites.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4174);
const PAGES = path.join(ROOT, 'e2e/pages');
const DEV = '/ui/0.0.0-dev/';

const read = async file => { try { return await fs.readFile(file); } catch { return null; } };
const env = { ASSETS: { async fetch(req) {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === '/ui/versions.json') return new Response(JSON.stringify({ latest: '0.0.0-dev', versions: ['0.0.0-dev'] }));
  const file = p.startsWith(DEV) ? path.join(ROOT, p.slice(DEV.length)) : '';
  const body = file.startsWith(ROOT + path.sep) ? await read(file) : null;
  return body ? new Response(body) : new Response('', { status: 404 });
} } };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/test/')) {
    const file = path.join(PAGES, url.pathname.slice('/test/'.length));
    const body = file.startsWith(PAGES + path.sep) ? await read(file) : null;
    res.writeHead(body ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body || 'Not found');
    return;
  }
  const r = await worker.fetch(new Request(url, { method: req.method }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT, '127.0.0.1', () => console.log(`e2e server on http://localhost:${PORT}${DEV}kit/`));
