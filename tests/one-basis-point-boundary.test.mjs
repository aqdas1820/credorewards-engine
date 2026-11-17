import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Fictional 1-basis-point rule: each transaction rounds down independently.
test('one-basis-point boundary never pools fractional paise across transactions', () => {
  const card = {
    id: 'one-bp', name: 'Fictional one-basis-point card',
    annualFeePaise: 7,
    rules: [{ id: 'base', category: '*', rateBps: 1 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'general', amountPaise: 9999 },
    { id: 'b', month: '2026-01', category: 'general', amountPaise: 9999 },
    { id: 'c', month: '2026-02', category: 'general', amountPaise: 10000 }
  ];
  const before = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);

  assert.deepEqual(result.transactions.map(item => item.earnedPaise), [0, 0, 1]);
  assert.equal(result.totalRewardsPaise, 1);
  assert.equal(result.annualFeeChargedPaise, 7);
  assert.equal(result.netAnnualValuePaise, -6);
  assert.deepEqual({ card, transactions }, before);
});
