import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/credorewards-catalog.mjs', import.meta.url));
const valid = fileURLToPath(new URL('../examples/fictional-catalog.json', import.meta.url));

test('catalog CLI validates all files after malformed JSON and returns failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-catalog-cli-'));
  try {
    const malformed = join(dir, 'malformed.json');
    writeFileSync(malformed, '{"schemaVersion":1,"revisions":[');
    const result = spawnSync(process.execPath, [cli, valid, malformed, valid], {
      encoding: 'utf8', timeout: 15000
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.equal(result.stdout.split('valid catalog metadata').length - 1, 2,
      'both valid inputs must be processed despite an intervening failure');
    assert.match(result.stderr, /malformed\.json: /);
    assert.doesNotMatch(result.stderr, /\n\s+at /,
      'expected input errors should not expose stack traces');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catalog CLI exits successfully for a valid fixture', () => {
  const result = spawnSync(process.execPath, [cli, valid], {
    encoding: 'utf8', timeout: 15000
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid catalog metadata/);
  assert.equal(result.stderr, '');
});
