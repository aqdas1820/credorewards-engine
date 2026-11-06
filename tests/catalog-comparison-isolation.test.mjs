import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCatalogCards, compareCards } from '../dist/index.js';

const terms = (id, rateBps = 100) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps }]
});
const revision = (id, rateBps = 100) => ({
  revisionId: id + '-revision', issuer: 'FICTIONAL issuer',
  cardVariant: 'Synthetic variant', effectiveFrom: '2025-01-01',
  terms: terms(id, rateBps),
  evidence: [],
  review: { status: 'draft' }
});
const catalog = (...revisions) => ({ schemaVersion: 1, revisions });
const spend = [
  { id: 'jan', month: '2026-01', category: 'groceries', amountPaise: 10000 },
  { id: 'dec', month: '2026-12', category: 'utilities', amountPaise: 20000 }
];

test('catalog comparison ranking and provenance follow sorted card entries, not requested order', () => {
  const source = catalog(revision('z', 200), revision('b', 100), revision('a', 200));
  const ids = ['b', 'z', 'a'];
  const result = compareCatalogCards(source, ids, spend, 2026, { allowDraft: true });
  assert.deepEqual(result.comparison.entries.map(entry => entry.cardId), ['a', 'z', 'b']);
  assert.deepEqual(result.comparison.entries.map(entry => entry.rank), [1, 1, 3]);
  assert.deepEqual(result.comparison.leaderCardIds, ['a', 'z']);
  assert.deepEqual(result.selections.map(selection => selection.cardId), ['a', 'z', 'b']);
  assert.deepEqual(result.selections.map(selection => selection.revisionId),
    ['a-revision', 'z-revision', 'b-revision']);
  assert.deepEqual(result.comparison, compareCards(
    [terms('a', 200), terms('b', 100), terms('z', 200)], spend, 2026
  ));
  assert.deepEqual(compareCatalogCards(source, [...ids].reverse(), spend, 2026,
    { allowDraft: true }), result);
});

test('catalog comparison does not mutate caller-owned catalog, IDs or transactions', () => {
  const source = catalog(revision('a', 100), revision('b', 200));
  const ids = ['b', 'a'];
  const transactions = structuredClone(spend);
  const before = structuredClone({ source, ids, transactions });
  compareCatalogCards(source, ids, transactions, 2026, { allowDraft: true });
  assert.deepEqual({ source, ids, transactions }, before);
});

test('mutating returned comparison provenance does not rewrite the original catalog', () => {
  const source = catalog(revision('a', 100), revision('b', 200));
  const original = structuredClone(source);
  const result = compareCatalogCards(source, ['a', 'b'], spend, 2026, { allowDraft: true });
  result.selections[0].review.status = 'reviewed';
  result.comparison.entries[0].calculation.transactions[0].earnedPaise = 0;
  assert.deepEqual(source, original);
  assert.equal(compareCatalogCards(source, ['a', 'b'], spend, 2026,
    { allowDraft: true }).comparison.entries[0].calculation.totalRewardsPaise, 600);
});

test('draft review gate blocks a mixed draft/reviewed catalog even with another valid card', () => {
  const reviewed = revision('reviewed', 100);
  reviewed.evidence = [{
    url: 'https://example.org/synthetic-evidence',
    documentTitle: 'Fictional evidence', retrievedOn: '2026-01-01'
  }];
  reviewed.review = {
    status: 'reviewed', reviewer: 'Synthetic reviewer', reviewedOn: '2026-01-02'
  };
  const source = catalog(reviewed, revision('draft', 200));
  assert.throws(() => compareCatalogCards(source, ['reviewed', 'draft'], spend, 2026),
    /draft/);
  const result = compareCatalogCards(source, ['reviewed', 'draft'], spend, 2026,
    { allowDraft: true });
  assert.deepEqual(result.selections.map(entry => entry.review.status),
    ['draft', 'reviewed']);
});

test('catalog comparisons reject a missing candidate without partial ranking', () => {
  const source = catalog(revision('a'), revision('b'));
  assert.throws(() => compareCatalogCards(source, ['a', 'missing'], spend, 2026,
    { allowDraft: true }), /no applicable revision/);
});
