import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-zero-ledger',
  name: 'Synthetic zero-amount cap ledger',
  annualFeePaise: 0,
  rules: [{
    id: 'general',
    category: '*',
    rateBps: 10000,
    monthlyCapPaise: 5,
    annualCapPaise: 8
  }]
};

const transaction = (id, month, amountPaise) => ({
  id, month, amountPaise, category: 'general'
});

test('zero-amount transactions across months do not consume monthly or annual reward caps', () => {
  const transactions = [
    transaction('feb-zero', '2026-02', 0),
    transaction('jan-zero', '2026-01', 0),
    transaction('mar-paid', '2026-03', 5),
    transaction('jan-paid', '2026-01', 5),
    transaction('feb-paid', '2026-02', 5)
  ];
  const before = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(row => [row.id, row.earnedPaise]), [
    ['jan-paid', 5],
    ['jan-zero', 0],
    ['feb-paid', 3],
    ['feb-zero', 0],
    ['mar-paid', 0]
  ]);
  assert.equal(result.totalSpendPaise, 15);
  assert.equal(result.totalRewardsPaise, 8);
  assert.deepEqual(transactions, before);
});
