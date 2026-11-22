import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('../bin/credorewards-batch.mjs', import.meta.url));
const fixture = fileURLToPath(new URL('../examples/fictional-batch.json', import.meta.url));

function invoke() {
  return spawnSync(process.execPath, [cli, fixture], {
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 1024 * 1024
  });
}

test('batch CLI emits deterministic parseable JSON for multiple fictional scenarios', () => {
  const first = invoke();
  const second = invoke();

  for (const result of [first, second]) {
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const report = JSON.parse(result.stdout);
    assert.ok(report && typeof report === 'object');
    assert.ok(result.stdout.trim().length > 0);
  }

  assert.equal(first.stdout, second.stdout, 'identical fictional input must produce identical bytes');
});
