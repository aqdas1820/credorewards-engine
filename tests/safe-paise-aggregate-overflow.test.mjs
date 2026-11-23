import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const tx = Object.freeze([
  Object.freeze({ id: 'a', month: '2026-01', category: 'groceries', amountPaise: max }),
  Object.freeze({ id: 'b', month: '2026-02', category: 'groceries', amountPaise: 1 })
]);

function card(overrides = {}) {
  return Object.freeze({
    id: 'synthetic-overflow',
    name: 'Synthetic overflow boundary',
    annualFeePaise: 0,
    rules: Object.freeze([Object.freeze({ id: 'all', category: '*', rateBps: 0 })]),
    ...overrides
  });
}

test('aggregate spend exceeding safe integer range fails closed rather than rounding', () => {
  assert.throws(() => calculateRewards(card(), tx, 2026), /totalSpendPaise exceeds safe integer range/);
  assert.equal(tx[0].amountPaise, max);
});

test('exact maximum safe aggregate spend remains representable', () => {
  const result = calculateRewards(card(), [tx[0]], 2026);
  assert.equal(result.totalSpendPaise, max);
  assert.equal(result.rewardEligibleSpendPaise, max);
  assert.equal(result.feeWaiverEligibleSpendPaise, max);
  assert.equal(result.totalRewardsPaise, 0);
});

test('fee-waiver eligible spend overflow fails closed even if total spend also overflows', () => {
  const result = () => calculateRewards(card({
    feeWaiverExcludedCategories: Object.freeze(['groceries'])
  }), tx, 2026);
  assert.throws(result, /totalSpendPaise exceeds safe integer range/);
});

test('unsafe per-transaction amounts are rejected before calculation', () => {
  const invalid = [{ id: 'bad', month: '2026-01', category: 'groceries', amountPaise: max + 1 }];
  assert.throws(() => calculateRewards(card(), invalid, 2026), /non-negative safe integer/);
});
