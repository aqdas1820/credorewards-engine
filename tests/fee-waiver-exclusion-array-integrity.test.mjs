import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = { id: 'synthetic-1', month: '2026-01', category: 'groceries', amountPaise: 100 };

function fictionalCard() {
  return {
    id: 'synthetic-card',
    name: 'Fictional exclusion-array validation',
    annualFeePaise: 100,
    annualFeeWaiverThresholdPaise: 100,
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  };
}

test('fee-waiver exclusion arrays reject sparse and inherited slots', () => {
  for (const inherited of [false, true]) {
    const categories = new Array(1);
    if (inherited) Object.setPrototypeOf(categories, Object.assign(Object.create(Array.prototype), { 0: 'groceries' }));
    const card = { ...fictionalCard(), feeWaiverExcludedCategories: categories };
    assert.throws(() => calculateRewards(card, [transaction], 2026), /feeWaiverExcludedCategories must be a string array/);
    assert.equal(Object.hasOwn(categories, 0), false);
  }
});

test('fee-waiver exclusion validation does not trust caller-provided array iterator', () => {
  const categories = ['groceries'];
  Object.defineProperty(categories, Symbol.iterator, {
    value() { throw new Error('untrusted iterator executed'); },
    configurable: true
  });
  const card = { ...fictionalCard(), feeWaiverExcludedCategories: categories };
  const result = calculateRewards(card, [transaction], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 100);
  assert.equal(result.totalRewardsPaise, 1);
  assert.equal(categories[0], 'groceries');
});
