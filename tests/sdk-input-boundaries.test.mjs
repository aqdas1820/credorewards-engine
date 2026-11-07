import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic', name: 'Synthetic card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const transaction = (overrides = {}) => ({
  id: 'purchase', month: '2026-01', category: 'general', amountPaise: 10000,
  ...overrides
});

test('rejects malformed card and transaction collections before arithmetic', () => {
  for (const invalid of [null, {}, 'not an array']) {
    assert.throws(() => calculateRewards(card(), invalid, 2026), /transactions must be an array/);
  }
  for (const invalid of [null, {}, 'not an array']) {
    assert.throws(() => calculateRewards({ ...card(), rules: invalid }, [], 2026), /card.rules must be an array/);
  }
  assert.throws(() => calculateRewards(card(), [null], 2026), /invalid transaction/);
  assert.throws(() => calculateRewards({ ...card(), rules: [null] }, [], 2026), /invalid rule/);
});

test('rejects unsafe or non-integer paise and reward rates', () => {
  for (const amountPaise of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateRewards(card(), [transaction({ amountPaise })], 2026), /non-negative safe integer/);
  }
  for (const rateBps of [-1, 0.1, 10001, NaN, Infinity]) {
    assert.throws(() => calculateRewards({ ...card(), rules: [{ id: 'base', category: '*', rateBps }] }, [], 2026), /rateBps/);
  }
  assert.throws(() => calculateRewards({ ...card(), annualFeePaise: Number.MAX_SAFE_INTEGER + 1 }, [], 2026), /annualFeePaise/);
});

test('rejects invalid calendar years and month boundaries', () => {
  for (const year of [1999, 2101, 2026.5, NaN, Infinity]) {
    assert.throws(() => calculateRewards(card(), [], year), /year must be an integer/);
  }
  for (const month of ['2026-00', '2026-13', '2026-1', '2025-12', '2026-01-01']) {
    assert.throws(() => calculateRewards(card(), [transaction({ month })], 2026), /month must be YYYY-MM/);
  }
  assert.equal(calculateRewards(card(), [transaction({ month: '2026-12' })], 2026).totalRewardsPaise, 100);
});

test('rejects duplicate candidate cards instead of ranking one twice', () => {
  assert.throws(() => compareCards([card(), { ...card(), name: 'Same identifier' }], [transaction()], 2026), /duplicate card id/);
});
