import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

test('purchase impact adds fee waiver savings without double-counting displaced cashback', () => {
  const cappedWaiver = Object.freeze({
    id: 'capped-waiver', name: 'Synthetic capped waiver',
    annualFeePaise: 200, annualFeeWaiverThresholdPaise: 1000,
    rules: Object.freeze([Object.freeze({
      id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 100
    })])
  });
  const comparison = Object.freeze({
    id: 'comparison', name: 'Synthetic comparison', annualFeePaise: 0,
    rules: Object.freeze([Object.freeze({ id: 'base', category: '*', rateBps: 100 })])
  });
  const history = Object.freeze([Object.freeze({
    id: 'z-old', month: '2026-07', category: 'synthetic', amountPaise: 900
  })]);
  const purchase = Object.freeze({
    id: 'a-new', month: '2026-07', category: 'synthetic', amountPaise: 300
  });
  const cards = Object.freeze([cappedWaiver, comparison]);
  const first = comparePurchaseImpact(cards, history, purchase, 2026);
  const second = comparePurchaseImpact(cards, history, purchase, 2026);
  assert.deepEqual(first, second);
  const capped = first.entries.find(entry => entry.cardId === 'capped-waiver');
  assert.equal(capped.baseline.totalRewardsPaise, 90);
  assert.equal(capped.withPurchase.totalRewardsPaise, 100);
  assert.equal(capped.purchase.earnedPaise, 30);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, -20);
  assert.equal(capped.incrementalRewardsPaise, 10);
  assert.equal(capped.baseline.annualFeeChargedPaise, 200);
  assert.equal(capped.withPurchase.annualFeeChargedPaise, 0);
  assert.equal(capped.feeSavingsPaise, 200);
  assert.equal(capped.incrementalNetAnnualValuePaise, 210);
  assert.equal(first.leaderCardIds[0], 'capped-waiver');
});
