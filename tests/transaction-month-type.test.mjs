import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport, comparePurchaseImpact } from '../dist/index.js';

const terms = id => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const cards = [terms('one'), terms('two')];
const transaction = month => ({
  id: 'bad', month, category: 'synthetic', amountPaise: 100
});
const expected = /transaction\[bad\]\.month must be YYYY-MM in 2026/;

test('transaction months must be primitive YYYY-MM strings across all public calculation APIs', () => {
  const invalid = [
    ['2026-01'], new String('2026-01'),
    { toString: () => '2026-01' }, null, 202601, false
  ];
  for (const month of invalid) {
    const tx = transaction(month);
    assert.throws(() => calculateRewards(cards[0], [tx], 2026), expected);
    assert.throws(() => compareCards(cards, [tx], 2026), expected);
    assert.throws(() => createBatchReport([{
      id: 'invalid', year: 2026, cards, transactions: [tx]
    }]), expected);
    assert.throws(() => comparePurchaseImpact(cards, [], tx, 2026), expected);
  }
});

test('month validation never invokes user-defined string coercion', () => {
  let coercions = 0;
  const month = { toString: () => { coercions++; return '2026-01'; } };
  assert.throws(() => calculateRewards(cards[0], [transaction(month)], 2026), expected);
  assert.equal(coercions, 0);
});

test('properly formatted primitive months still calculate and compare normally', () => {
  const tx = transaction('2026-01');
  const single = calculateRewards(cards[0], [tx], 2026);
  assert.equal(single.totalRewardsPaise, 1);
  const compared = compareCards(cards, [tx], 2026);
  assert.deepEqual(compared.entries.map(entry => entry.totalRewardsPaise), [1, 1]);
});
