import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = {
  id: 'synthetic-aggregate-overflow',
  name: 'Synthetic aggregate overflow',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 0 }]
};
const transaction = (id, amountPaise) => ({
  id, month: '2026-01', category: 'general', amountPaise
});

test('aggregate spend exactly at maximum safe integer remains exact', () => {
  const transactions = [transaction('a', max - 1), transaction('b', 1)];
  for (const ordered of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card, ordered, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.rewardEligibleSpendPaise, max);
    assert.equal(result.feeWaiverEligibleSpendPaise, max);
    assert.equal(result.totalRewardsPaise, 0);
    assert.equal(result.netAnnualValuePaise, 0);
  }
});

test('aggregate spend above maximum safe integer fails closed in either input order', () => {
  const transactions = [transaction('a', max), transaction('b', 1)];
  for (const ordered of [transactions, [...transactions].reverse()]) {
    assert.throws(() => calculateRewards(card, ordered, 2026),
      /totalSpendPaise exceeds safe integer range/);
  }
});
