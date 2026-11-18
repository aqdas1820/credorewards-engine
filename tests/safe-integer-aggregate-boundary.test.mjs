import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('aggregate spend exceeding safe integer range fails closed', () => {
  const card = {
    id: 'synthetic-overflow',
    name: 'Fictional overflow guard',
    annualFeePaise: 0,
    excludedCategories: [],
    rules: [{ id: 'base', category: '*', rateBps: 0 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'general', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'b', month: '2026-02', category: 'general', amountPaise: 1 }
  ];
  const original = structuredClone(transactions);
  assert.throws(
    () => calculateRewards(card, transactions, 2026),
    /totalSpendPaise exceeds safe integer range/
  );
  assert.deepEqual(transactions, original);
});

test('safe integer boundary remains representable without overflow', () => {
  const card = {
    id: 'synthetic-boundary',
    name: 'Fictional boundary guard',
    annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 0 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'general', amountPaise: Number.MAX_SAFE_INTEGER - 1 },
    { id: 'b', month: '2026-02', category: 'general', amountPaise: 1 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.rewardEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.feeWaiverEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, 0);
});
