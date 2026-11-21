import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (rule) => Object.freeze({
  id: 'synthetic-rounding',
  name: 'Synthetic rounding contract',
  annualFeePaise: 0,
  rules: Object.freeze([Object.freeze({ id: 'base', category: '*', ...rule })])
});

test('one-basis-point reward uses exact bigint flooring at maximum safe paise', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const tx = Object.freeze({
    id: 'max', month: '2026-12', category: 'synthetic', amountPaise: amount
  });
  const result = calculateRewards(card({ rateBps: 1 }), Object.freeze([tx]), 2026);
  const expected = Number(BigInt(amount) / 10000n);
  assert.equal(expected, 900719925474);
  assert.equal(result.totalSpendPaise, amount);
  assert.equal(result.totalRewardsPaise, expected);
  assert.equal(result.netAnnualValuePaise, expected);
  assert.deepEqual(result.transactions.map(({ earnedPaise, reason }) => [earnedPaise, reason]), [
    [expected, 'earned']
  ]);
});

test('sub-paisa rewards round down per transaction, not after aggregating spend', () => {
  const terms = card({ rateBps: 5000 });
  const transactions = Object.freeze([
    Object.freeze({ id: 'b', month: '2026-02', category: 'synthetic', amountPaise: 1 }),
    Object.freeze({ id: 'a', month: '2026-01', category: 'synthetic', amountPaise: 1 })
  ]);
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.totalSpendPaise, 2);
  assert.equal(result.rewardEligibleSpendPaise, 2);
  assert.equal(result.totalRewardsPaise, 0);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['a', 0, 'rounded_to_zero'],
    ['b', 0, 'rounded_to_zero']
  ]);
});
