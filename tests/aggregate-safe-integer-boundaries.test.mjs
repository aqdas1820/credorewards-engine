import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-safe-integer',
  name: 'Synthetic safe integer boundary',
  annualFeePaise: 0,
  rules: [{ id: 'zero', category: '*', rateBps: 0 }]
};

test('accepts a total spend exactly at the maximum safe integer', () => {
  const result = calculateRewards(card, [
    { id: 'a', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER - 1 },
    { id: 'b', month: '2026-02', category: 'other', amountPaise: 1 }
  ], 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, 0);
});

test('rejects aggregate spend overflow even when individual amounts are safe', () => {
  assert.throws(() => calculateRewards(card, [
    { id: 'a', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'b', month: '2026-02', category: 'other', amountPaise: 1 }
  ], 2026), /totalSpendPaise exceeds safe integer range/);
});

test('preserves maximum safe integer reward and fee-waiver totals', () => {
  const terms = {
    ...card,
    annualFeeWaiverThresholdPaise: Number.MAX_SAFE_INTEGER,
    rules: [{ id: 'full', category: '*', rateBps: 10000 }]
  };
  const transactions = [{ id: 'max', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER }];
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.rewardEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.feeWaiverEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.transactions[0].earnedPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(transactions[0].amountPaise, Number.MAX_SAFE_INTEGER);
});
