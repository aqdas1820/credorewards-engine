import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('maximum safe paise amount earns exact 100% cashback without floating-point loss', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const card = {
    id: 'fictional-max-paise', name: 'Synthetic boundary card',
    annualFeePaise: amount,
    rules: [{ id: 'full', category: '*', rateBps: 10000 }]
  };
  const transactions = [
    { id: 'boundary', month: '2026-12', category: 'other', amountPaise: amount }
  ];
  const original = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, amount);
  assert.equal(result.rewardEligibleSpendPaise, amount);
  assert.equal(result.feeWaiverEligibleSpendPaise, amount);
  assert.equal(result.totalRewardsPaise, amount);
  assert.equal(result.annualFeeChargedPaise, amount);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.equal(result.transactions[0].earnedPaise, amount);
  assert.equal(result.transactions[0].reason, 'earned');
  assert.deepEqual({ card, transactions }, original);
});

test('one-basis-point cashback at maximum safe paise uses exact integer truncation', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const card = {
    id: 'fictional-large-bps', name: 'Synthetic large amount',
    annualFeePaise: 1,
    rules: [{ id: 'base', category: '*', rateBps: 1 }]
  };
  const transactions = [
    { id: 'large', month: '2026-01', category: 'other', amountPaise: amount }
  ];
  const expected = Number(BigInt(amount) / 10000n);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, expected);
  assert.equal(result.netAnnualValuePaise, expected - 1);
  assert.equal(result.transactions[0].earnedPaise, expected);
});
