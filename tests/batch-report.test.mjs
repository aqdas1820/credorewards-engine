import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBatchReport, compareCards } from '../dist/index.js';

const example = JSON.parse(readFileSync(new URL('../examples/fictional-batch.json', import.meta.url), 'utf8'));
const clone = data => structuredClone(data);

test('builds one structured report with two independent scenarios', () => {
  const result = createBatchReport(example.scenarios);
  assert.equal(result.reportVersion, 1);
  assert.equal(result.scenarioCount, 2);
  assert.deepEqual(result.scenarios.map(x => x.scenarioId),
    ['synthetic-groceries','synthetic-utilities']);
  assert.deepEqual(result.scenarios.map(x => x.year), [2026,2026]);
});

test('ranks each scenario with the same annual comparison engine', () => {
  const report = createBatchReport(example.scenarios);
  for (let i = 0; i < example.scenarios.length; i++) {
    const scenario = example.scenarios[i];
    const expected = compareCards(scenario.cards, scenario.transactions, scenario.year);
    assert.deepEqual(report.scenarios[i].comparison, expected);
  }
});

test('aggregates calendar months by card without allocating fees monthly', () => {
  const report = createBatchReport(example.scenarios);
  const first = report.scenarios[0];
  const summary = first.monthlyByCard.find(x => x.cardId === 'fictional-grocery');
  assert.ok(summary);
  assert.equal(summary.months.length, 12);
  assert.deepEqual(summary.months[0], {
    month: '2026-01', transactionCount: 1,
    totalSpendPaise: 100000, totalRewardsPaise: 5000
  });
  assert.deepEqual(summary.months[1], {
    month: '2026-02', transactionCount: 2,
    totalSpendPaise: 250000, totalRewardsPaise: 10500
  });
  assert.deepEqual(summary.months[2], {
    month:'2026-03', transactionCount:0,
    totalSpendPaise:0,totalRewardsPaise:0
  });
});

test('monthly totals reconcile exactly with corresponding annual calculations', () => {
  const report = createBatchReport(example.scenarios);
  for (const scenario of report.scenarios) {
    for (const entry of scenario.comparison.entries) {
      const monthly = scenario.monthlyByCard.find(x => x.cardId === entry.cardId);
      const spend = monthly.months.reduce((a,m) => a + m.totalSpendPaise, 0);
      const reward = monthly.months.reduce((a,m) => a + m.totalRewardsPaise, 0);
      assert.equal(spend, entry.calculation.totalSpendPaise);
      assert.equal(reward, entry.calculation.totalRewardsPaise);
    }
  }
});

test('a scenario with tied cards includes every tied leader', () => {
  const report = createBatchReport(example.scenarios);
  assert.deepEqual(report.scenarios[1].comparison.leaderCardIds,
    ['fictional-grocery','fictional-simple']);
});

test('scenario order is deterministic independent of user input order', () => {
  const forwards = createBatchReport(example.scenarios);
  const backwards = createBatchReport([...example.scenarios].reverse());
  assert.deepEqual(backwards, forwards);
});

test('does not mutate caller scenarios, cards or transactions', () => {
  const original = clone(example.scenarios);
  createBatchReport(example.scenarios);
  assert.deepEqual(example.scenarios, original);
});

test('rejects empty batch and missing scenarios', () => {
  for (const value of [[], null, undefined, {}]) {
    assert.throws(() => createBatchReport(value), /scenarios must be a non-empty array/);
  }
});

test('rejects invalid or duplicate scenario IDs', () => {
  const c = clone(example.scenarios[0]);
  c.id = ' ';
  assert.throws(() => createBatchReport([c]), /id must be a non-empty/);
  assert.throws(() => createBatchReport([example.scenarios[0], clone(example.scenarios[0])]),
    /duplicate batch scenario id/);
});

test('rejects comparisons with fewer than two cards', () => {
  const c = clone(example.scenarios[0]);
  c.cards = c.cards.slice(0,1);
  assert.throws(() => createBatchReport([c]), /scenario synthetic-groceries: cards must contain at least two/);
});

test('rejects invalid years and transaction month mismatches', () => {
  const c = clone(example.scenarios[0]);
  c.year = 2027;
  assert.throws(() => createBatchReport([c]), /transaction.*month must be/);
});

test('rejects duplicate transactions and unsafe amounts via existing engine', () => {
  const c = clone(example.scenarios[0]);
  c.transactions.push(clone(c.transactions[0]));
  assert.throws(() => createBatchReport([c]), /duplicate transaction id/);
  c.transactions.pop();
  c.transactions[0].amountPaise = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => createBatchReport([c]), /non-negative safe integer/);
});

test('an invalid scenario rejects the whole batch, not a partial result', () => {
  const c = clone(example.scenarios[0]);
  c.cards = [];
  assert.throws(() => createBatchReport([...example.scenarios, c]), /duplicate batch scenario id/);
  c.id = 'bad-scenario';
  assert.throws(() => createBatchReport([...example.scenarios, c]), /scenario bad-scenario/);
});

test('no spending still has 12 zero monthly summaries and preserves annual fees', () => {
  const c = clone(example.scenarios[0]);
  c.id = 'empty-year';
  c.transactions = [];
  c.cards[0].annualFeePaise = 5000;
  const report = createBatchReport([c]);
  const entry = report.scenarios[0].comparison.entries.find(x => x.cardId === c.cards[0].id);
  assert.equal(entry.calculation.annualFeeChargedPaise, 5000);
  const monthly = report.scenarios[0].monthlyByCard.find(x => x.cardId === c.cards[0].id);
  assert.ok(monthly.months.every(x => x.totalSpendPaise === 0 && x.totalRewardsPaise === 0));
});

test('month and card reporting are sorted by existing comparison order', () => {
  const report = createBatchReport(example.scenarios);
  for (const scenario of report.scenarios) {
    assert.deepEqual(scenario.monthlyByCard.map(x=>x.cardId),
      scenario.comparison.entries.map(x=>x.cardId));
    for (const card of scenario.monthlyByCard) {
      assert.equal(card.months[0].month, scenario.year + '-01');
      assert.equal(card.months.at(-1).month, scenario.year + '-12');
    }
  }
});

test('reports limitations rather than implying card allocation or actual issuer data', () => {
  const report = createBatchReport(example.scenarios);
  const note = report.limitations.join(' ');
  assert.match(note, /independently|synthetic/i);
  assert.match(note, /calendar months are not issuer statement cycles/i);
  assert.match(note, /independent/i);
});
