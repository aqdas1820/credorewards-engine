import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic-valid', name: 'Synthetic Valid', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const tx = () => [{ id: 't1', month: '2026-01', category: 'groceries', amountPaise: 100 }];
const withRule = (changes) => ({ ...card(), rules: [{ ...card().rules[0], ...changes }] });

test('rejects unsafe or malformed monetary and basis-point fields before calculating', () => {
  const badPaise = [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '100', null];
  for (const value of badPaise) {
    assert.throws(() => calculateRewards({ ...card(), annualFeePaise: value }, tx(), 2026), /card\.annualFeePaise/);
    assert.throws(() => calculateRewards({ ...card(), annualFeeWaiverThresholdPaise: value }, tx(), 2026), /card\.annualFeeWaiverThresholdPaise/);
    assert.throws(() => calculateRewards(card(), [{ ...tx()[0], amountPaise: value }], 2026), /amountPaise/);
    for (const field of ['minTransactionPaise', 'monthlyCapPaise', 'annualCapPaise']) {
      assert.throws(() => calculateRewards(withRule({ [field]: value }), tx(), 2026), new RegExp(field));
    }
  }
  for (const rateBps of [-1, 10001, 0.5, NaN, Infinity, '500', null]) {
    assert.throws(() => calculateRewards(withRule({ rateBps }), tx(), 2026), /rateBps/);
  }
});

test('rejects duplicate IDs, invalid calendar months and out-of-range years', () => {
  assert.throws(() => calculateRewards(card(), [tx()[0], { ...tx()[0] }], 2026), /duplicate transaction id/);
  assert.throws(() => calculateRewards({ ...card(), rules: [card().rules[0], card().rules[0]] }, tx(), 2026), /duplicate rule id/);
  for (const month of ['2026-00', '2026-13', '2025-12', '2026-1', '2026-01-01', 'not-a-month']) {
    assert.throws(() => calculateRewards(card(), [{ ...tx()[0], month }], 2026), /month must be YYYY-MM/);
  }
  for (const year of [1999, 2101, 2026.5, NaN, '2026']) {
    assert.throws(() => calculateRewards(card(), tx(), year), /year must be an integer/);
  }
});

test('invalid input is rejected consistently by single-card and comparison APIs', () => {
  const invalid = { ...card(), excludedCategories: ['groceries', ''] };
  assert.throws(() => calculateRewards(invalid, tx(), 2026), /excludedCategories/);
  assert.throws(() => compareCards([card(), invalid], tx(), 2026), /excludedCategories/);
  const badTx = [{ ...tx()[0], amountPaise: -1 }];
  assert.throws(() => calculateRewards(card(), badTx, 2026), /amountPaise/);
  assert.throws(() => compareCards([card(), { ...card(), id: 'other' }], badTx, 2026), /amountPaise/);
});
