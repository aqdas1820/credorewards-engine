import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

function fictionalCard(threshold) {
  return {
    id: 'synthetic-zero-spend',
    name: 'Fictional zero-spend fee waiver',
    annualFeePaise: 125,
    ...(threshold === undefined ? {} : { annualFeeWaiverThresholdPaise: threshold }),
    rules: [{ id: 'zero', category: '*', rateBps: 0 }]
  };
}

test('an explicit zero-paise waiver threshold waives fees even with no transactions', () => {
  const result = calculateRewards(fictionalCard(0), [], 2026);
  assert.equal(result.totalSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
});

test('absent and positive waiver thresholds do not waive a zero-spend annual fee', () => {
  for (const threshold of [undefined, 1]) {
    const result = calculateRewards(fictionalCard(threshold), [], 2026);
    assert.equal(result.annualFeeWaived, false);
    assert.equal(result.annualFeeChargedPaise, 125);
    assert.equal(result.netAnnualValuePaise, -125);
  }
});
