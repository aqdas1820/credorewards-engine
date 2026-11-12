import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = (rateBps, extra = {}) => ({
  id: 'fictional', name: 'Synthetic boundary card', annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps, ...extra }]
});
const transaction = (amountPaise) => ({
  id: 'boundary', month: '2026-01', category: 'synthetic', amountPaise
});

test('100% reward preserves exact maximum safe integer paise', () => {
  const result = calculateRewards(card(10000), [transaction(max)], 2026);
  assert.equal(result.totalSpendPaise, max);
  assert.equal(result.totalRewardsPaise, max);
  assert.equal(result.netAnnualValuePaise, max);
  assert.equal(result.transactions[0].earnedPaise, max);
});

test('one basis point uses integer arithmetic at maximum safe spend', () => {
  const expected = Number(BigInt(max) / 10000n);
  const result = calculateRewards(card(1), [transaction(max)], 2026);
  assert.equal(result.totalRewardsPaise, expected);
  assert.equal(result.transactions[0].reason, 'earned');
});

test('9999 basis points rounds down exactly before applying a cap', () => {
  const expected = Number(BigInt(max) * 9999n / 10000n);
  const uncapped = calculateRewards(card(9999), [transaction(max)], 2026);
  assert.equal(uncapped.totalRewardsPaise, expected);
  const capped = calculateRewards(card(9999, { annualCapPaise: expected - 1 }), [transaction(max)], 2026);
  assert.equal(capped.totalRewardsPaise, expected - 1);
  assert.equal(capped.transactions[0].earnedPaise, expected - 1);
});
