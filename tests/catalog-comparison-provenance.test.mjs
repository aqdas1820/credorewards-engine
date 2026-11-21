import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCatalogCards } from '../dist/index.js';

const revision = (id, rateBps) => ({
  revisionId: `synthetic-${id}-2025`,
  issuer: 'FICTIONAL issuer',
  cardVariant: `Synthetic ${id}`,
  effectiveFrom: '2025-01-01',
  terms: {
    id, name: `Synthetic ${id}`, annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps }]
  },
  evidence: [{
    url: `https://example.org/synthetic-${id}`,
    documentTitle: 'Synthetic fixture only',
    retrievedOn: '2025-01-02',
    section: 'Fictional reward rate'
  }],
  review: { status: 'reviewed', reviewer: 'Synthetic fixture reviewer', reviewedOn: '2025-01-03' }
});

test('catalog comparison keeps provenance aligned with deterministic tied ranking', () => {
  const source = {
    schemaVersion: 1,
    revisions: [revision('z', 200), revision('b', 100), revision('a', 200)]
  };
  const transactions = [{
    id: 'purchase', month: '2026-04', category: 'groceries', amountPaise: 10000
  }];
  const ids = ['z', 'b', 'a'];
  const first = compareCatalogCards(source, ids, transactions, 2026);
  const second = compareCatalogCards(source, [...ids].reverse(), transactions, 2026);

  assert.deepEqual(first, second);
  assert.deepEqual(first.comparison.entries.map(entry => entry.cardId), ['a', 'z', 'b']);
  assert.deepEqual(first.comparison.entries.map(entry => entry.rank), [1, 1, 3]);
  assert.deepEqual(first.comparison.leaderCardIds, ['a', 'z']);
  assert.deepEqual(first.selections.map(entry => entry.cardId), ['a', 'z', 'b']);
  assert.deepEqual(first.selections.map(entry => entry.revisionId), [
    'synthetic-a-2025', 'synthetic-z-2025', 'synthetic-b-2025'
  ]);
  for (const selection of first.selections) {
    assert.equal(selection.evidence[0].url, `https://example.org/synthetic-${selection.cardId}`);
    assert.equal(selection.review.status, 'reviewed');
    assert.equal(selection.effectiveFrom, '2025-01-01');
  }
  assert.deepEqual(ids, ['z', 'b', 'a']);
  assert.deepEqual(source.revisions.map(entry => entry.terms.id), ['z', 'b', 'a']);
});
