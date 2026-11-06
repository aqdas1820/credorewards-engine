import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const card = (id = 'synthetic') => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const tx = (id, month = '2026-01') => ({
  id, month, category: 'general', amountPaise: 10000
});

test('duplicate transaction IDs fail closed across calculation, comparison and batch', () => {
  const transactions = [tx('duplicate'), tx('duplicate', '2026-02')];
  assert.throws(() => calculateRewards(card(), transactions, 2026),
    /duplicate transaction id: duplicate/);
  assert.throws(() => compareCards([card('a'), card('b')], transactions, 2026),
    /duplicate transaction id: duplicate/);
  assert.throws(() => createBatchReport([{
    id: 'case', year: 2026, cards: [card('a'), card('b')], transactions
  }]), /duplicate transaction id: duplicate/);
});

test('duplicate rule IDs are rejected before rewards can be attributed', () => {
  const terms = card();
  terms.rules.push({ id: 'base', category: 'groceries', rateBps: 200 });
  assert.throws(() => calculateRewards(terms, [tx('one')], 2026),
    /duplicate rule id: base/);
});

test('malformed and cross-year months reject rather than silently shifting spend', () => {
  for (const month of ['2026-00', '2026-13', '2025-12', '2027-01', '2026-1', '2026-01-01']) {
    assert.throws(() => calculateRewards(card(), [tx('one', month)], 2026),
      /transaction\[one\]\.month must be YYYY-MM in 2026/, month);
  }
});

test('invalid years and negative amounts fail before financial reporting', () => {
  for (const year of [1999, 2101, 2026.5, NaN]) {
    assert.throws(() => calculateRewards(card(), [], year),
      /year must be an integer 2000/, String(year));
  }
  assert.throws(() => calculateRewards(card(), [{
    ...tx('negative'), amountPaise: -1
  }], 2026), /transaction\[negative\]\.amountPaise must be a non-negative safe integer/);
});
