import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

// Fixed-seed pseudo-random scenarios: repeatable on Node 24/26 and Windows/Linux.
// No real issuer rates, fees or MCC assumptions are involved.
function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

function build(seed) {
  const next = generator(seed);
  const card = {
    id: 'synthetic-' + seed, name: 'Synthetic invariants card',
    annualFeePaise: next() % 5000,
    annualFeeWaiverThresholdPaise: 20000 + next() % 20000,
    excludedCategories: ['excluded'],
    feeWaiverExcludedCategories: ['waiver-excluded'],
    rules: [
      { id: 'special', category: 'special', rateBps: next() % 10001,
        monthlyCapPaise: next() % 2000, annualCapPaise: next() % 6000 },
      { id: 'fallback', category: '*', rateBps: next() % 10001,
        monthlyCapPaise: next() % 2500, annualCapPaise: next() % 7000 }
    ]
  };
  const categories = ['special', 'general', 'excluded', 'waiver-excluded'];
  const transactions = Array.from({ length: 48 }, (_, index) => ({
    id: 'tx-' + String(index).padStart(3, '0'),
    month: '2026-' + String(1 + next() % 12).padStart(2, '0'),
    category: categories[next() % categories.length],
    amountPaise: next() % 12000
  }));
  return { card, transactions };
}

test('seeded scenarios preserve conservation, cap bounds, fee identities and ordering', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { card, transactions } = build(seed);
    const snapshot = structuredClone({ card, transactions });
    const result = calculateRewards(card, transactions, 2026);
    const reversed = calculateRewards(card, [...transactions].reverse(), 2026);
    assert.deepEqual(reversed, result, 'seed ' + seed + ': input order');
    assert.deepEqual({ card, transactions }, snapshot, 'seed ' + seed + ': inputs mutated');

    assert.equal(result.transactions.length, transactions.length);
    assert.equal(result.totalSpendPaise,
      result.transactions.reduce((sum, item) => sum + item.amountPaise, 0));
    assert.equal(result.totalRewardsPaise,
      result.transactions.reduce((sum, item) => sum + item.earnedPaise, 0));
    assert.equal(result.netAnnualValuePaise,
      result.totalRewardsPaise - result.annualFeeChargedPaise);
    assert.equal(result.annualFeeChargedPaise,
      result.annualFeeWaived ? 0 : card.annualFeePaise);
    assert.equal(result.annualFeeWaived,
      result.feeWaiverEligibleSpendPaise >= card.annualFeeWaiverThresholdPaise);
    assert.ok(result.rewardEligibleSpendPaise <= result.totalSpendPaise);
    assert.ok(result.feeWaiverEligibleSpendPaise <= result.totalSpendPaise);

    for (const rule of card.rules) {
      const matched = result.transactions.filter(item => item.matchedRuleId === rule.id);
      const annual = matched.reduce((sum, item) => sum + item.earnedPaise, 0);
      assert.ok(annual <= rule.annualCapPaise, 'seed ' + seed + ': annual ' + rule.id);
      for (let month = 1; month <= 12; month++) {
        const period = '2026-' + String(month).padStart(2, '0');
        const monthly = matched.filter(item => item.month === period)
          .reduce((sum, item) => sum + item.earnedPaise, 0);
        assert.ok(monthly <= rule.monthlyCapPaise,
          'seed ' + seed + ': monthly ' + rule.id + ' ' + period);
      }
    }
    for (const item of result.transactions) {
      assert.ok(item.earnedPaise >= 0);
      assert.ok(item.earnedPaise <= item.amountPaise);
      assert.equal(item.earnedPaise > 0, item.reason === 'earned');
      if (item.category === 'excluded') {
        assert.equal(item.reason, 'excluded_category');
        assert.equal(item.matchedRuleId, null);
      }
    }
  }
});

test('seeded card comparisons exactly reuse single-card annual calculations', () => {
  for (let seed = 101; seed <= 125; seed++) {
    const { card, transactions } = build(seed);
    const competitor = {
      id: 'competitor-' + seed, name: 'Synthetic competitor',
      annualFeePaise: seed * 10,
      rules: [{ id: 'flat', category: '*', rateBps: seed % 500 }]
    };
    const result = compareCards([card, competitor], transactions, 2026);
    for (const candidate of [card, competitor]) {
      const entry = result.entries.find(item => item.cardId === candidate.id);
      assert.ok(entry, 'seed ' + seed + ': missing card');
      assert.deepEqual(entry.calculation, calculateRewards(candidate, transactions, 2026));
      assert.equal(entry.differenceFromLeaderPaise,
        result.entries[0].netAnnualValuePaise - entry.netAnnualValuePaise);
    }
    assert.deepEqual(compareCards([competitor, card],
      [...transactions].reverse(), 2026), result);
  }
});
