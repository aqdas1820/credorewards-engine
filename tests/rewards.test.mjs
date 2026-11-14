import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

function makeCard(overrides = {}) {
  return {
    id: 'demo', name: 'Test card (fictional)', annualFeePaise: 0,
    excludedCategories: [], rules: [{ id: 'base', category: '*', rateBps: 100 }], ...overrides
  };
}
const tx = (id, amountPaise, month='2026-01', category='general') => ({ id, amountPaise, month, category });

test('basic 1% cashback in paise', () => {
  assert.equal(calculateRewards(makeCard(), [tx('1', 10000)], 2026).totalRewardsPaise, 100);
});
test('rounding down to a whole paisa', () => {
  const result=calculateRewards(makeCard(), [tx('1', 99)], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].reason, 'rounded_to_zero');
});
test('specific rule before wildcard', () => {
  const card = makeCard({ rules: [{ id: 'special', category: 'grocery', rateBps: 500 }, { id: 'base', category: '*', rateBps: 100 }] });
  const result = calculateRewards(card, [tx('1', 10000, '2026-01', 'grocery')], 2026);
  assert.equal(result.totalRewardsPaise, 500);
  assert.equal(result.transactions[0].matchedRuleId, 'special');
});
test('monthly cap enforced across multiple transactions', () => {
  const card = makeCard({ rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 1000 }] });
  assert.equal(calculateRewards(card, [tx('a', 10000), tx('b', 10000)], 2026).totalRewardsPaise, 1000);
});
test('monthly cap resets next month', () => {
  const card = makeCard({ rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 1000 }] });
  assert.equal(calculateRewards(card, [tx('a', 10000), tx('b', 10000,'2026-02')], 2026).totalRewardsPaise, 2000);
});
test('annual cap enforced across months', () => {
  const card = makeCard({ rules: [{ id: 'base', category: '*', rateBps: 1000, annualCapPaise: 1500 }] });
  assert.equal(calculateRewards(card, [tx('a', 10000), tx('b', 10000,'2026-02')], 2026).totalRewardsPaise, 1500);
});
test('excluded categories earn no rewards', () => {
  const result = calculateRewards(makeCard({ excludedCategories: ['rent'] }), [tx('a', 10000,'2026-01','rent')], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].reason, 'excluded_category');
});
test('no matching rule earns no rewards', () => {
  const result = calculateRewards(makeCard({ rules: [{ id: 'g', category: 'grocery', rateBps: 100 }] }), [tx('a', 10000)], 2026);
  assert.equal(result.transactions[0].reason, 'no_matching_rule');
});
test('minimum transaction amount respected', () => {
  const result = calculateRewards(makeCard({ rules: [{ id: 'base', category: '*', rateBps: 100, minTransactionPaise: 20000 }] }), [tx('a', 10000)], 2026);
  assert.equal(result.transactions[0].reason, 'below_minimum');
});
test('annual fee deducted unless waived', () => {
  const card = makeCard({ annualFeePaise: 50000, annualFeeWaiverThresholdPaise: 100000 });
  const notWaived = calculateRewards(card, [tx('a', 50000)], 2026);
  assert.equal(notWaived.annualFeeWaived, false);
  assert.equal(notWaived.netAnnualValuePaise, -49500);
  const waived = calculateRewards(card, [tx('a', 100000)], 2026);
  assert.equal(waived.annualFeeWaived, true);
  assert.equal(waived.annualFeeChargedPaise, 0);
});
test('fee waiver exclusions independent from rewards exclusions', () => {
  const card = makeCard({ annualFeePaise: 500, annualFeeWaiverThresholdPaise: 1000, feeWaiverExcludedCategories: ['rent'] });
  const result = calculateRewards(card, [tx('a', 900, '2026-01', 'rent'), tx('b', 900)], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 900);
  assert.equal(result.annualFeeWaived, false);
});
test('invalid year month is rejected', () => {
  assert.throws(() => calculateRewards(makeCard(), [tx('a', 100, '2025-12')], 2026), /month/);
});
test('duplicate transaction ids rejected', () => {
  assert.throws(() => calculateRewards(makeCard(), [tx('a', 100), tx('a', 100)], 2026), /duplicate transaction/);
});
test('duplicate rule ids rejected', () => {
  assert.throws(() => calculateRewards(makeCard({ rules: [{ id:'a', category:'a', rateBps:100 }, { id:'a', category:'b', rateBps:100 }] }), [], 2026), /duplicate rule/);
});
test('invalid rate and money rejected', () => {
  assert.throws(() => calculateRewards(makeCard({ rules:[{ id:'a', category:'*', rateBps:10001 }] }), [], 2026), /rateBps/);
  assert.throws(() => calculateRewards(makeCard(), [tx('a', 1.4)], 2026), /safe integer/);
});
test('results deterministic regardless of transaction order', () => {
  const card = makeCard({ rules: [{ id:'base', category:'*', rateBps:1000, monthlyCapPaise:500 }] });
  const a=[tx('b',6000),tx('a',6000)]; const b=[...a].reverse();
  assert.deepEqual(calculateRewards(card,a,2026),calculateRewards(card,b,2026));
});
test('zero reward rule returns explicit reason', () => {
  const result=calculateRewards(makeCard({ rules: [{ id:'base',category:'*',rateBps:0 }] }),[tx('a',5000)],2026);
  assert.equal(result.transactions[0].reason,'zero_reward');
});
test('no transactions still charge annual fee', () => {
  const result=calculateRewards(makeCard({annualFeePaise:999}),[],2026);
  assert.equal(result.netAnnualValuePaise,-999);
});
test('calculates demo cap and fee correctly', async () => {
  const { readFileSync }=await import('node:fs');
  const data=JSON.parse(readFileSync(new URL('../examples/fictional-card.json',import.meta.url),'utf8'));
  const result=calculateRewards(data.card,data.transactions,data.year);
  assert.equal(result.totalRewardsPaise, 10500); // ₹100 grocery + ₹5 utilities
  assert.equal(result.annualFeeWaived,false); // rent excluded from fee-waiver spend
  assert.equal(result.netAnnualValuePaise, -39500);
});

test('rounds each transaction independently before aggregating', () => {
  const result = calculateRewards(makeCard(), [
    tx('a', 99), tx('b', 99), tx('c', 100)
  ], 2026);
  assert.equal(result.totalRewardsPaise, 1);
  assert.deepEqual(result.transactions.map(t => t.earnedPaise), [0, 0, 1]);
  assert.deepEqual(result.transactions.map(t => t.reason), ['rounded_to_zero', 'rounded_to_zero', 'earned']);
});

test('monthly and annual caps compose at exact boundaries', () => {
  const card = makeCard({ rules: [{
    id: 'base', category: '*', rateBps: 10000,
    monthlyCapPaise: 5, annualCapPaise: 8
  }] });
  const result = calculateRewards(card, [
    tx('a', 5), tx('b', 1), tx('c', 5, '2026-02'),
    tx('d', 1, '2026-03')
  ], 2026);
  assert.equal(result.totalRewardsPaise, 8);
  assert.deepEqual(result.transactions.map(t => t.earnedPaise), [5, 0, 3, 0]);
  assert.deepEqual(result.transactions.map(t => t.reason), [
    'earned', 'reward_cap_reached', 'earned', 'reward_cap_reached'
  ]);
});

test('fee waiver is inclusive at the exact qualifying spend threshold', () => {
  const card = makeCard({
    annualFeePaise: 250, annualFeeWaiverThresholdPaise: 1000,
    feeWaiverExcludedCategories: ['rent']
  });
  const result = calculateRewards(card, [
    tx('excluded', 500, '2026-01', 'rent'), tx('eligible', 1000)
  ], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 15);
});

test('rejects aggregate paise totals outside safe integer range', () => {
  const card = makeCard({ rules: [] });
  assert.throws(
    () => calculateRewards(card, [
      tx('a', Number.MAX_SAFE_INTEGER), tx('b', 1)
    ], 2026),
    /totalSpendPaise exceeds safe integer range/
  );
});


test('fee waiver boundary uses eligible paise, not total or rewarded spend', () => {
  const card = makeCard({
    annualFeePaise: 250,
    annualFeeWaiverThresholdPaise: 1000,
    excludedCategories: ['utilities'],
    feeWaiverExcludedCategories: ['rent']
  });
  const base = [
    tx('rent', 5000, '2026-01', 'rent'),
    tx('utilities', 999, '2026-01', 'utilities')
  ];
  const below = calculateRewards(card, base, 2026);
  assert.equal(below.totalSpendPaise, 5999);
  assert.equal(below.feeWaiverEligibleSpendPaise, 999);
  assert.equal(below.annualFeeWaived, false);
  assert.equal(below.annualFeeChargedPaise, 250);
  assert.equal(below.netAnnualValuePaise, below.totalRewardsPaise - 250);

  const atThreshold = calculateRewards(card, [
    base[0], { ...base[1], amountPaise: 1000 }
  ], 2026);
  assert.equal(atThreshold.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(atThreshold.annualFeeWaived, true);
  assert.equal(atThreshold.annualFeeChargedPaise, 0);
  assert.equal(atThreshold.netAnnualValuePaise, atThreshold.totalRewardsPaise);
  assert.equal(atThreshold.transactions.find(t => t.id === 'utilities').reason, 'excluded_category');
});

test('fee-waiver eligible spend and net value are input-order invariant', () => {
  const card = makeCard({
    annualFeePaise: 250,
    annualFeeWaiverThresholdPaise: 1000,
    excludedCategories: ['utilities'],
    feeWaiverExcludedCategories: ['rent']
  });
  const transactions = [
    tx('rent', 5000, '2026-01', 'rent'),
    tx('utilities', 750, '2026-02', 'utilities'),
    tx('grocery', 250, '2026-03', 'grocery')
  ];
  const forward = calculateRewards(card, transactions, 2026);
  const reverse = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.equal(forward.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(forward.annualFeeWaived, true);
  assert.equal(forward.annualFeeChargedPaise, 0);
  assert.equal(forward.totalRewardsPaise, 2);
  assert.equal(forward.netAnnualValuePaise, 2);
  // Transaction ledgers may preserve caller input order; compare by stable ID.
  const normalize = ({ transactions: ledger, ...totals }) => ({
    ...totals,
    transactions: [...ledger].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  });
  assert.deepEqual(normalize(reverse), normalize(forward));
});
