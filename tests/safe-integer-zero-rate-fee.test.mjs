import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const MAX = Number.MAX_SAFE_INTEGER;
const card = (overrides = {}) => ({
  id: 'fictional-extreme-fee', name: 'Synthetic boundary card',
  annualFeePaise: 0,
  rules: [{ id: 'zero', category: '*', rateBps: 0 }],
  ...overrides
});

test('zero-rate rule preserves maximum safe spend without phantom rewards', () => {
  const transactions = [{ id: 'maximum', month: '2026-12', category: 'synthetic', amountPaise: MAX }];
  const snapshot = structuredClone(transactions);
  const result = calculateRewards(card(), transactions, 2026);
  assert.equal(result.totalSpendPaise, MAX);
  assert.equal(result.rewardEligibleSpendPaise, MAX);
  assert.equal(result.feeWaiverEligibleSpendPaise, MAX);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.equal(result.transactions[0].matchedRuleId, 'zero');
  assert.equal(result.transactions[0].reason, 'zero_reward');
  assert.deepEqual(transactions, snapshot);
});

test('maximum safe annual fee produces exact negative net value with no spend', () => {
  const terms = card({ annualFeePaise: MAX });
  const snapshot = structuredClone(terms);
  const result = calculateRewards(terms, [], 2026);
  assert.equal(result.totalSpendPaise, 0);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, MAX);
  assert.equal(result.netAnnualValuePaise, -MAX);
  assert.deepEqual(terms, snapshot);
});
