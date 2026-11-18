import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = (rateBps, extra = {}) => ({
  id: 'synthetic-large-amount',
  name: 'Synthetic high-value boundary card',
  annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps, ...extra }]
});
const transaction = (id, amountPaise, month = '2026-01') =>
  ({ id, amountPaise, month, category: 'synthetic' });

test('large safe-integer amounts use exact integer-paise rounding, not floating-point multiplication', () => {
  for (const rateBps of [1, 3333, 9999, 10000]) {
    const input = [transaction('max', max)];
    const expected = Number(BigInt(max) * BigInt(rateBps) / 10000n);
    const result = calculateRewards(card(rateBps), input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.totalRewardsPaise, expected, `rate ${rateBps} bps`);
    assert.equal(result.transactions[0].earnedPaise, expected);
    assert.equal(input[0].amountPaise, max);
  }
});

test('high-value monthly cap is applied after exact per-transaction rounding', () => {
  const cap = Number(BigInt(max) / 10000n);
  const input = [transaction('a', max), transaction('b', max)];
  // The combined spend is intentionally outside the safe-integer range,
  // so test each transaction in a separate month instead.
  input[1].month = '2026-02';
  assert.throws(
    () => calculateRewards(card(1, { monthlyCapPaise: cap }), input, 2026),
    /totalSpendPaise exceeds safe integer range/
  );
  const result = calculateRewards(card(1, { monthlyCapPaise: cap }), [
    transaction('a', max)
  ], 2026);
  assert.equal(result.totalRewardsPaise, cap);
  assert.equal(result.transactions[0].earnedPaise, cap);
});
