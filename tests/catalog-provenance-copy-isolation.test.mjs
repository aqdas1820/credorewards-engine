import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCardTerms, resolveAnnualCardTerms, compareCatalogCards
} from '../dist/index.js';

const source = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'fictional-v1', issuer: 'Synthetic issuer',
    cardVariant: 'Fictional', effectiveFrom: '2025-01-01',
    effectiveThrough: '2027-12-31',
    terms: {
      id: 'fictional', name: 'Synthetic cashback', annualFeePaise: 25,
      excludedCategories: ['rent'],
      feeWaiverExcludedCategories: ['fuel'],
      rules: [{ id: 'base', category: '*', rateBps: 100,
        monthlyCapPaise: 500, annualCapPaise: 1500 }]
    },
    evidence: [{
      url: 'https://example.org/fictional-terms',
      documentTitle: 'Fictional source, not an issuer statement',
      retrievedOn: '2026-01-02', section: 'Synthetic section'
    }],
    review: {
      status: 'reviewed', reviewer: 'Synthetic reviewer',
      reviewedOn: '2026-01-03', notes: 'Synthetic fixture only'
    }
  }]
});

function mutateResolved(revision) {
  revision.terms.name = 'MUTATED';
  revision.terms.rules[0].rateBps = 10000;
  revision.terms.excludedCategories.push('groceries');
  revision.terms.feeWaiverExcludedCategories.push('utilities');
  revision.evidence[0].url = 'https://example.org/changed';
  revision.evidence[0].section = 'changed';
  revision.review.status = 'draft';
  revision.review.reviewer = 'changed';
}

test('dated and annual resolution return independently mutable provenance copies', () => {
  const catalog = source();
  const snapshot = structuredClone(catalog);
  const dated = resolveCardTerms(catalog, 'fictional', '2026-02-01');
  const annual = resolveAnnualCardTerms(catalog, 'fictional', 2026);
  mutateResolved(dated);
  assert.deepEqual(catalog, snapshot);
  assert.deepEqual(annual, snapshot.revisions[0]);
  mutateResolved(annual);
  assert.deepEqual(catalog, snapshot);
  assert.deepEqual(resolveCardTerms(catalog, 'fictional', '2026-12-31'),
    snapshot.revisions[0]);
  assert.deepEqual(resolveAnnualCardTerms(catalog, 'fictional', 2026),
    snapshot.revisions[0]);
});

test('catalog comparison provenance and calculations do not alias source history', () => {
  const catalog = source();
  const original = structuredClone(catalog);
  const transactions = [{
    id: 't1', month: '2026-01', category: 'groceries', amountPaise: 10000
  }];
  const first = compareCatalogCards(catalog, ['fictional'], transactions, 2026);
  const snapshot = structuredClone(first);
  const selection = first.selections[0];
  selection.evidence[0].url = 'https://example.org/modified';
  selection.review.status = 'draft';
  selection.terms.rules[0].rateBps = 10000;
  assert.deepEqual(catalog, original);
  assert.deepEqual(compareCatalogCards(catalog, ['fictional'], transactions, 2026),
    snapshot);
});

test('reviewed provenance copy does not silently promote a draft revision', () => {
  const catalog = source();
  catalog.revisions[0].review = { status: 'draft' };
  assert.throws(() => resolveCardTerms(catalog, 'fictional', '2026-01-01'),
    /draft/);
  const allowed = resolveCardTerms(catalog, 'fictional', '2026-01-01',
    { allowDraft: true });
  allowed.review.status = 'reviewed';
  assert.equal(catalog.revisions[0].review.status, 'draft');
  assert.throws(() => resolveAnnualCardTerms(catalog, 'fictional', 2026),
    /draft/);
  assert.throws(() => compareCatalogCards(catalog, ['fictional'], [], 2026),
    /draft/);
});
