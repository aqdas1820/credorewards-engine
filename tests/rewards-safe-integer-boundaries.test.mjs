import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const card = (overrides = {}) => ({
  id: 'synthetic', name: 'Synthetic only', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 1 }], ...overrides
});
const tx = (id, amountPaise, month = '2026-01') => ({
  id, amountPaise, month, category: 'synthetic'
});

test('maximum safe transaction amount uses exact integer bps math', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const result = calculateRewards(card(), [tx('large', amount)], 2026);
  const expected = Number(BigInt(amount) / 10000n);
  assert.equal(result.totalSpendPaise, amount);
  assert.equal(result.rewardEligibleSpendPaise, amount);
  assert.equal(result.totalRewardsPaise, expected);
  assert.equal(result.transactions[0].earnedPaise, expected);
});

test('large reward calculation respects tiny monthly and annual caps', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const capped = card({ rules: [{
    id: 'base', category: '*', rateBps: 10000,
    monthlyCapPaise: 2, annualCapPaise: 2
  }] });
  const result = calculateRewards(capped, [tx('large', amount)], 2026);
  assert.equal(result.totalSpendPaise, amount);
  assert.equal(result.totalRewardsPaise, 2);
  assert.equal(result.transactions[0].earnedPaise, 2);
  assert.equal(result.transactions[0].reason, 'earned');
});

test('fee subtraction near safe-integer boundary is exact and signed', () => {
  const fee = Number.MAX_SAFE_INTEGER;
  const result = calculateRewards(card({
    annualFeePaise: fee, rules: []
  }), [], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeChargedPaise, fee);
  assert.equal(result.netAnnualValuePaise, -fee);
});

test('comparison rejects an unsafe leader gap instead of losing precision', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const best = card({ id: 'best', rules: [] });
  const worst = card({ id: 'worst', annualFeePaise: max, rules: [] });
  assert.equal(compareCards([best, worst], [], 2026).entries[1].differenceFromLeaderPaise, max);
  const earned = card({
    id: 'earned', rules: [{ id: 'full', category: '*', rateBps: 10000 }]
  });
  assert.throws(
    () => compareCards([earned, worst], [tx('large', max)], 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
});
