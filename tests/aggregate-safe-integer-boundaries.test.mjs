import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-safe-integer',
  name: 'Synthetic safe integer boundary',
  annualFeePaise: 0,
  rules: [{ id: 'zero', category: '*', rateBps: 0 }]
};

test('accepts a total spend exactly at the maximum safe integer', () => {
  const result = calculateRewards(card, [
    { id: 'a', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER - 1 },
    { id: 'b', month: '2026-02', category: 'other', amountPaise: 1 }
  ], 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, 0);
});

test('rejects aggregate spend overflow even when individual amounts are safe', () => {
  assert.throws(() => calculateRewards(card, [
    { id: 'a', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'b', month: '2026-02', category: 'other', amountPaise: 1 }
  ], 2026), /totalSpendPaise exceeds safe integer range/);
});
