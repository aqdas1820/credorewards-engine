import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

// Large safe-integer inputs must not be multiplied using floating-point
// arithmetic before applying paise-denominated monthly/annual caps.
test('large safe-integer spends respect independent monthly and annual caps', () => {
  const card = {
    id: 'synthetic-capped', name: 'Synthetic capped card',
    annualFeePaise: 15,
    rules: [{ id: 'large', category: '*', rateBps: 10000,
      monthlyCapPaise: 7, annualCapPaise: 10 }]
  };
  const transactions = [
    { id: 'feb', month: '2026-02', category: 'other', amountPaise: 4000000000000000 },
    { id: 'jan', month: '2026-01', category: 'other', amountPaise: 4000000000000000 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 8000000000000000);
  assert.equal(result.rewardEligibleSpendPaise, 8000000000000000);
  assert.equal(result.totalRewardsPaise, 10);
  assert.equal(result.annualFeeChargedPaise, 15);
  assert.equal(result.netAnnualValuePaise, -5);
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]),
    [['jan', 7, 'earned'], ['feb', 3, 'earned']]);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
});

test('aggregate spending beyond safe integer range fails closed', () => {
  const card = {
    id: 'synthetic-overflow', name: 'Synthetic overflow card',
    annualFeePaise: 0,
    rules: [{ id: 'zero', category: '*', rateBps: 0 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'b', month: '2026-02', category: 'other', amountPaise: 1 }
  ];
  assert.throws(() => calculateRewards(card, transactions, 2026), /totalSpendPaise exceeds safe integer range/);
  const other = { ...card, id: 'synthetic-overflow-two' };
  assert.throws(() => compareCards([card, other], transactions, 2026), /totalSpendPaise exceeds safe integer range/);
});
