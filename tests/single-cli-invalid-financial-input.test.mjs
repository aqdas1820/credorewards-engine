import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cli = fileURLToPath(new URL('../bin/credorewards.mjs', import.meta.url));

test('single-card CLI fails closed on syntactically valid but unsafe financial inputs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'credorewards-invalid-finance-'));
  const card = {
    id: 'fictional', name: 'Fictional Card', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  };
  const transaction = {
    id: 'tx-1', month: '2026-01', category: 'groceries', amountPaise: 10000
  };
  try {
    const cases = [
      { name: 'fractional-amount', transactions: [{ ...transaction, amountPaise: 100.5 }] },
      { name: 'unsafe-integer', transactions: [{ ...transaction, amountPaise: Number.MAX_SAFE_INTEGER + 1 }] },
      { name: 'duplicate-ids', transactions: [transaction, { ...transaction }] }
    ];
    for (const scenario of cases) {
      const input = join(directory, scenario.name + '.json');
      writeFileSync(input, JSON.stringify({ year: 2026, card, transactions: scenario.transactions }));
      const result = spawnSync(process.execPath, [cli, input], {
        encoding: 'utf8', timeout: 10000
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null);
      assert.equal(result.status, 1, scenario.name);
      assert.equal(result.stdout, '', scenario.name + ': no successful report');
      assert.match(result.stderr, /CredoRewards error:/, scenario.name);
      assert.doesNotMatch(result.stderr, /\n\s+at\s/, scenario.name + ': no stack trace');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
