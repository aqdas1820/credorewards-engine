import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// All amounts are synthetic integer paise. No issuer-specific assumptions.
const card = {
  id: 'cap-boundary-fictional',
  name: 'Fictional cap boundary',
  annualFeePaise: 0,
  rules: [{
    id: 'flat',
    category: '*',
    rateBps: 10000,
    monthlyCapPaise: 101,
    annualCapPaise: 202
  }]
};

const transaction = (id, month, amountPaise) => ({
  id, month, category: 'synthetic', amountPaise
});

test('monthly cap allocates the final paisa exactly once, independent of input order', () => {
  const transactions = [
    transaction('b', '2026-01', 100),
    transaction('a', '2026-01', 100)
  ];
  const forward = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.deepEqual(forward, reversed);
  assert.equal(forward.totalRewardsPaise, 101);
  assert.equal(forward.transactions.reduce((sum, item) => sum + item.earnedPaise, 0), 101);
});

test('annual cap consumes only one final paisa in a later month', () => {
  const transactions = [
    transaction('jan', '2026-01', 101),
    transaction('feb', '2026-02', 100),
    transaction('mar', '2026-03', 100)
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 202);
  assert.equal(result.netAnnualValuePaise, 202);
  assert.equal(result.transactions.reduce((sum, item) => sum + item.earnedPaise, 0), 202);
  assert.deepEqual(result, calculateRewards(card, [...transactions].reverse(), 2026));
});
