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
    ['batch.js', 'catalog-audit.js', 'catalog.js', 'index.js', 'purchase-impact.js']);
  const html = readFileSync(join(output, 'index.html'), 'utf8');
  assert.match(html, /Offline SDK Demo/);
  assert.match(html, /src="\/web\/app\.mjs"/);
  assert.match(readFileSync(join(output, 'web/app.mjs'), 'utf8'), /compareCards/);
  assert.match(readFileSync(join(output, 'web/app.mjs'), 'utf8'), /comparePurchaseImpact/);
  assert.match(readFileSync(join(output, 'index.html'), 'utf8'), /id="compare-purchase"/);
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
});
