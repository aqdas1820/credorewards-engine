import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRuleCatalog, resolveCardTerms, resolveAnnualCardTerms, compareCatalogCards
} from '../dist/index.js';

const card = (id, rateBps = 100) => ({
  id, name: 'Fictional card ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps }]
});
const revision = (id, overrides = {}) => ({
  revisionId: id + '-rev-1',
  issuer: 'FICTIONAL issuer',
  cardVariant: 'Test-only synthetic cashback card',
  effectiveFrom: '2026-01-01',
  terms: card(id),
  evidence: [],
  review: { status: 'draft' },
  ...overrides
});
const catalog = (...revisions) => ({ schemaVersion: 1, revisions });
const syntheticEvidence = () => ({
  url: 'https://example.org/fictional-test-document',
  documentTitle: 'Synthetic test fixture, not an issuer source',
  retrievedOn: '2026-01-10',
  section: 'Fictional rates'
});
const markedReviewed = entry => ({
  ...entry,
  evidence: [syntheticEvidence()],
  review: { status: 'reviewed', reviewer: 'Synthetic test reviewer', reviewedOn: '2026-01-11' }
});

test('validates a synthetic draft but blocks it by default', () => {
  const source = catalog(revision('demo'));
  assert.doesNotThrow(() => validateRuleCatalog(source));
  assert.throws(() => resolveCardTerms(source, 'demo', '2026-05-20'), /draft/);
  assert.equal(resolveCardTerms(source, 'demo', '2026-05-20', { allowDraft: true }).terms.id, 'demo');
});

test('requires both evidence and review metadata for a reviewed revision', () => {
  const bare = revision('demo');
  assert.throws(() => validateRuleCatalog(catalog({
    ...bare, review: { status: 'reviewed', reviewer: 'Reviewer', reviewedOn: '2026-01-10' }
  })), /source evidence/);
  assert.throws(() => validateRuleCatalog(catalog({
    ...bare, evidence: [syntheticEvidence()], review: { status: 'reviewed' }
  })), /reviewer/);
  assert.throws(() => validateRuleCatalog(catalog({
    ...bare, evidence: [syntheticEvidence()], review: { status: 'reviewed', reviewer: 'Reviewer' }
  })), /reviewedOn/);
  assert.doesNotThrow(() => validateRuleCatalog(catalog(markedReviewed(bare))));
});

test('reviewed revision resolves without draft override', () => {
  const source = catalog(markedReviewed(revision('demo')));
  assert.equal(resolveCardTerms(source, 'demo', '2026-12-31').revisionId, 'demo-rev-1');
});

test('enforces HTTPS public-host source metadata', () => {
  for (const url of ['http://example.org/file', 'https://alice@example.org/path', 'https://localhost/file', 'https://example.org:8080/file', 'file:///etc/passwd']) {
    const entry = markedReviewed(revision('demo'));
    entry.evidence[0].url = url;
    assert.throws(() => validateRuleCatalog(catalog(entry)), /HTTPS URL/, url);
  }
});

test('rejects invalid evidence dates and calendar overflow', () => {
  const entry = markedReviewed(revision('demo'));
  entry.evidence[0].retrievedOn = '2026-02-29';
  assert.throws(() => validateRuleCatalog(catalog(entry)), /valid YYYY-MM-DD/);
  assert.throws(() => validateRuleCatalog(catalog(revision('demo', {
    effectiveFrom: '2026-13-01'
  }))), /valid YYYY-MM-DD/);
  assert.doesNotThrow(() => validateRuleCatalog(catalog(revision('demo', {
    effectiveFrom: '2024-02-29'
  }))));
});

test('rejects inverted effective periods and duplicate revision identifiers', () => {
  assert.throws(() => validateRuleCatalog(catalog(revision('a', {
    effectiveFrom: '2026-07-01', effectiveThrough: '2026-06-30'
  }))), /must not precede/);
  assert.throws(() => validateRuleCatalog(catalog(revision('a'), revision('b', {
    revisionId: 'a-rev-1'
  }))), /duplicate revision id/);
});

test('rejects overlapping effective intervals for one card', () => {
  const first = revision('same', { effectiveThrough: '2026-07-31' });
  const second = revision('same', { revisionId: 'same-rev-2', effectiveFrom: '2026-07-31' });
  assert.throws(() => validateRuleCatalog(catalog(first, second)), /overlapping effective periods/);
});

test('adjacent, nonoverlapping revisions are resolved by date', () => {
  const first = revision('same', { effectiveThrough: '2026-06-30' });
  const second = revision('same', {
    revisionId: 'same-rev-2', effectiveFrom: '2026-07-01',
    terms: card('same', 300)
  });
  const source = catalog(first, second);
  assert.equal(resolveCardTerms(source, 'same', '2026-06-30', { allowDraft: true }).revisionId, 'same-rev-1');
  assert.equal(resolveCardTerms(source, 'same', '2026-07-01', { allowDraft: true }).revisionId, 'same-rev-2');
  assert.throws(() => resolveCardTerms(source, 'other', '2026-01-01', { allowDraft: true }), /no applicable revision/);
});

test('does not infer annual rewards across a mid-year issuer change', () => {
  const first = revision('same', { effectiveThrough: '2026-06-30' });
  const second = revision('same', {
    revisionId: 'same-rev-2', effectiveFrom: '2026-07-01', terms: card('same', 300)
  });
  assert.throws(() =>
    resolveAnnualCardTerms(catalog(first, second), 'same', 2026, { allowDraft: true }),
    /split-year calculations are not supported/
  );
});

test('resolves a single revision covering a complete calendar year', () => {
  const entry = revision('demo', {
    effectiveFrom: '2025-06-01',
    effectiveThrough: '2027-01-01'
  });
  assert.equal(resolveAnnualCardTerms(catalog(entry), 'demo', 2026, { allowDraft: true }).revisionId, 'demo-rev-1');
  assert.throws(() => resolveAnnualCardTerms(catalog(entry), 'demo', 2027, { allowDraft: true }), /full year/);
});

test('returns independent deep-enough copies to protect catalog integrity', () => {
  const original = revision('demo', { terms: { ...card('demo'), excludedCategories: ['rent'] } });
  const source = catalog(original);
  const result = resolveCardTerms(source, 'demo', '2026-01-15', { allowDraft: true });
  result.terms.rules[0].rateBps = 999;
  result.terms.excludedCategories.push('utilities');
  result.review.status = 'reviewed';
  assert.equal(source.revisions[0].terms.rules[0].rateBps, 100);
  assert.deepEqual(source.revisions[0].terms.excludedCategories, ['rent']);
  assert.equal(source.revisions[0].review.status, 'draft');
});

test('rejects malformed cashback rules before they enter the catalog', () => {
  assert.throws(() => validateRuleCatalog(catalog(revision('demo', {
    terms: card('demo', 10001)
  }))), /rateBps/);
  assert.throws(() => validateRuleCatalog(catalog(revision('demo', {
    terms: { ...card('demo'), annualFeePaise: -1 }
  }))), /non-negative/);
  assert.throws(() => validateRuleCatalog(catalog(revision('demo', {
    terms: { ...card('demo'), rules: [{ id: 'x', category: '*', rateBps: 100 }, { id: 'x', category: '*', rateBps: 200 }] }
  }))), /duplicate rule id/);
});

test('validates schema version, nonempty IDs and requested dates', () => {
  assert.throws(() => validateRuleCatalog({ schemaVersion: 2, revisions: [] }), /schemaVersion/);
  assert.throws(() => validateRuleCatalog(catalog(revision('', { revisionId: '' }))), /revisionId/);
  assert.throws(() => resolveCardTerms(catalog(revision('a')), 'a', '2026-02-30', { allowDraft: true }), /valid YYYY-MM-DD/);
  assert.throws(() => resolveAnnualCardTerms(catalog(revision('a')), 'a', 1999, { allowDraft: true }), /year must/);
});

test('ranks annual catalog candidates with correct review and version provenance', () => {
  const a = markedReviewed(revision('a', { terms: card('a', 500) }));
  const b = markedReviewed(revision('b', { terms: card('b', 200) }));
  const source = catalog(b, a);
  const tx = [{ id: 'tx', month: '2026-01', category: 'groceries', amountPaise: 100000 }];
  const result = compareCatalogCards(source, ['b', 'a'], tx, 2026);
  assert.deepEqual(result.comparison.entries.map(x => x.cardId), ['a', 'b']);
  assert.deepEqual(result.comparison.entries.map(x => x.netAnnualValuePaise), [5000, 2000]);
  assert.deepEqual(result.selections.map(x => x.revisionId), ['a-rev-1', 'b-rev-1']);
  assert.equal(result.selections[0].evidence[0].url, 'https://example.org/fictional-test-document');
  assert.equal(result.selections[0].review.status, 'reviewed');
});

test('does not allow draft candidates into catalog comparisons by default', () => {
  const source = catalog(revision('a'), revision('b'));
  const tx = [];
  assert.throws(() => compareCatalogCards(source, ['a', 'b'], tx, 2026), /draft/);
  assert.equal(
    compareCatalogCards(source, ['a', 'b'], tx, 2026, { allowDraft: true }).comparison.leaderCardIds.length,
    2
  );
});

test('rejects invalid candidate counts and duplicate cards', () => {
  const source = catalog(revision('a'));
  assert.throws(() => compareCatalogCards(source, ['a'], [], 2026, { allowDraft: true }), /at least two/);
  assert.throws(() => compareCatalogCards(source, ['a', 'a'], [], 2026, { allowDraft: true }), /duplicate card id/);
});
