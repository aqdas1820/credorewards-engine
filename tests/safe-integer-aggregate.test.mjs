import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-safe-integer',
  name: 'Synthetic safe integer boundary',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 10000 }]
};
const transaction = (id, amountPaise) => ({
  id, month: '2026-01', category: 'general', amountPaise
});

test('maximum safe paise remains exact at 100% cashback', () => {
  const result = calculateRewards(card, [transaction('max', Number.MAX_SAFE_INTEGER)], 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.netAnnualValuePaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.transactions[0].earnedPaise, Number.MAX_SAFE_INTEGER);
});

test('aggregate spend exceeding safe integer is rejected regardless of input order', () => {
  const inputs = [transaction('max', Number.MAX_SAFE_INTEGER), transaction('one', 1)];
  for (const ordered of [inputs, [...inputs].reverse()]) {
    assert.throws(() => calculateRewards(card, ordered, 2026), /safe integer/i);
  }
});
