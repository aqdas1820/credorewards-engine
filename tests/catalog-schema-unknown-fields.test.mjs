import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

function catalog() {
  return {
    schemaVersion: 1,
    revisions: [{
      revisionId: 'synthetic-2026', issuer: 'Fictional', cardVariant: 'Demo',
      effectiveFrom: '2026-01-01',
      terms: {
        id: 'synthetic', name: 'Demo', annualFeePaise: 0,
        rules: [{ id: 'base', category: '*', rateBps: 100 }]
      },
      evidence: [], review: { status: 'draft' }
    }]
  };
}

const diagnostics = input => validateCatalogJsonSchema(input).errors
  .map(({ instancePath, keyword }) => instancePath + ':' + keyword);

test('rejects unexpected keys at each nested schema boundary', () => {
  const input = catalog();
  input.unexpected = true;
  input.revisions[0].extra = true;
  input.revisions[0].terms.extra = true;
  input.revisions[0].terms.rules[0].extra = true;
  input.revisions[0].review.extra = true;
  const expected = [
    '/unexpected:additionalProperties',
    '/revisions/0/extra:additionalProperties',
    '/revisions/0/terms/extra:additionalProperties',
    '/revisions/0/terms/rules/0/extra:additionalProperties',
    '/revisions/0/review/extra:additionalProperties'
  ];
  const actual = diagnostics(input);
  assert.deepEqual([...actual].sort(), [...expected].sort());
  assert.deepEqual(diagnostics(input), actual);
});

test('escapes unknown keys and preserves input without mutation', () => {
  const input = catalog();
  input.revisions[0].terms.rules[0]['unknown/~key'] = { nested: true };
  const snapshot = structuredClone(input);
  assert.deepEqual(diagnostics(input), [
    '/revisions/0/terms/rules/0/unknown~1~0key:additionalProperties'
  ]);
  assert.deepEqual(input, snapshot);
});

test('valid optional nested fields remain accepted', () => {
  const input = catalog();
  input.revisions[0].terms.rules[0].monthlyCapPaise = 0;
  input.revisions[0].terms.feeWaiverExcludedCategories = ['fuel'];
  input.revisions[0].review.notes = 'Synthetic example only';
  assert.deepEqual(diagnostics(input), []);
});
