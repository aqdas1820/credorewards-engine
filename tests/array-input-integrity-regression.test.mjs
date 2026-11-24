import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = Object.freeze({
  id: 'synthetic-input-integrity',
  name: 'Synthetic input integrity',
  annualFeePaise: 0,
  rules: Object.freeze([Object.freeze({ id: 'grocery', category: 'groceries', rateBps: 500 })])
});
const tx = Object.freeze({ id: 't1', month: '2026-01', category: 'groceries', amountPaise: 10000 });

test('sparse transaction and rule arrays fail closed instead of skipping holes', () => {
  const sparseTransactions = new Array(1);
  assert.throws(() => calculateRewards(card, sparseTransactions, 2026), /invalid transaction/);
  const sparseRules = new Array(1);
  assert.throws(() => calculateRewards({ ...card, rules: sparseRules }, [tx], 2026), /invalid rule/);
});

test('overridden transaction slice and iterator cannot inject unvalidated entries', () => {
  const transactions = [tx];
  transactions.slice = () => [{ ...tx, id: 'injected', amountPaise: 999999 }];
  transactions[Symbol.iterator] = function* () {
    yield { ...tx, id: 'injected', amountPaise: 999999 };
  };
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].id, 't1');
  assert.equal(result.totalSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 500);
});

test('overridden rule find and iterator cannot substitute an unvalidated reward rate', () => {
  const rules = [{ id: 'grocery', category: 'groceries', rateBps: 500 }];
  rules.find = () => ({ id: 'injected', category: 'groceries', rateBps: 10000 });
  rules[Symbol.iterator] = function* () {
    yield { id: 'injected', category: 'groceries', rateBps: 10000 };
  };
  const result = calculateRewards({ ...card, rules }, [tx], 2026);
  assert.equal(result.transactions[0].matchedRuleId, 'grocery');
  assert.equal(result.totalRewardsPaise, 500);
});
