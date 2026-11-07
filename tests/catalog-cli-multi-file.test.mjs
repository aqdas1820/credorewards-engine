import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'bin', 'credorewards-catalog.mjs');
const example = join(root, 'examples', 'fictional-catalog.json');

function invoke(files) {
  return spawnSync(process.execPath, [cli, ...files], {
    cwd: root, encoding: 'utf8'
  });
}

test('catalog CLI checks all files and preserves valid output on mixed success and error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-mixed-catalog-'));
  try {
    const valid = join(dir, 'valid.json');
    const invalid = join(dir, 'invalid.json');
    const data = JSON.parse(readFileSync(example, 'utf8'));
    writeFileSync(valid, JSON.stringify(data));
    writeFileSync(invalid, JSON.stringify({ ...data, unsupportedField: true }));

    for (const files of [[valid, invalid], [invalid, valid]]) {
      const result = invoke(files);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stdout, /valid catalog metadata/);
      assert.ok(result.stdout.includes(valid + ':'), 'valid file must be reported');
      assert.ok(!result.stdout.includes(invalid + ':'), 'invalid file must never report success');
      assert.ok(result.stderr.includes(invalid + ':'), 'invalid file must include its path');
      assert.match(result.stderr, /JSON Schema:.*additionalProperties/);
      assert.ok(!result.stderr.includes(valid + ':'), 'valid file must not report errors');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catalog CLI rejects all invalid files while reporting each independently', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-invalid-catalogs-'));
  try {
    const malformed = join(dir, 'malformed.json');
    const invalid = join(dir, 'invalid.json');
    writeFileSync(malformed, '{ not JSON');
    writeFileSync(invalid, JSON.stringify({ schemaVersion: 1, revisions: [], typo: true }));
    const result = invoke([malformed, invalid]);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.includes(malformed + ':'));
    assert.ok(result.stderr.includes(invalid + ':'));
    assert.match(result.stderr, /JSON Schema:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
