import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
test('public demo output only includes reviewed static files and browser SDK', () => {
  execFileSync(process.execPath, [join(root, 'scripts/build-web-static.mjs')], { cwd: root });
  const output = join(root, 'site-dist');
  assert.deepEqual(readdirSync(output).sort(), ['dist', 'index.html', 'web']);
  assert.deepEqual(readdirSync(join(output, 'web')).sort(), ['app.mjs', 'local-import.mjs', 'purchase-input.mjs', 'scoreboard.mjs']);
  assert.deepEqual(readdirSync(join(output, 'dist')).sort(),
    ['batch.js', 'catalog-audit.js', 'catalog.js', 'index.js', 'purchase-impact.js', 'statement-cycles.js']);
  const html = readFileSync(join(output, 'index.html'), 'utf8');
  assert.match(html, /Offline SDK Demo/);
  assert.match(html, /src="\/web\/app\.mjs"/);
  assert.match(readFileSync(join(output, 'web/app.mjs'), 'utf8'), /compareCards/);
  assert.match(readFileSync(join(output, 'web/app.mjs'), 'utf8'), /comparePurchaseImpact/);
  assert.match(readFileSync(join(output, 'index.html'), 'utf8'), /id="compare-purchase"/);
  // Browser ESM eagerly resolves ALL re-exported SDK modules, not just functions
  // called by the dashboard. Catch missing imports before deploying static assets.
  const pending = ['web/app.mjs'];
  const visited = new Set();
  while (pending.length) {
    const asset = pending.pop();
    if (visited.has(asset)) continue;
    visited.add(asset);
    const source = readFileSync(join(output, asset), 'utf8');
    const imports = /(?:^|\n)\s*(?:import|export)\s+(?:[^'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(imports)) {
      const specifier = match[1];
      assert.ok(specifier.startsWith('/') || specifier.startsWith('./') ||
        specifier.startsWith('../'), 'Unexpected bare or remote browser import: ' + specifier);
      const resolved = specifier.startsWith('/')
        ? specifier.slice(1)
        : new URL(specifier, 'https://demo.invalid/' + asset).pathname.slice(1);
      assert.ok(!resolved.startsWith('../'), 'Import escapes static root: ' + specifier);
      assert.ok(existsSync(join(output, resolved)),
        asset + ' imports missing static module ' + specifier);
      if (resolved.endsWith('.js') || resolved.endsWith('.mjs')) pending.push(resolved);
    }
  }
  assert.ok(visited.has('dist/statement-cycles.js'),
    'Re-exported statement cycle module must be reachable in static bundle');
  assert.ok(!existsSync(join(output, 'package.json')));
  assert.ok(!existsSync(join(output, 'scripts/serve-demo.mjs')));
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.outputDirectory, 'site-dist');
  assert.equal(config.buildCommand, 'npm run build:web');
  const headers = Object.fromEntries(config.headers[0].headers.map(h => [h.key, h.value]));
  assert.match(headers['Content-Security-Policy'], /connect-src 'none'/);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Cache-Control'], 'no-store');
  // Deployment configuration must protect every static route, not only the
  // index page. These checks do not assert that a live deployment is public.
  assert.equal(config.headers.length, 1);
  assert.equal(config.headers[0].source, '/(.*)');
  assert.equal(config.framework, null);
  assert.equal(headers['Referrer-Policy'], 'no-referrer');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Content-Security-Policy'], /(?:^|;)\s*default-src 'none'(?:;|$)/);
  assert.match(headers['Content-Security-Policy'], /(?:^|;)\s*script-src 'self'(?:;|$)/);
  assert.match(headers['Content-Security-Policy'], /(?:^|;)\s*form-action 'none'(?:;|$)/);
  assert.match(headers['Content-Security-Policy'], /(?:^|;)\s*base-uri 'none'(?:;|$)/);
  assert.doesNotMatch(headers['Content-Security-Policy'], /'unsafe-eval'/);
  assert.doesNotMatch(headers['Content-Security-Policy'], /script-src[^;]*'unsafe-inline'/);
  assert.equal(Object.keys(headers).length, config.headers[0].headers.length,
    'Duplicate deployment security headers can mask weaker values');
});
