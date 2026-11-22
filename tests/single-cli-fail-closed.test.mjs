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

test('single-card CLI emits parseable deterministic JSON for a fictional valid input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-single-valid-'));
  try {
    const input = join(dir, 'fictional.json');
    writeFileSync(input, JSON.stringify({
      year: 2026,
      card: {
        id: 'fictional', name: 'Fictional Card', annualFeePaise: 0,
        excludedCategories: [],
        rules: [{ id: 'base', category: '*', rateBps: 100 }]
      },
      transactions: [
        { id: 'tx-1', month: '2026-01', category: 'groceries', amountPaise: 10000 }
      ]
    }));
    const first = invoke([input]);
    const second = invoke([input]);
    for (const result of [first, second]) {
      assert.equal(result.status, 0);
      assert.equal(result.stderr, '');
      const report = JSON.parse(result.stdout);
      assert.equal(report.totalRewardsPaise, 100);
    }
    assert.equal(first.stdout, second.stdout, 'CLI output must be deterministic');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
