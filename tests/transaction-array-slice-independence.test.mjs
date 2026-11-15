import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-slice-independence',
  name: 'Synthetic slice independence',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 1000 }]
};

test('validated transaction arrays never execute an overridden slice', () => {
  const transactions = [
    { id: 'b', month: '2026-02', category: 'groceries', amountPaise: 1000 },
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 2000 }
  ];
  Object.defineProperty(transactions, 'slice', {
    value() { throw new Error('caller slice must not execute'); }
  });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 3000);
  assert.equal(result.totalRewardsPaise, 300);
  assert.deepEqual(result.transactions.map(tx => tx.id), ['a', 'b']);
});

test('overridden slice cannot inject a transaction after validation', () => {
  const transactions = [
    { id: 'valid', month: '2026-01', category: 'groceries', amountPaise: 1000 }
  ];
  let called = false;
  Object.defineProperty(transactions, 'slice', {
    value() {
      called = true;
      return [{ id: 'injected', month: '2026-01', category: 'groceries', amountPaise: 999999 }];
    }
  });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(called, false);
  assert.equal(result.totalSpendPaise, 1000);
  assert.equal(result.totalRewardsPaise, 100);
  assert.deepEqual(result.transactions.map(tx => tx.id), ['valid']);
});
