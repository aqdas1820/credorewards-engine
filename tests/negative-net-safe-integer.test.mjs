import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (annualFeePaise) => ({
  id: 'synthetic-negative-net-boundary',
  name: 'Synthetic negative net boundary',
  annualFeePaise,
  rules: [{ id: 'all', category: '*', rateBps: 10000 }]
});

test('maximum safe annual fee produces exact negative net value with no spend', () => {
  const result = calculateRewards(card(Number.MAX_SAFE_INTEGER), [], 2026);
  assert.equal(result.annualFeeChargedPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.netAnnualValuePaise, -Number.MAX_SAFE_INTEGER);
});

test('one paisa reward offsets maximum safe annual fee exactly', () => {
  const result = calculateRewards(card(Number.MAX_SAFE_INTEGER), [
    { id: 'one', month: '2026-12', category: 'general', amountPaise: 1 }
  ], 2026);
  assert.equal(result.totalSpendPaise, 1);
  assert.equal(result.totalRewardsPaise, 1);
  assert.equal(result.annualFeeChargedPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.netAnnualValuePaise, 1 - Number.MAX_SAFE_INTEGER);
});
