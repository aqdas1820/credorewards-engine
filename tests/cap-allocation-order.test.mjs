import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const transaction = (id, month, amountPaise) =>
  ({ id, month, category: 'synthetic', amountPaise });
const card = (id, rule) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0, rules: [rule]
});

test('monthly cap attribution is stable under reversed and interleaved input', () => {
  const terms = card('monthly', {
    id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 150
  });
  const input = [
    transaction('z', '2026-01', 100),
    transaction('a', '2026-02', 120),
    transaction('b', '2026-01', 100),
    transaction('a', '2026-01', 100),
    transaction('b', '2026-02', 120)
  ];
  const expected = calculateRewards(terms, input, 2026);
  assert.deepEqual(expected.transactions.map(t => [t.month, t.id, t.earnedPaise]), [
    ['2026-01', 'a', 100],
    ['2026-01', 'b', 50],
    ['2026-01', 'z', 0],
    ['2026-02', 'a', 120],
    ['2026-02', 'b', 30]
  ]);
  assert.equal(expected.totalRewardsPaise, 300);
  for (const reordered of [[...input].reverse(), [input[2], input[4], input[0], input[3], input[1]]]) {
    assert.deepEqual(calculateRewards(terms, reordered, 2026), expected);
  }
});

test('annual cap is consumed by calendar month then transaction ID, not input order', () => {
  const terms = card('annual', {
    id: 'base', category: '*', rateBps: 10000, annualCapPaise: 175
  });
  const input = [
    transaction('late', '2026-12', 100),
    transaction('b', '2026-01', 100),
    transaction('a', '2026-01', 100),
    transaction('middle', '2026-06', 100)
  ];
  const result = calculateRewards(terms, input, 2026);
  assert.deepEqual(result.transactions.map(t => [t.id, t.earnedPaise, t.reason]), [
    ['a', 100, 'earned'],
    ['b', 75, 'earned'],
    ['middle', 0, 'reward_cap_reached'],
    ['late', 0, 'reward_cap_reached']
  ]);
  assert.equal(result.totalRewardsPaise, 175);
  assert.deepEqual(calculateRewards(terms, [...input].reverse(), 2026), result);
});

test('separate rule IDs maintain independent monthly and annual caps', () => {
  const terms = {
    id: 'separate', name: 'Synthetic separate rules', annualFeePaise: 0,
    rules: [
      { id: 'special', category: 'special', rateBps: 10000,
        monthlyCapPaise: 60, annualCapPaise: 70 },
      { id: 'fallback', category: '*', rateBps: 10000,
        monthlyCapPaise: 50, annualCapPaise: 90 }
    ]
  };
  const input = [
    { id: 's1', month: '2026-01', category: 'special', amountPaise: 100 },
    { id: 'f1', month: '2026-01', category: 'other', amountPaise: 100 },
    { id: 's2', month: '2026-02', category: 'special', amountPaise: 100 },
    { id: 'f2', month: '2026-02', category: 'other', amountPaise: 100 }
  ];
  const result = calculateRewards(terms, input, 2026);
  assert.deepEqual(result.transactions.map(t => [t.id, t.matchedRuleId, t.earnedPaise]), [
    ['f1', 'fallback', 50],
    ['s1', 'special', 60],
    ['f2', 'fallback', 40],
    ['s2', 'special', 10]
  ]);
  assert.equal(result.totalRewardsPaise, 160);
  assert.deepEqual(calculateRewards(terms, [...input].reverse(), 2026), result);
});

test('comparison preserves deterministic cap attribution per candidate', () => {
  const candidates = [
    card('a', { id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 100 }),
    card('b', { id: 'base', category: '*', rateBps: 10000, annualCapPaise: 125 })
  ];
  const input = [
    transaction('z', '2026-01', 100),
    transaction('a', '2026-01', 100),
    transaction('c', '2026-02', 100)
  ];
  const first = compareCards(candidates, input, 2026);
  const reversed = compareCards([...candidates].reverse(), [...input].reverse(), 2026);
  assert.deepEqual(reversed, first);
  assert.deepEqual(first.entries.map(e => [e.cardId, e.totalRewardsPaise]), [
    ['a', 200], ['b', 125]
  ]);
  for (const entry of first.entries) {
    const candidate = candidates.find(c => c.id === entry.cardId);
    assert.deepEqual(entry.calculation, calculateRewards(candidate, input, 2026));
  }
});
