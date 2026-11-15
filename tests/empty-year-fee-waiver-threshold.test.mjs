import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const baseCard = {
  id: 'synthetic-empty-year',
  name: 'Synthetic empty year',
  annualFeePaise: 750,
  rules: [{ id: 'all', category: '*', rateBps: 500 }]
};

test('zero fee-waiver threshold waives the fee for an empty complete year', () => {
  const result = calculateRewards({
    ...baseCard,
    annualFeeWaiverThresholdPaise: 0
  }, [], 2026);
  assert.equal(result.totalSpendPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.deepEqual(result.transactions, []);
});

test('absent and positive thresholds do not waive the fee for an empty year', () => {
  for (const threshold of [undefined, 1, Number.MAX_SAFE_INTEGER]) {
    const result = calculateRewards({
      ...baseCard,
      ...(threshold === undefined ? {} : { annualFeeWaiverThresholdPaise: threshold })
    }, [], 2026);
    assert.equal(result.annualFeeWaived, false);
    assert.equal(result.annualFeeChargedPaise, 750);
    assert.equal(result.netAnnualValuePaise, -750);
    assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  }
});
