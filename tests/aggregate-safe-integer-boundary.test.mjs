import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = Object.freeze({
  id: 'synthetic-overflow',
  name: 'Synthetic aggregate boundary',
  annualFeePaise: 0,
  rules: [Object.freeze({ id: 'base', category: '*', rateBps: 0 })]
});
const tx = (id, amountPaise) => Object.freeze({
  id, month: '2026-01', category: 'general', amountPaise
});

test('aggregate spend at MAX_SAFE_INTEGER remains exact across transactions', () => {
  const transactions = Object.freeze([tx('a', max - 1), tx('b', 1)]);
  const snapshot = JSON.stringify(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, max);
  assert.equal(result.rewardEligibleSpendPaise, max);
  assert.equal(result.feeWaiverEligibleSpendPaise, max);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.equal(JSON.stringify(transactions), snapshot);
});

test('aggregate spend beyond MAX_SAFE_INTEGER fails closed without changing input', () => {
  const transactions = Object.freeze([tx('a', max), tx('b', 1)]);
  const snapshot = JSON.stringify(transactions);
  assert.throws(
    () => calculateRewards(card, transactions, 2026),
    /totalSpendPaise exceeds safe integer range/
  );
  assert.equal(JSON.stringify(transactions), snapshot);
  assert.throws(
    () => calculateRewards(card, [...transactions].reverse(), 2026),
    /totalSpendPaise exceeds safe integer range/
  );
});
