import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic-safe-integer',
  name: 'Synthetic safe-integer boundary',
  annualFeePaise: 0,
  annualFeeWaiverThresholdPaise: Number.MAX_SAFE_INTEGER,
  rules: [{ id: 'all', category: '*', rateBps: 10000 }]
});
const transaction = (id, amountPaise) => ({
  id, month: '2026-01', category: 'synthetic', amountPaise
});

test('accepts maximum safe integer paise without precision loss', () => {
  const tx = [transaction('max', Number.MAX_SAFE_INTEGER)];
  const result = calculateRewards(card(), tx, 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.rewardEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.feeWaiverEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.transactions[0].earnedPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(tx[0].amountPaise, Number.MAX_SAFE_INTEGER);
});

test('rejects aggregate paise overflow rather than rounded totals', () => {
  const tx = [transaction('a', Number.MAX_SAFE_INTEGER), transaction('b', 1)];
  assert.throws(() => calculateRewards(card(), tx, 2026), /safe integer range/);
  assert.deepEqual(tx.map(t => t.amountPaise), [Number.MAX_SAFE_INTEGER, 1]);
});

test('rejects aggregate overflow even when no cashback rule matches', () => {
  const terms = card();
  terms.rules = [{ id: 'other', category: 'other', rateBps: 100 }];
  const tx = [transaction('a', Number.MAX_SAFE_INTEGER), transaction('b', 1)];
  assert.throws(() => calculateRewards(terms, tx, 2026), /safe integer range/);
});
