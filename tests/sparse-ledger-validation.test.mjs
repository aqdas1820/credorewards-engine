import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic-sparse',
  name: 'Synthetic Sparse Card',
  annualFeePaise: 0,
  rules: [{ id: 'base', category: 'groceries', rateBps: 100 }]
});
const transaction = () => ({
  id: 'tx-1', month: '2026-01', category: 'groceries', amountPaise: 10000
});

test('rejects sparse transaction arrays instead of silently ignoring missing entries', () => {
  const transactions = [transaction(), transaction()];
  delete transactions[1];
  assert.throws(() => calculateRewards(card(), transactions, 2026), /invalid transaction/);
});

test('rejects sparse rule arrays instead of evaluating a partial card', () => {
  const terms = card();
  terms.rules.length = 2;
  assert.throws(() => calculateRewards(terms, [transaction()], 2026), /invalid rule/);
});

test('rejects sparse exclusion arrays instead of silently omitting categories', () => {
  const terms = card();
  terms.excludedCategories = new Array(1);
  assert.throws(() => calculateRewards(terms, [transaction()], 2026), /string array/);
});

test('ignores custom array iterators for already validated transaction and rule entries', () => {
  const terms = card();
  const transactions = [transaction()];
  const fail = () => { throw new Error('caller iterator must not execute'); };
  terms.rules[Symbol.iterator] = fail;
  transactions[Symbol.iterator] = fail;
  assert.equal(calculateRewards(terms, transactions, 2026).totalRewardsPaise, 100);
});
