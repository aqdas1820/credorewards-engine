import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const base = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'synthetic-2026',
    issuer: 'Fictional issuer',
    cardVariant: 'Synthetic card',
    effectiveFrom: '2026-01-01',
    terms: {
      id: 'synthetic', name: 'Synthetic card', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }]
    },
    evidence: [],
    review: { status: 'draft' }
  }]
});

test('draft catalog permits missing evidence without claiming issuer verification', () => {
  assert.equal(validateCatalogJsonSchema(base()).valid, true);
});

test('reviewed revision requires both reviewer metadata and evidence', () => {
  const missingMetadata = base();
  missingMetadata.revisions[0].review = { status: 'reviewed' };
  assert.equal(validateCatalogJsonSchema(missingMetadata).valid, false);

  const missingEvidence = base();
  missingEvidence.revisions[0].review = {
    status: 'reviewed', reviewer: 'Synthetic reviewer', reviewedOn: '2026-11-09'
  };
  assert.equal(validateCatalogJsonSchema(missingEvidence).valid, false);

  const complete = base();
  complete.revisions[0].review = {
    status: 'reviewed', reviewer: 'Synthetic reviewer', reviewedOn: '2026-11-09'
  };
  complete.revisions[0].evidence = [{
    url: 'https://example.com/synthetic-terms',
    documentTitle: 'Fictional terms', retrievedOn: '2026-11-09'
  }];
  assert.equal(validateCatalogJsonSchema(complete).valid, true);
});

test('schema rejects unknown financial terms and invalid numeric boundaries', () => {
  const unknown = base();
  unknown.revisions[0].terms.unrecognizedFeePaise = 100;
  assert.equal(validateCatalogJsonSchema(unknown).valid, false);

  for (const rateBps of [-1, 10001, 0.5]) {
    const invalid = base();
    invalid.revisions[0].terms.rules[0].rateBps = rateBps;
    assert.equal(validateCatalogJsonSchema(invalid).valid, false, String(rateBps));
  }
});
