import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const tx = (id, amountPaise, month = '2026-01') =>
  Object.freeze({ id, month, category: 'synthetic', amountPaise });

const card = (rule) => Object.freeze({
  id: 'synthetic-reasons',
  name: 'Synthetic reason classification',
  annualFeePaise: 0,
  rules: Object.freeze([Object.freeze({ id: 'only', category: '*', ...rule })])
});

test('zero-rate transactions report zero_reward rather than exhausted cap', () => {
  const input = Object.freeze([tx('a', 10000), tx('b', 0)]);
  const result = calculateRewards(card({ rateBps: 0, monthlyCapPaise: 0 }), input, 2026);
  assert.deepEqual(result.transactions.map(({ reason, earnedPaise }) => [reason, earnedPaise]), [
    ['zero_reward', 0],
    ['zero_reward', 0]
  ]);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(input[0].amountPaise, 10000);
});

test('sub-paisa rounding is distinct from a reached monthly cap', () => {
  const input = Object.freeze([tx('a', 1), tx('b', 10000), tx('c', 10000)]);
  const result = calculateRewards(card({ rateBps: 1, monthlyCapPaise: 1 }), input, 2026);
  assert.deepEqual(result.transactions.map(({ reason, earnedPaise }) => [reason, earnedPaise]), [
    ['rounded_to_zero', 0],
    ['earned', 1],
    ['reward_cap_reached', 0]
  ]);
  assert.equal(result.totalRewardsPaise, 1);
  assert.equal(result.netAnnualValuePaise, 1);
});

test('monthly caps reset in a new month without resetting the annual cap', () => {
  const input = Object.freeze([tx('a', 10000), tx('b', 10000, '2026-02'), tx('c', 10000, '2026-03')]);
  const result = calculateRewards(card({ rateBps: 10000, monthlyCapPaise: 2, annualCapPaise: 3 }), input, 2026);
  assert.deepEqual(result.transactions.map(({ earnedPaise, reason }) => [earnedPaise, reason]), [
    [2, 'earned'],
    [1, 'earned'],
    [0, 'reward_cap_reached']
  ]);
  assert.equal(result.totalRewardsPaise, 3);
  assert.equal(input[2].month, '2026-03');
});
