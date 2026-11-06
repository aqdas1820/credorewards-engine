import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const card = () => ({
  id: 'fictional', name: 'Synthetic Card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const tx = () => ({ id: 'synthetic', month: '2026-01', category: 'groceries', amountPaise: 100 });

test('rejects unsafe, fractional and negative annual fees and waiver thresholds', () => {
  for (const amount of [-1, 0.1, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1, '100', null]) {
    assert.throws(() => calculateRewards({ ...card(), annualFeePaise: amount }, [], 2026),
      /annualFeePaise must be a non-negative safe integer/);
    assert.throws(() => calculateRewards({
      ...card(), annualFeeWaiverThresholdPaise: amount
    }, [], 2026), /annualFeeWaiverThresholdPaise must be a non-negative safe integer/);
  }
});

test('rejects invalid optional reward thresholds and caps', () => {
  for (const key of ['minTransactionPaise', 'monthlyCapPaise', 'annualCapPaise']) {
    for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0']) {
      const terms = card();
      terms.rules = [{ ...terms.rules[0], [key]: value }];
      assert.throws(() => calculateRewards(terms, [], 2026),
        new RegExp(key + ' must be a non-negative safe integer'));
    }
  }
});

test('rejects invalid cashback basis-point values without clamping', () => {
  for (const value of [-1, 0.1, 10000.5, 10001, NaN, Infinity, '100', null]) {
    const terms = card();
    terms.rules = [{ ...terms.rules[0], rateBps: value }];
    assert.throws(() => calculateRewards(terms, [], 2026),
      /rateBps must be an integer from 0 to 10000/);
  }
});

test('rejects malformed optional category exclusions and malformed rules', () => {
  for (const key of ['excludedCategories', 'feeWaiverExcludedCategories']) {
    for (const value of [null, 'rent', [null], [''], ['valid', 5]]) {
      assert.throws(() => calculateRewards({ ...card(), [key]: value }, [], 2026),
        new RegExp(key + ' must be a string array'));
    }
  }
  for (const rules of [null, {}, 'rules']) {
    assert.throws(() => calculateRewards({ ...card(), rules }, [], 2026),
      /card.rules must be an array/);
  }
  for (const rule of [null, false, 7]) {
    assert.throws(() => calculateRewards({ ...card(), rules: [rule] }, [], 2026),
      /invalid rule/);
  }
});

test('rejects invalid transaction shape and money even when card earns no rewards', () => {
  const noRules = { ...card(), rules: [] };
  for (const amount of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
    assert.throws(() => calculateRewards(noRules, [{ ...tx(), amountPaise: amount }], 2026),
      /amountPaise must be a non-negative safe integer/);
  }
  for (const invalid of [null, false, 5]) {
    assert.throws(() => calculateRewards(noRules, [invalid], 2026), /invalid transaction/);
  }
  for (const invalid of [null, {}, 'transactions']) {
    assert.throws(() => calculateRewards(noRules, invalid, 2026),
      /transactions must be an array/);
  }
});

test('rejects invalid evaluation years and month boundaries', () => {
  for (const year of [1999, 2101, 2026.5, NaN, Infinity, '2026', null]) {
    assert.throws(() => calculateRewards(card(), [], year), /year must be an integer/);
  }
  for (const month of ['2026-00', '2026-13', '2026-1', '2026-01-01',
    '2025-12', '2027-01', ' 2026-01']) {
    assert.throws(() => calculateRewards(card(), [{ ...tx(), month }], 2026),
      /month must be YYYY-MM in 2026/);
  }
});

test('invalid candidate input fails the whole comparison rather than ranking partial cards', () => {
  const valid = card();
  const invalid = { ...card(), id: 'invalid', annualFeePaise: -1 };
  assert.throws(() => compareCards([valid, invalid], [tx()], 2026),
    /annualFeePaise must be a non-negative safe integer/);
  assert.throws(() => compareCards([valid, { ...card(), id: 'bad', rules: null }], [tx()], 2026),
    /card.rules must be an array/);
});
