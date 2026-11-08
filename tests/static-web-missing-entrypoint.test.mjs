import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('static demo build rejects a missing browser entrypoint without partial output', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-missing-web-entrypoint-'));
  try {
    const files = [
      'web/app.mjs', 'web/scoreboard.mjs', 'web/local-import.mjs',
      'web/purchase-input.mjs', 'dist/index.js', 'dist/purchase-impact.js',
      'dist/statement-cycles.js', 'dist/batch.js', 'dist/catalog.js',
      'dist/catalog-audit.js'
    ];
    mkdirSync(join(sandbox, 'scripts'));
    cpSync(join(root, 'scripts/build-web-static.mjs'),
      join(sandbox, 'scripts/build-web-static.mjs'));
    for (const file of files) {
      const destination = join(sandbox, file);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(root, file), destination);
    }
    writeFileSync(join(sandbox, 'web/index.html'),
      '<!doctype html><html><body>no browser module</body></html>');
    const result = spawnSync(process.execPath,
      [join(sandbox, 'scripts/build-web-static.mjs')], {
        cwd: sandbox, encoding: 'utf8'
      });
    assert.notEqual(result.status, 0, 'Missing browser entrypoint must fail the build');
    assert.match(result.stderr, /Missing browser entrypoint/);
    assert.ok(!existsSync(join(sandbox, 'site-dist')),
      'Invalid browser HTML must not leave partial deployable assets');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
