import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'bin', 'credorewards.mjs');

function invoke(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root, encoding: 'utf8', timeout: 10000
  });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

test('single-card CLI help and missing argument have distinct exit statuses', () => {
  for (const flag of ['--help', '-h']) {
    const result = invoke([flag]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: credorewards/);
    assert.equal(result.stderr, '');
  }
  const missing = invoke([]);
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /Usage: credorewards/);
  assert.equal(missing.stderr, '');
});

test('single-card CLI rejects unreadable and malformed input without success output or stack traces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-single-cli-'));
  try {
    const malformed = join(dir, 'malformed.json');
    const absent = join(dir, 'absent.json');
    writeFileSync(malformed, '{');
    for (const path of [malformed, absent]) {
      const result = invoke([path]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /CredoRewards error:/);
      assert.doesNotMatch(result.stderr, /\\n\\s+at\\s/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
