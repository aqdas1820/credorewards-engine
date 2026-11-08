import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRewards, compareCards, comparePurchaseImpact, createBatchReport
} from '../dist/index.js';

const MAX = Number.MAX_SAFE_INTEGER;
const SMALL = 100000;
const CAP = MAX - 250000;
const tx = (id, amountPaise) => ({
  id, month: '2026-01', category: 'synthetic', amountPaise
});
const min = (left, right) => left < right ? left : right;

test('independent bigint reference: split maximum-safe spend, caps and fee waiver reconcile across APIs', () => {
  for (const rateBps of [0, 1, 37, 3333, 9999, 10000]) {
    const card = {
      id: 'capped', name: 'Fictional capped card', annualFeePaise: 900,
      annualFeeWaiverThresholdPaise: MAX,
      rules: [{
        id: 'base', category: '*', rateBps, monthlyCapPaise: CAP,
        annualCapPaise: CAP
      }]
    };
    const zero = {
      id: 'zero', name: 'Fictional zero-rate card', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 0 }]
    };
    const cards = [card, zero];
    const history = [tx('a-large', MAX - SMALL)];
    const purchase = tx('z-small', SMALL);
    const spending = [purchase, ...history];
    const original = structuredClone({ cards, history, purchase, spending });

    // This oracle uses only independent integer arithmetic, not SDK helpers.
    const rawLarge = BigInt(MAX - SMALL) * BigInt(rateBps) / 10000n;
    const rawSmall = BigInt(SMALL) * BigInt(rateBps) / 10000n;
    const firstReward = min(rawLarge, BigInt(CAP));
    const secondReward = min(rawSmall, BigInt(CAP) - firstReward);
    const expectedTotal = Number(firstReward + secondReward);

    const single = calculateRewards(card, spending, 2026);
    assert.equal(single.totalSpendPaise, MAX, 'spend: ' + rateBps);
    assert.equal(single.feeWaiverEligibleSpendPaise, MAX, 'waiver spend: ' + rateBps);
    assert.equal(single.annualFeeWaived, true, 'waived: ' + rateBps);
    assert.equal(single.annualFeeChargedPaise, 0);
    assert.equal(single.totalRewardsPaise, expectedTotal, 'rewards: ' + rateBps);
    assert.equal(single.netAnnualValuePaise, expectedTotal);
    assert.deepEqual(single.transactions.map(row => [row.id, row.earnedPaise]), [
      ['a-large', Number(firstReward)], ['z-small', Number(secondReward)]
    ]);

    const comparison = compareCards(cards, spending, 2026);
    assert.deepEqual(comparison.entries.find(row => row.cardId === 'capped').calculation,
      single);
    assert.deepEqual(compareCards([...cards].reverse(), [...spending].reverse(), 2026),
      comparison);

    const report = createBatchReport([{
      id: 'max-safe', year: 2026, cards, transactions: spending
    }]);
    assert.deepEqual(report.scenarios[0].comparison, comparison);
    const january = report.scenarios[0].monthlyByCard
      .find(row => row.cardId === 'capped').months[0];
    assert.equal(january.totalSpendPaise, MAX);
    assert.equal(january.totalRewardsPaise, expectedTotal);
    assert.equal(january.transactionCount, 2);

    const impact = comparePurchaseImpact(cards, history, purchase, 2026);
    const capped = impact.entries.find(row => row.cardId === 'capped');
    assert.equal(capped.baseline.annualFeeChargedPaise, 900);
    assert.equal(capped.withPurchase.annualFeeChargedPaise, 0);
    assert.equal(capped.purchase.earnedPaise, Number(secondReward));
    assert.equal(capped.incrementalRewardsPaise, Number(secondReward));
    assert.equal(capped.otherTransactionsRewardDeltaPaise, 0);
    assert.equal(capped.feeSavingsPaise, 900);
    assert.equal(capped.incrementalNetAnnualValuePaise, Number(secondReward) + 900);
    assert.deepEqual({ cards, history, purchase, spending }, original,
      'caller inputs mutated at rate ' + rateBps);
  }
});
