import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCatalogCards } from '../dist/index.js';

const revision = id => ({
  revisionId: id + '-2025',
  issuer: 'FICTIONAL issuer',
  cardVariant: 'Synthetic variant',
  effectiveFrom: '2025-01-01',
  terms: {
    id, name: 'Synthetic ' + id, annualFeePaise: 0,
    rules: [{ id: 'all', category: '*', rateBps: 100 }]
  },
  evidence: [],
  review: { status: 'draft' }
});
const catalog = { schemaVersion: 1, revisions: [revision('a'), revision('b')] };
const transactions = [{ id: 'jan', month: '2026-01', category: 'food', amountPaise: 10000 }];
const options = { allowDraft: true };

test('catalog comparison ignores caller-defined ID iterators and array methods', () => {
  const ids = ['b', 'a'];
  Object.defineProperty(ids, Symbol.iterator, {
    value() { throw new Error('untrusted ID iterator'); }
  });
  ids.map = () => { throw new Error('untrusted ID map'); };
  ids.slice = () => { throw new Error('untrusted ID slice'); };
  const result = compareCatalogCards(catalog, ids, transactions, 2026, options);
  assert.deepEqual(result.comparison.leaderCardIds, ['a', 'b']);
  assert.deepEqual(result.selections.map(item => item.cardId), ['a', 'b']);
  assert.deepEqual(Array.from({ length: ids.length }, (_, index) => ids[index]), ['b', 'a']);
});

test('catalog comparison rejects sparse and inherited ID slots before resolving terms', () => {
  const sparse = ['a', 'b'];
  delete sparse[1];
  assert.throws(() => compareCatalogCards(catalog, sparse, transactions, 2026, options),
    /cardIds must contain non-empty card IDs/);

  const inherited = ['a', 'b'];
  delete inherited[1];
  const prototype = Object.create(Array.prototype);
  prototype[1] = 'b';
  Object.setPrototypeOf(inherited, prototype);
  assert.throws(() => compareCatalogCards(catalog, inherited, transactions, 2026, options),
    /cardIds must contain non-empty card IDs/);
});
