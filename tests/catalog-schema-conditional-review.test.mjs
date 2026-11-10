import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

// Synthetic metadata only: schema shape validation never verifies issuer terms.
function catalog() {
  return {
    schemaVersion: 1,
    revisions: [{
      revisionId: 'synthetic-v1',
      issuer: 'Fictional Issuer',
      cardVariant: 'Fictional Card',
      effectiveFrom: '2026-01-01',
      terms: {
        id: 'fictional', name: 'Fictional', annualFeePaise: 0,
        rules: [{ id: 'base', category: '*', rateBps: 100 }]
      },
      evidence: [],
      review: { status: 'draft' }
    }]
  };
}

function rejectsAt(value, path, keyword) {
  const result = validateCatalogJsonSchema(value);
  assert.equal(result.valid, false, JSON.stringify(result));
  assert.ok(result.errors.some(error =>
    error.instancePath === path && error.keyword === keyword
  ), JSON.stringify(result.errors));
}

test('reviewed revisions require reviewer, date and at least one evidence record', () => {
  const input = catalog();
  input.revisions[0].review.status = 'reviewed';
  rejectsAt(input, '/revisions/0/review/reviewer', 'required');
  rejectsAt(input, '/revisions/0/review/reviewedOn', 'required');
  rejectsAt(input, '/revisions/0/evidence', 'minItems');

  input.revisions[0].review.reviewer = 'Synthetic Reviewer';
  input.revisions[0].review.reviewedOn = '2026-01-02';
  input.revisions[0].evidence.push({
    url: 'https://example.org/fictional-terms',
    documentTitle: 'Synthetic terms',
    retrievedOn: '2026-01-01'
  });
  assert.deepEqual(validateCatalogJsonSchema(input), { valid: true, errors: [] });
});

test('draft revisions can have no evidence without reviewer metadata', () => {
  assert.deepEqual(validateCatalogJsonSchema(catalog()), { valid: true, errors: [] });
});

test('nested monetary and evidence constraints reject malformed catalog input', () => {
  const badMoney = catalog();
  badMoney.revisions[0].terms.rules[0].monthlyCapPaise = Number.MAX_SAFE_INTEGER + 1;
  rejectsAt(badMoney, '/revisions/0/terms/rules/0/monthlyCapPaise', 'maximum');

  const badEvidence = catalog();
  badEvidence.revisions[0].evidence.push({
    url: 'http://example.org/not-https',
    documentTitle: 'Synthetic',
    retrievedOn: '2026-01-01'
  });
  rejectsAt(badEvidence, '/revisions/0/evidence/0/url', 'pattern');

  const unknown = catalog();
  unknown.revisions[0].terms.rules[0].unrecognized = true;
  rejectsAt(unknown, '/revisions/0/terms/rules/0/unrecognized', 'additionalProperties');
});
