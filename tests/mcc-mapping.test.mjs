import test from 'node:test';
import assert from 'node:assert/strict';
import { mapMccTransactions, calculateRewards } from '../dist/index.js';

const mappings = [
  { mcc: '0123', category: 'groceries' },
  { mcc: '5678', category: 'utilities' }
];
const tx = (id, mcc, amountPaise = 10000, month = '2026-01') =>
  ({ id, mcc, amountPaise, month });

test('maps only explicit, caller-supplied four-digit MCCs', () => {
  assert.deepEqual(mapMccTransactions([
    tx('one', '0123'), tx('two', '5678', 0, '2026-02')
  ], mappings), [
    { id: 'one', month: '2026-01', category: 'groceries', amountPaise: 10000 },
    { id: 'two', month: '2026-02', category: 'utilities', amountPaise: 0 }
  ]);
});

test('mapped inputs integrate without changing cashback or fee calculation', () => {
  const converted = mapMccTransactions([
    tx('a', '0123'), tx('b', '5678')
  ], mappings);
  const calculated = calculateRewards({
    id: 'fictional', name: 'Synthetic Card', annualFeePaise: 0,
    rules: [
      { id: 'grocery', category: 'groceries', rateBps: 500 },
      { id: 'fallback', category: '*', rateBps: 100 }
    ]
  }, converted, 2026);
  assert.equal(calculated.totalRewardsPaise, 600);
  assert.equal(calculated.netAnnualValuePaise, 600);
});

test('unknown MCC fails closed without guessing a fallback category', () => {
  assert.throws(() => mapMccTransactions([tx('unknown', '9999')], mappings),
    /unmapped MCC: 9999/);
  assert.throws(() => mapMccTransactions([tx('unmapped', '0000')], []),
    /unmapped MCC/);
});

test('rejects duplicate and malformed caller mapping definitions', () => {
  assert.throws(() => mapMccTransactions([], [mappings[0], mappings[0]]),
    /duplicate MCC mapping/);
  for (const invalid of [{ mcc: '123', category: 'x' }, { mcc: '12345', category: 'x' },
    { mcc: 1234, category: 'x' }, null, { mcc: '1234', category: ' ' }]) {
    assert.throws(() => mapMccTransactions([], [invalid]), /mapping/);
  }
  assert.throws(() => mapMccTransactions([], null), /mappings must be an array/);
});

test('rejects malformed transaction IDs, dates, MCCs and paise', () => {
  assert.throws(() => mapMccTransactions([tx(' ', '0123')], mappings), /id must be/);
  assert.throws(() => mapMccTransactions([
    tx('duplicate', '0123'), tx('duplicate', '5678')
  ], mappings), /duplicate transaction id/);
  for (const month of ['2026-00', '2026-13', '2026-1', '2026-01-01', '1999-12']) {
    assert.throws(() => mapMccTransactions([tx('bad', '0123', 100, month)], mappings),
      /month must be/);
  }
  for (const mcc of ['123', '12345', 1234, null, 'abcd', ' 1234']) {
    assert.throws(() => mapMccTransactions([tx('bad', mcc)], mappings),
      /mcc must be/);
  }
  for (const amount of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => mapMccTransactions([tx('bad', '0123', amount)], mappings),
      /amountPaise must be/);
  }
});

test('keeps input objects and mapping table immutable', () => {
  const transactions = [tx('b', '5678'), tx('a', '0123')];
  const beforeTransactions = structuredClone(transactions);
  const beforeMappings = structuredClone(mappings);
  const result = mapMccTransactions(transactions, mappings);
  assert.deepEqual(result.map(entry => entry.id), ['b', 'a']);
  assert.deepEqual(transactions, beforeTransactions);
  assert.deepEqual(mappings, beforeMappings);
});

test('accepts empty transactions without inventing spend or categories', () => {
  assert.deepEqual(mapMccTransactions([], []), []);
  assert.throws(() => mapMccTransactions(undefined, mappings), /transactions must be an array/);
});
