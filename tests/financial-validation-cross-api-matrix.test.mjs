import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const card = id => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const tx = () => [{ id: 'one', month: '2026-01', category: 'synthetic', amountPaise: 100 }];
const cards = () => [card('a'), card('b')];
const scenario = (id, terms, transactions) => ({ id, year: 2026, cards: terms, transactions });

function rejectAcrossEntryPoints(terms, transactions, pattern) {
  assert.throws(() => calculateRewards(terms[0], transactions, 2026), pattern);
  assert.throws(() => compareCards(terms, transactions, 2026), pattern);
  assert.throws(() => createBatchReport([scenario('invalid', terms, transactions)]), pattern);
  // A valid preceding scenario must not cause a partial batch report to escape.
  assert.throws(() => createBatchReport([
    scenario('valid', cards(), tx()), scenario('invalid', terms, transactions)
  ]), pattern);
}

test('invalid fee, waiver, reward and cap fields fail closed in all three public APIs', () => {
  const invalidValues = [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '100', null];
  for (const value of invalidValues) {
    for (const field of ['annualFeePaise', 'annualFeeWaiverThresholdPaise']) {
      const terms = cards();
      terms[0][field] = value;
      rejectAcrossEntryPoints(terms, tx(), new RegExp(field));
    }
    for (const field of ['minTransactionPaise', 'monthlyCapPaise', 'annualCapPaise']) {
      const terms = cards();
      terms[0].rules[0][field] = value;
      rejectAcrossEntryPoints(terms, tx(), new RegExp(field));
    }
    rejectAcrossEntryPoints(cards(), [{ ...tx()[0], amountPaise: value }], /amountPaise/);
  }
  for (const value of [-1, 10001, 0.5, Infinity, NaN, '100', null]) {
    const terms = cards();
    terms[0].rules[0].rateBps = value;
    rejectAcrossEntryPoints(terms, tx(), /rateBps/);
  }
});

test('invalid category exclusions and duplicate rules cannot produce a batch report', () => {
  for (const field of ['excludedCategories', 'feeWaiverExcludedCategories']) {
    const terms = cards();
    terms[0][field] = ['synthetic', ''];
    rejectAcrossEntryPoints(terms, tx(), new RegExp(field));
  }
  const terms = cards();
  terms[0].rules.push({ ...terms[0].rules[0] });
  rejectAcrossEntryPoints(terms, tx(), /duplicate rule id/);
});
