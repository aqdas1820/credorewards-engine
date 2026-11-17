import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Synthetic inputs only. Financial totals must never silently lose paise precision.
const card = {
  id: 'synthetic-safe-integer-boundaries',
  name: 'Synthetic integer boundary',
  annualFeePaise: 0,
  rules: [{ id: 'fallback', category: '*', rateBps: 0 }]
};

test('largest safe transaction amount remains exact in every spend ledger', () => {
  const transactions = [
    { id: 'max', month: '2026-01', category: 'groceries', amountPaise: Number.MAX_SAFE_INTEGER }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.rewardEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.feeWaiverEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].earnedPaise, 0);
});

test('sum of individually safe transactions exceeding safe integer range is rejected', () => {
  const transactions = [
    { id: 'first', month: '2026-01', category: 'groceries', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'second', month: '2026-02', category: 'groceries', amountPaise: 1 }
  ];
  assert.throws(
    () => calculateRewards(card, transactions, 2026),
    /totalSpendPaise exceeds safe integer range/
  );
});

test('individual unsafe paise input is rejected before arithmetic', () => {
  const transactions = [
    { id: 'unsafe', month: '2026-01', category: 'groceries', amountPaise: Number.MAX_SAFE_INTEGER + 1 }
  ];
  assert.throws(
    () => calculateRewards(card, transactions, 2026),
    /amountPaise must be a non-negative safe integer/
  );
});
