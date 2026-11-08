import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const fixture = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'synthetic-v1', issuer: 'Fictional issuer',
    cardVariant: 'Synthetic card', effectiveFrom: '2026-01-01',
    terms: {
      id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }]
    },
    evidence: [], review: { status: 'draft' }
  }]
});

test('cashback basis points reject invalid types and out-of-range values', () => {
  for (const value of [-1, 10001, 0.5, 9999.5, NaN, Infinity, '100', null, true]) {
    const catalog = fixture();
    catalog.revisions[0].terms.rules[0].rateBps = value;
    const before = structuredClone(catalog);
    const result = validateCatalogJsonSchema(catalog);
    assert.equal(result.valid, false, 'Expected invalid rateBps: ' + String(value));
    assert.ok(result.errors.some(error =>
      error.instancePath === '/revisions/0/terms/rules/0/rateBps'),
    'Expected field-specific diagnostic for ' + String(value));
    assert.deepEqual(catalog, before);
  }
});

test('cashback basis points accept zero and maximum without input mutation', () => {
  for (const value of [0, 1, 9999, 10000]) {
    const catalog = fixture();
    catalog.revisions[0].terms.rules[0].rateBps = value;
    const before = structuredClone(catalog);
    assert.deepEqual(validateCatalogJsonSchema(catalog), { valid: true, errors: [] });
    assert.deepEqual(catalog, before);
  }
});
