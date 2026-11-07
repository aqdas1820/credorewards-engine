import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const card = (id = 'synthetic-capped') => ({
  id, name: id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 10000,
    monthlyCapPaise: 70, annualCapPaise: 100 }]
});
const tx = (id, month, amountPaise) => ({ id, month, category: 'fictional', amountPaise });

test('annual cap persists across calendar months while monthly cap resets', () => {
  const input = [tx('mar', '2026-03', 50), tx('jan-b', '2026-01', 50),
    tx('feb', '2026-02', 50), tx('jan-a', '2026-01', 50)];
  const snapshot = structuredClone(input);
  const result = calculateRewards(card(), input, 2026);
  assert.deepEqual(result.transactions.map(t => [t.id, t.earnedPaise, t.reason]), [
    ['jan-a', 50, 'earned'], ['jan-b', 20, 'earned'],
    ['feb', 30, 'earned'], ['mar', 0, 'reward_cap_reached']
  ]);
  assert.equal(result.totalSpendPaise, 200);
  assert.equal(result.rewardEligibleSpendPaise, 200);
  assert.equal(result.totalRewardsPaise, 100);
  assert.deepEqual(input, snapshot);
});

test('independent annual evaluations reset annual cap and preserve monthly reconciliation', () => {
  const january = [tx('jan', '2026-01', 70), tx('feb', '2026-02', 70)];
  const sameSpendNextYear = january.map(t => ({ ...t, month: t.month.replace('2026', '2027') }));
  const first = calculateRewards(card(), january, 2026);
  const second = calculateRewards(card(), sameSpendNextYear, 2027);
  assert.equal(first.totalRewardsPaise, 100);
  assert.equal(second.totalRewardsPaise, 100);
  assert.deepEqual(first.transactions.map(t => t.earnedPaise), [70, 30]);
  assert.deepEqual(second.transactions.map(t => t.earnedPaise), [70, 30]);
  const cards = [card(), { ...card('synthetic-uncapped'),
    rules: [{ id: 'base', category: '*', rateBps: 10000 }] }];
  const comparison = compareCards(cards, january, 2026);
  assert.deepEqual(comparison.entries.map(e => [e.cardId, e.totalRewardsPaise]), [
    ['synthetic-uncapped', 140], ['synthetic-capped', 100]
  ]);
  const batch = createBatchReport([
    { id: 'year-2027', year: 2027, cards, transactions: sameSpendNextYear },
    { id: 'year-2026', year: 2026, cards, transactions: january }
  ]);
  assert.deepEqual(batch.scenarios.map(s => s.scenarioId), ['year-2026', 'year-2027']);
  for (const scenario of batch.scenarios) {
    const capped = scenario.monthlyByCard.find(c => c.cardId === 'synthetic-capped');
    assert.ok(capped);
    assert.deepEqual(capped.months.slice(0, 2).map(m => m.totalRewardsPaise), [70, 30]);
    assert.equal(capped.months.reduce((sum, m) => sum + m.totalRewardsPaise, 0), 100);
  }
});
