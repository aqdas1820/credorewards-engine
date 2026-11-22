import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-order-boundary',
  name: 'Synthetic order boundary',
  annualFeePaise: 0,
  rules: [{ id: 'zero', category: '*', rateBps: 0 }]
};

const nearLimit = [
  { id: 'first', month: '2026-01', category: 'other', amountPaise: Number.MAX_SAFE_INTEGER - 2 },
  { id: 'second', month: '2026-02', category: 'other', amountPaise: 2 }
];

test('aggregate safe-integer boundary accepts either transaction order', () => {
  const snapshot = structuredClone(nearLimit);
  for (const transactions of [nearLimit, [...nearLimit].reverse()]) {
    const result = calculateRewards(card, transactions, 2026);
    assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
    assert.equal(result.totalRewardsPaise, 0);
  }
  assert.deepEqual(nearLimit, snapshot);
});

test('aggregate overflow rejects either transaction order without input mutation', () => {
  const overflow = [
    ...nearLimit,
    { id: 'overflow', month: '2026-03', category: 'other', amountPaise: 1 }
  ];
  const snapshot = structuredClone(overflow);
  for (const transactions of [overflow, [...overflow].reverse()]) {
    assert.throws(
      () => calculateRewards(card, transactions, 2026),
      /totalSpendPaise exceeds safe integer range/
    );
  }
  assert.deepEqual(overflow, snapshot);
});
