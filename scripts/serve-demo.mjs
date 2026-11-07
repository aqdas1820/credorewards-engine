#!/usr/bin/env node
// Offline/loopback-only development preview. Never expose customer financial data.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const files = new Map([
  ['/', ['../web/index.html', 'text/html; charset=utf-8']],
  ['/web/app.mjs', ['../web/app.mjs', 'text/javascript; charset=utf-8']],
  ['/web/scoreboard.mjs', ['../web/scoreboard.mjs', 'text/javascript; charset=utf-8']],
  ['/web/local-import.mjs', ['../web/local-import.mjs', 'text/javascript; charset=utf-8']],
  ['/web/purchase-input.mjs', ['../web/purchase-input.mjs', 'text/javascript; charset=utf-8']],
  ['/dist/index.js', ['../dist/index.js', 'text/javascript; charset=utf-8']],
  ['/dist/purchase-impact.js', ['../dist/purchase-impact.js', 'text/javascript; charset=utf-8']],
  ['/dist/batch.js', ['../dist/batch.js', 'text/javascript; charset=utf-8']],
  ['/dist/catalog.js', ['../dist/catalog.js', 'text/javascript; charset=utf-8']],
  ['/dist/catalog-audit.js', ['../dist/catalog-audit.js', 'text/javascript; charset=utf-8']]
]);
const host = '127.0.0.1';
const port = process.env.CREDOREWARDS_DEMO_PORT === undefined
  ? 4173 : Number(process.env.CREDOREWARDS_DEMO_PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('CREDOREWARDS_DEMO_PORT must be a valid port');
  process.exit(1);
}
const csp = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
const server = createServer(async (req, res) => {
  const path = (req.url ?? '').split('?')[0];
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const entry = files.get(path);
  if (!entry) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    const content = await readFile(fileURLToPath(new URL(entry[0], import.meta.url)));
    res.writeHead(200, { 'Content-Type': entry[1] });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('Build unavailable. Run npm run build first.');
  }
});
server.on('error', error => {
  console.error('Offline dashboard error: ' + error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  const addr = server.address();
  console.log('CredoRewards offline dashboard: http://' + host + ':' + addr.port);
});
