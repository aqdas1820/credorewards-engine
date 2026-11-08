import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const fixture = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'fictional-v1', issuer: 'Fictional', cardVariant: 'Synthetic',
    effectiveFrom: '2026-01-01',
    terms: { id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }] },
    evidence: [], review: { status: 'draft' }
  }]
});

test('effective date schema rejects malformed years, months and days', () => {
  for (const date of [
    '1999-12-31', '2101-01-01', '2026-00-01', '2026-13-01',
    '2026-01-00', '2026-01-32', '2026-1-01', '2026-01-1',
    '2026-01-01T00:00:00Z', ' 2026-01-01', '2026-01-01 ',
    '', null, 20260101
  ]) {
    const catalog = fixture();
    catalog.revisions[0].effectiveFrom = date;
    const before = structuredClone(catalog);
    const result = validateCatalogJsonSchema(catalog);
    assert.equal(result.valid, false, 'Expected invalid date shape: ' + String(date));
    assert.ok(result.errors.some(error =>
      error.instancePath === '/revisions/0/effectiveFrom'),
      'Expected field diagnostic: ' + String(date));
    assert.deepEqual(catalog, before);
  }
});

test('date shape schema permits boundaries but does not assert Gregorian validity', () => {
  for (const date of ['2000-01-01', '2024-02-29', '2100-12-31', '2026-02-31']) {
    const catalog = fixture();
    catalog.revisions[0].effectiveFrom = date;
    assert.deepEqual(validateCatalogJsonSchema(catalog), { valid: true, errors: [] });
  }
});
