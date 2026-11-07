import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const catalog = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'fictional-2026', issuer: 'Fictional',
    cardVariant: 'Synthetic', effectiveFrom: '2026-01-01',
    terms: {
      id: 'fictional', name: 'Synthetic', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }]
    },
    evidence: [], review: { status: 'draft' }
  }]
});

const keys = value => validateCatalogJsonSchema(value).errors
  .map(({ instancePath, keyword }) => instancePath + ':' + keyword);

test('nested required fields report precise paths without inventing child errors', () => {
  const input = catalog();
  delete input.revisions[0].terms.rules[0].rateBps;
  delete input.revisions[0].review.status;
  const diagnostics = keys(input);
  assert.ok(diagnostics.includes('/revisions/0/terms/rules/0/rateBps:required'));
  assert.ok(diagnostics.includes('/revisions/0/review/status:required'));
  assert.equal(diagnostics.filter(key => key.endsWith(':required')).length, 2);
});

test('invalid nested container types fail closed without traversal crashes', () => {
  const input = catalog();
  input.revisions[0].terms.rules = null;
  input.revisions[0].evidence = 'not an array';
  input.revisions[0].review = [];
  const before = structuredClone(input);
  const diagnostics = keys(input);
  assert.ok(diagnostics.includes('/revisions/0/terms/rules:type'));
  assert.ok(diagnostics.includes('/revisions/0/evidence:type'));
  assert.ok(diagnostics.includes('/revisions/0/review:type'));
  assert.deepEqual(input, before);
  assert.deepEqual(keys(input), diagnostics);
});

test('reviewed-only provenance requirements do not leak into draft revisions', () => {
  const input = catalog();
  assert.deepEqual(keys(input), []);
  input.revisions[0].review.status = 'reviewed';
  const diagnostics = keys(input);
  assert.ok(diagnostics.includes('/revisions/0/review/reviewer:required'));
  assert.ok(diagnostics.includes('/revisions/0/review/reviewedOn:required'));
  assert.ok(diagnostics.includes('/revisions/0/evidence:minItems'));
  input.revisions[0].review.status = 'draft';
  assert.deepEqual(keys(input), []);
});
