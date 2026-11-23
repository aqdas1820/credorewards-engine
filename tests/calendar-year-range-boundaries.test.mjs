import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Fictional inputs pin the supported inclusive year boundary and strict YYYY-MM format.
const card = Object.freeze({
  id: 'synthetic-calendar-bounds',
  name: 'Synthetic calendar bounds',
  annualFeePaise: 0,
  rules: Object.freeze([Object.freeze({ id: 'all', category: '*', rateBps: 10000 })])
});
const tx = (month) => Object.freeze({
  id: 'calendar-boundary', month, category: 'synthetic', amountPaise: 101
});

test('inclusive supported years 2000 and 2100 calculate exact paise', () => {
  for (const year of [2000, 2100]) {
    const result = calculateRewards(card, Object.freeze([tx(`${year}-12`)]), year);
    assert.equal(result.year, year);
    assert.equal(result.totalSpendPaise, 101);
    assert.equal(result.totalRewardsPaise, 101);
    assert.equal(result.transactions[0].month, `${year}-12`);
  }
});

test('reject out-of-range and noninteger evaluation years', () => {
  for (const year of [1999, 2101, 2000.5, NaN, Infinity]) {
    assert.throws(() => calculateRewards(card, [tx('2000-01')], year), /year must be an integer 2000/);
  }
});

test('reject malformed and cross-year months at the supported year boundary', () => {
  for (const month of ['2100-00', '2100-13', '2100-1', '2100-001', '2099-12', '2100-12-01']) {
    assert.throws(() => calculateRewards(card, [tx(month)], 2100), /month must be YYYY-MM in 2100/);
  }
});
