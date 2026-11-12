import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const zeroRate = [{ id: 'zero', category: '*', rateBps: 0 }];
const card = (id, annualFeePaise) => ({
  id,
  name: id,
  annualFeePaise,
  rules: zeroRate
});

test('preserves the minimum safe negative net annual value with an unpaid fee', () => {
  const result = calculateRewards(card('max-fee', Number.MAX_SAFE_INTEGER), [], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeChargedPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.netAnnualValuePaise, -Number.MAX_SAFE_INTEGER);
  assert.equal(result.annualFeeWaived, false);
});

test('comparison ranks a zero-fee card above a maximum-safe-fee card without overflow', () => {
  const result = compareCards([
    card('expensive', Number.MAX_SAFE_INTEGER),
    card('free', 0)
  ], [], 2026);
  assert.deepEqual(result.leaderCardIds, ['free']);
  assert.deepEqual(result.entries.map(entry => [entry.cardId, entry.rank, entry.differenceFromLeaderPaise]), [
    ['free', 1, 0],
    ['expensive', 2, Number.MAX_SAFE_INTEGER]
  ]);
});
