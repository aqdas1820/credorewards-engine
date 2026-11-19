import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('half-paisa ties round per transaction, not after summing raw rewards', () => {
  const card = {
    id: 'fictional-half-paisa', name: 'Synthetic card', annualFeePaise: 0,
    rules: [{ id: 'tiny-rate', category: '*', rateBps: 1 }]
  };
  const transactions = [
    { id: 'z', month: '2026-02', category: 'synthetic', amountPaise: 4999 },
    { id: 'b', month: '2026-01', category: 'synthetic', amountPaise: 5000 },
    { id: 'a', month: '2026-01', category: 'synthetic', amountPaise: 5000 }
  ];
  const original = structuredClone({ card, transactions });
  const first = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, [...transactions].reverse(), 2026);

  assert.equal(first.totalSpendPaise, 14999);
  assert.equal(first.totalRewardsPaise, 2);
  assert.deepEqual(first.transactions.map(({ id, earnedPaise }) => ({ id, earnedPaise })), [
    { id: 'a', earnedPaise: 1 },
    { id: 'b', earnedPaise: 1 },
    { id: 'z', earnedPaise: 0 }
  ]);
  assert.deepEqual(reversed, first);
  assert.deepEqual({ card, transactions }, original);
});

test('sub-half-paisa transactions do not earn by combining their fractional remainders', () => {
  const card = {
    id: 'fictional-sub-half', name: 'Synthetic card', annualFeePaise: 0,
    rules: [{ id: 'tiny-rate', category: '*', rateBps: 1 }]
  };
  const transactions = ['c', 'a', 'b'].map((id) => ({
    id, month: '2026-03', category: 'synthetic', amountPaise: 4999
  }));
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 14997);
  assert.equal(result.totalRewardsPaise, 0);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => ({ id, earnedPaise, reason })), [
    { id: 'a', earnedPaise: 0, reason: 'rounded_to_zero' },
    { id: 'b', earnedPaise: 0, reason: 'rounded_to_zero' },
    { id: 'c', earnedPaise: 0, reason: 'rounded_to_zero' }
  ]);
});
