import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/credorewards-batch.mjs', import.meta.url));
const valid = fileURLToPath(new URL('../examples/fictional-batch.json', import.meta.url));

function run(...args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8', timeout: 15000
  });
  assert.equal(result.error, undefined);
  return result;
}

test('batch CLI produces parseable JSON without diagnostics for synthetic input', () => {
  const result = run(valid);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.ok(Array.isArray(report.scenarios));
  assert.ok(report.scenarios.length > 0);
});

test('batch CLI fails closed on malformed JSON without partial stdout or stack traces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-batch-cli-'));
  try {
    const malformed = join(dir, 'malformed.json');
    writeFileSync(malformed, '{"scenarios":[');
    const result = run(malformed);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /CredoRewards batch error:/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('batch CLI help and missing argument have distinct documented exit codes', () => {
  for (const flag of ['--help', '-h']) {
    const result = run(flag);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: credorewards-batch/);
    assert.equal(result.stderr, '');
  }
  const missing = run();
  assert.equal(missing.status, 2);
  assert.match(missing.stdout, /Usage: credorewards-batch/);
  assert.equal(missing.stderr, '');
});
