import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const baseCard = Object.freeze({
  id: 'synthetic-validation',
  name: 'Synthetic validation card',
  annualFeePaise: 10,
  rules: Object.freeze([Object.freeze({ id: 'all', category: '*', rateBps: 500 })])
});
const baseTx = Object.freeze({ id: 'one', month: '2026-01', category: 'groceries', amountPaise: 100 });

test('runtime rejects malformed money and rate fields before calculating rewards', () => {
  const invalidPaise = [-1, 0.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '100', null];
  for (const amountPaise of invalidPaise) {
    assert.throws(
      () => calculateRewards(baseCard, [{ ...baseTx, amountPaise }], 2026),
      /transaction\[one\]\.amountPaise must be a non-negative safe integer/,
      `transaction amount ${String(amountPaise)}`
    );
    assert.throws(
      () => calculateRewards({ ...baseCard, annualFeePaise: amountPaise }, [baseTx], 2026),
      /card\.annualFeePaise must be a non-negative safe integer/,
      `annual fee ${String(amountPaise)}`
    );
  }

  for (const rateBps of [-1, 10001, 1.5, Number.NaN, Infinity, '500', null]) {
    assert.throws(
      () => calculateRewards({ ...baseCard, rules: [{ id: 'all', category: '*', rateBps }] }, [baseTx], 2026),
      /rateBps must be an integer from 0 to 10000/,
      `rate ${String(rateBps)}`
    );
  }
});

test('runtime rejects malformed exclusion arrays, rule IDs and transaction months', () => {
  for (const excludedCategories of [null, 'groceries', [''], ['groceries', 3]]) {
    assert.throws(
      () => calculateRewards({ ...baseCard, excludedCategories }, [baseTx], 2026),
      /card\.excludedCategories must be a string array/
    );
  }
  assert.throws(
    () => calculateRewards({ ...baseCard, rules: [...baseCard.rules, { ...baseCard.rules[0] }] }, [baseTx], 2026),
    /duplicate rule id: all/
  );
  for (const month of ['2026-00', '2026-13', '2025-12', '2026-1', '2026-01-01']) {
    assert.throws(
      () => calculateRewards(baseCard, [{ ...baseTx, month }], 2026),
      /transaction\[one\]\.month must be YYYY-MM in 2026/
    );
  }
  assert.throws(
    () => compareCards([baseCard, { ...baseCard }], [baseTx], 2026),
    /duplicate card id: synthetic-validation/
  );
  assert.equal(calculateRewards(baseCard, [baseTx], 2026).totalRewardsPaise, 5);
  assert.equal(baseCard.rules[0].rateBps, 500);
  assert.equal(baseTx.amountPaise, 100);
});
