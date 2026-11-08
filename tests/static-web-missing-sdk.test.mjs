import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('static demo build fails closed when the compiled SDK entrypoint is missing', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-missing-sdk-'));
  try {
    mkdirSync(join(sandbox, 'scripts'));
    mkdirSync(join(sandbox, 'dist'));
    mkdirSync(join(sandbox, 'web'));
    cpSync(join(root, 'scripts/build-web-static.mjs'),
      join(sandbox, 'scripts/build-web-static.mjs'));
    for (const file of ['index.html', 'app.mjs', 'scoreboard.mjs',
      'local-import.mjs', 'purchase-input.mjs']) {
      cpSync(join(root, 'web', file), join(sandbox, 'web', file));
    }
    // No dist/index.js: deployment must not silently succeed with an
    // incomplete browser SDK after a skipped or failed compilation.
    const result = spawnSync(process.execPath,
      [join(sandbox, 'scripts/build-web-static.mjs')], {
        cwd: sandbox, encoding: 'utf8'
      });
    assert.notEqual(result.status, 0, 'Missing compiled SDK must fail the build');
    assert.match(result.stderr, /ENOENT/);
    assert.ok(!existsSync(join(sandbox, 'site-dist')),
      'Failed input preflight must not leave partial deployable assets');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
