import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('tied card rankings use stable UTF-16 ID order independent of locale collation', () => {
  const ids = ['é', 'Z', 'a', 'Ä', '😀'];
  const cards = Object.freeze(ids.map(id => Object.freeze({
    id, name: 'Fictional ' + id, annualFeePaise: 123, rules: Object.freeze([])
  })));
  const expectedIds = [...ids].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const original = String.prototype.localeCompare;
  try {
    String.prototype.localeCompare = function () {
      throw new Error('ranking must not depend on localeCompare');
    };
    for (const candidate of [cards, Object.freeze([...cards].reverse())]) {
      const result = compareCards(candidate, Object.freeze([]), 2026);
      assert.deepEqual(result.entries.map(entry => entry.cardId), expectedIds);
      assert.deepEqual(result.leaderCardIds, expectedIds);
      assert.deepEqual(result.entries.map(entry => entry.rank), [1, 1, 1, 1, 1]);
      assert.deepEqual(result.entries.map(entry => entry.differenceFromLeaderPaise), [0, 0, 0, 0, 0]);
      assert.deepEqual(result.entries.map(entry => entry.netAnnualValuePaise), [-123, -123, -123, -123, -123]);
    }
  } finally {
    String.prototype.localeCompare = original;
  }
});
