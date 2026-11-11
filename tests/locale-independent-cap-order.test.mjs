import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('monthly cap allocation follows code-unit transaction ID order, independent of host locale', () => {
  const card = {
    id: 'synthetic-order',
    name: 'Synthetic order',
    annualFeePaise: 0,
    rules: [{ id: 'all', category: '*', rateBps: 10000, monthlyCapPaise: 100 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'test', amountPaise: 100 },
    { id: 'A', month: '2026-01', category: 'test', amountPaise: 100 }
  ];
  const original = String.prototype.localeCompare;
  try {
    String.prototype.localeCompare = () => { throw new Error('locale collation must not determine reward allocation'); };
    const forward = calculateRewards(card, transactions, 2026);
    const reversed = calculateRewards(card, [...transactions].reverse(), 2026);
    assert.deepEqual(forward.transactions.map(({ id, earnedPaise }) => [id, earnedPaise]), [
      ['A', 100],
      ['a', 0]
    ]);
    assert.deepEqual(reversed.transactions, forward.transactions);
    assert.equal(forward.totalRewardsPaise, 100);
  } finally {
    String.prototype.localeCompare = original;
  }
  assert.equal(transactions[0].id, 'a');
});
