import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = Object.freeze({
  id: 'synthetic-empty-year',
  name: 'Synthetic zero-fee card',
  annualFeePaise: 0,
  rules: Object.freeze([
    Object.freeze({ id: 'groceries', category: 'groceries', rateBps: 500 })
  ])
});
const emptyTransactions = Object.freeze([]);

test('empty annual ledger produces exact zero paise totals', () => {
  const result = calculateRewards(card, emptyTransactions, 2026);
  assert.equal(result.totalSpendPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
});

test('empty ledger results are deterministic and do not mutate frozen inputs', () => {
  const first = calculateRewards(card, emptyTransactions, 2026);
  const second = calculateRewards(card, emptyTransactions, 2026);
  assert.deepEqual(second, first);
  assert.equal(emptyTransactions.length, 0);
  assert.equal(card.rules[0].rateBps, 500);
});
