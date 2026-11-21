import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const batch = join(root, 'bin', 'credorewards-batch.mjs');
const catalog = join(root, 'bin', 'credorewards-catalog.mjs');

function invoke(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: 'utf8', timeout: 10000
  });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

test('batch CLI fails closed for missing, malformed and invalid scenario input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-cli-batch-'));
  try {
    const malformed = join(dir, 'malformed.json');
    const invalid = join(dir, 'invalid.json');
    writeFileSync(malformed, '{');
    writeFileSync(invalid, JSON.stringify({ scenarios: null }));
    assert.equal(invoke(batch, []).status, 2);
    assert.equal(invoke(batch, ['--help']).status, 0);
    for (const path of [malformed, invalid]) {
      const result = invoke(batch, [path]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /CredoRewards batch error:/);
      assert.doesNotMatch(result.stderr, /\n\s+at\s/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catalog CLI reports each invalid file and exits nonzero without stack traces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-cli-catalog-'));
  try {
    const malformed = join(dir, 'malformed.json');
    const invalid = join(dir, 'invalid.json');
    writeFileSync(malformed, '{');
    writeFileSync(invalid, JSON.stringify({ schemaVersion: 1, revisions: [] }));
    assert.equal(invoke(catalog, []).status, 2);
    assert.equal(invoke(catalog, ['--help']).status, 0);
    const result = invoke(catalog, [malformed, invalid]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.includes(malformed + ':'), 'Missing malformed-file diagnostic');
    assert.ok(result.stderr.includes(invalid + ':'), 'Missing invalid-file diagnostic');
    assert.doesNotMatch(result.stderr, /\n\s+at\s/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
