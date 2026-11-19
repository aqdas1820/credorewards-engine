import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'fictional', name: 'Synthetic card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const transaction = () => ({
  id: 'tx', month: '2026-01', category: 'general', amountPaise: 10000
});

test('rejects sparse rules rather than silently skipping unowned array slots', () => {
  const terms = card();
  terms.rules = new Array(1);
  assert.throws(() => calculateRewards(terms, [transaction()], 2026), /invalid rule/);
  assert.equal(0 in terms.rules, false);
});

test('rejects sparse transaction arrays rather than treating holes as no spend', () => {
  const transactions = new Array(1);
  assert.throws(() => calculateRewards(card(), transactions, 2026), /invalid transaction/);
  assert.equal(0 in transactions, false);
});

test('rejects sparse exclusion arrays instead of silently changing eligibility', () => {
  for (const field of ['excludedCategories', 'feeWaiverExcludedCategories']) {
    const terms = card();
    terms[field] = new Array(1);
    assert.throws(() => calculateRewards(terms, [transaction()], 2026), /must be a string array/);
    assert.equal(0 in terms[field], false);
  }
});
