import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync, cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

test('static demo builder fails closed when an allowlisted input is a directory', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-static-'));
  try {
    const sourceFiles = [
      'web/index.html', 'web/app.mjs', 'web/scoreboard.mjs',
      'web/local-import.mjs', 'web/purchase-input.mjs',
      'dist/index.js', 'dist/purchase-impact.js', 'dist/statement-cycles.js',
      'dist/batch.js', 'dist/catalog.js', 'dist/catalog-audit.js'
    ];
    mkdirSync(join(sandbox, 'scripts'), { recursive: true });
    cpSync(join(root, 'scripts/build-web-static.mjs'),
      join(sandbox, 'scripts/build-web-static.mjs'));
    for (const file of sourceFiles) {
      const target = join(sandbox, file);
      mkdirSync(join(target, '..'), { recursive: true });
      if (file === 'web/app.mjs') mkdirSync(target);
      else cpSync(join(root, file), target);
    }
    const result = spawnSync(process.execPath,
      [join(sandbox, 'scripts/build-web-static.mjs')], {
        cwd: sandbox, encoding: 'utf8'
      });
    assert.notEqual(result.status, 0, 'Directory input must fail the build');
    assert.match(result.stderr, /Static demo input must be a regular file: web\/app\.mjs/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('static demo builder rejects symlinked allowlist inputs without copying external data', (t) => {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-link-'));
  try {
    mkdirSync(join(sandbox, 'scripts'), { recursive: true });
    mkdirSync(join(sandbox, 'web'), { recursive: true });
    cpSync(join(root, 'scripts/build-web-static.mjs'),
      join(sandbox, 'scripts/build-web-static.mjs'));
    const outside = join(sandbox, 'private-source.txt');
    writeFileSync(outside, 'must never be deployed');
    try {
      symlinkSync(outside, join(sandbox, 'web/index.html'), 'file');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip('Filesystem does not permit creating symlinks');
        return;
      }
      throw error;
    }
    const result = spawnSync(process.execPath,
      [join(sandbox, 'scripts/build-web-static.mjs')], {
        cwd: sandbox, encoding: 'utf8'
      });
    assert.notEqual(result.status, 0, 'Symlink input must fail the build');
    assert.ok(result.stderr.includes('Static demo input must be a regular file: web/index.html'),
      'Builder must identify the rejected symlinked input');
    assert.ok(!existsSync(join(sandbox, 'site-dist/index.html')),
      'Rejected input must not be copied into deployment output');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('static demo builder rejects a symlinked asset directory before reading files', (t) => {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-parent-link-'));
  try {
    mkdirSync(join(sandbox, 'scripts'), { recursive: true });
    const outside = join(sandbox, 'unreviewed-assets');
    mkdirSync(outside);
    writeFileSync(join(outside, 'index.html'), 'must never be deployed');
    cpSync(join(root, 'scripts/build-web-static.mjs'),
      join(sandbox, 'scripts/build-web-static.mjs'));
    try {
      symlinkSync(outside, join(sandbox, 'web'), 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip('Filesystem does not permit creating directory symlinks');
        return;
      }
      throw error;
    }
    const result = spawnSync(process.execPath,
      [join(sandbox, 'scripts/build-web-static.mjs')], {
        cwd: sandbox, encoding: 'utf8'
      });
    assert.notEqual(result.status, 0, 'Symlinked asset directory must fail the build');
    assert.match(result.stderr,
      /Static demo input directory must be a real directory: web\/index\.html/);
    assert.ok(!existsSync(join(sandbox, 'site-dist/index.html')),
      'External file must never be copied to deployment output');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
