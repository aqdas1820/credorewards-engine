import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRewards } from '../dist/index.js';

test('zero monthly and annual reward caps retain cap-reached reasons', () => {
  const card = { id: 'fictional-zero-caps', name: 'Fictional zero caps', annualFeePaise: 0, rules: [
    { id: 'monthly', category: 'groceries', rateBps: 10000, monthlyCapPaise: 0 },
    { id: 'annual', category: 'fuel', rateBps: 10000, annualCapPaise: 0 },
  ] };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 100 },
    { id: 'b', month: '2026-02', category: 'fuel', amountPaise: 100 },
  ];
  const before = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.deepEqual(result.transactions.map(tx => tx.reason), ['reward_cap_reached', 'reward_cap_reached']);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
  assert.deepEqual(transactions, before);
});
