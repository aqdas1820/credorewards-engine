import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const inputs = [
  'scripts/build-web-static.mjs',
  'web/index.html',
  'web/app.mjs',
  'web/scoreboard.mjs',
  'web/local-import.mjs',
  'web/purchase-input.mjs',
  'dist/index.js',
  'dist/purchase-impact.js',
  'dist/statement-cycles.js',
  'dist/batch.js',
  'dist/catalog.js',
  'dist/catalog-audit.js'
];

function withFixture(check) {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-preflight-'));
  try {
    for (const path of inputs) {
      const destination = join(sandbox, path);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(root, path), destination);
    }
    check(sandbox);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function assertRejectedWithoutOutput(sandbox, expectedError) {
  const result = spawnSync(process.execPath, ['scripts/build-web-static.mjs'], {
    cwd: sandbox, encoding: 'utf8'
  });
  assert.notEqual(result.status, 0, 'invalid static inputs must fail');
  assert.match(result.stderr, expectedError);
  assert.equal(existsSync(join(sandbox, 'site-dist')), false,
    'failed preflight must not leave deployable output');
}

test('static build refuses a missing allowlisted SDK module before writing output', () => {
  withFixture(sandbox => {
    rmSync(join(sandbox, 'dist/batch.js'));
    assertRejectedWithoutOutput(sandbox, /ENOENT|no such file/i);
  });
});

test('static build rejects a missing executable HTML entrypoint before writing output', () => {
  withFixture(sandbox => {
    const path = join(sandbox, 'web/index.html');
    const original = readFileSync(path, 'utf8');
    writeFileSync(path, '<!doctype html><html><body>Fixture without a module script</body></html>');
    assert.notEqual(original.length, 0);
    assertRejectedWithoutOutput(sandbox, /Missing browser entrypoint/);
  });
});
