import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (rateBps) => ({
  id: 'synthetic-safe-integer', name: 'Fictional safe-integer boundary',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps }]
});
const transaction = (id, amountPaise) => ({
  id, month: '2026-01', category: 'synthetic', amountPaise
});

test('100% reward at MAX_SAFE_INTEGER remains exact without floating-point loss', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const input = [transaction('max', amount)];
  const snapshot = structuredClone(input);
  const result = calculateRewards(card(10000), input, 2026);
  assert.equal(result.totalSpendPaise, amount);
  assert.equal(result.totalRewardsPaise, amount);
  assert.equal(result.transactions[0].earnedPaise, amount);
  assert.equal(result.netAnnualValuePaise, amount);
  assert.deepEqual(input, snapshot);
});

test('aggregate rewards beyond MAX_SAFE_INTEGER fail closed rather than wrap', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const input = [transaction('a', amount), transaction('b', 1)];
  assert.throws(
    () => calculateRewards(card(10000), input, 2026),
    /safe integer range/
  );
});
