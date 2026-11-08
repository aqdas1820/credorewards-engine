import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

function catalog(status = 'draft') {
  return { schemaVersion: 1, revisions: [{
    revisionId: 'fictional-2026', issuer: 'Synthetic issuer',
    cardVariant: 'Fictional card', effectiveFrom: '2026-01-01',
    terms: { id: 'fictional', name: 'Synthetic', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }] },
    evidence: [], review: { status }
  }] };
}

test('reviewed catalog entries require dated reviewer and evidence', () => {
  const input = catalog('reviewed');
  const snapshot = structuredClone(input);
  const result = validateCatalogJsonSchema(input);
  assert.equal(result.valid, false);
  for (const [path, keyword] of [
    ['/revisions/0/review/reviewer', 'required'],
    ['/revisions/0/review/reviewedOn', 'required'],
    ['/revisions/0/evidence', 'minItems']
  ]) {
    assert.ok(result.errors.some(error =>
      error.instancePath === path && error.keyword === keyword),
      'Missing expected review gate diagnostic: ' + path);
  }
  assert.deepEqual(input, snapshot);
});

test('draft entries are not falsely promoted to reviewed schema requirements', () => {
  const input = catalog();
  assert.deepEqual(validateCatalogJsonSchema(input), { valid: true, errors: [] });
  input.revisions[0].review.status = 'reviewed';
  input.revisions[0].review.reviewer = 'Synthetic reviewer';
  input.revisions[0].review.reviewedOn = '2026-01-02';
  input.revisions[0].evidence.push({
    url: 'https://example.org/fictional', documentTitle: 'Synthetic document',
    retrievedOn: '2026-01-02'
  });
  assert.deepEqual(validateCatalogJsonSchema(input), { valid: true, errors: [] });
});

test('nested extra properties fail closed with precise JSON pointers', () => {
  const input = catalog();
  input.revisions[0].terms.rules[0]['unexpected/key'] = true;
  const result = validateCatalogJsonSchema(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error =>
    error.keyword === 'additionalProperties' &&
    error.instancePath === '/revisions/0/terms/rules/0/unexpected~1key'));
});
