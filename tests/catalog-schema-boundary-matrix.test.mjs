import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRuleCatalog } from '../dist/index.js';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const fixture = JSON.parse(readFileSync(new URL('../examples/fictional-catalog.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
function reject(catalog, keyword, path) {
  const { valid, errors } = validateCatalogJsonSchema(catalog);
  assert.equal(valid, false, JSON.stringify(errors));
  assert.ok(errors.some(error => error.keyword === keyword && error.instancePath === path),
    JSON.stringify(errors));
}

test('schema accepts safe integer paise maximum and boundary basis point rates', () => {
  for (const rateBps of [0, 10000]) {
    const catalog = clone(fixture);
    catalog.revisions[0].terms.annualFeePaise = Number.MAX_SAFE_INTEGER;
    catalog.revisions[0].terms.rules[0].rateBps = rateBps;
    assert.deepEqual(validateCatalogJsonSchema(catalog), { valid: true, errors: [] });
  }
});

test('schema rejects negative and over-limit amounts with precise nested pointers', () => {
  const cases = [
    ['annualFeePaise', -1, 'minimum'],
    ['annualFeePaise', Number.MAX_SAFE_INTEGER + 1, 'maximum'],
    ['annualFeeWaiverThresholdPaise', -1, 'minimum']
  ];
  for (const [field, value, keyword] of cases) {
    const catalog = clone(fixture);
    catalog.revisions[0].terms[field] = value;
    reject(catalog, keyword, '/revisions/0/terms/' + field);
  }
  for (const field of ['minTransactionPaise', 'monthlyCapPaise', 'annualCapPaise']) {
    const catalog = clone(fixture);
    catalog.revisions[0].terms.rules[0][field] = Number.MAX_SAFE_INTEGER + 1;
    reject(catalog, 'maximum', '/revisions/0/terms/rules/0/' + field);
  }
});

test('schema rejects missing reviewed evidence metadata and blank reviewer names', () => {
  const catalog = clone(fixture);
  catalog.revisions[0].review = {
    status: 'reviewed', reviewer: ' ', reviewedOn: '2026-01-01'
  };
  catalog.revisions[0].evidence = [{
    url: 'https://example.org/synthetic', documentTitle: 'Synthetic'
  }];
  reject(catalog, 'pattern', '/revisions/0/review/reviewer');
  reject(catalog, 'required', '/revisions/0/evidence/0/retrievedOn');
});

test('schema rejects unknown nested category and evidence keys', () => {
  const catalog = clone(fixture);
  catalog.revisions[0].terms.feeWaiverExcludedCategories = ['groceries', ''];
  catalog.revisions[0].evidence = [{
    url: 'https://example.org/synthetic', documentTitle: 'Synthetic',
    retrievedOn: '2026-01-01', forgedApproval: true
  }];
  reject(catalog, 'minLength', '/revisions/0/terms/feeWaiverExcludedCategories/1');
  reject(catalog, 'additionalProperties', '/revisions/0/evidence/0/forgedApproval');
});

test('schema enforces date shapes while domain validation rejects impossible dates', () => {
  for (const date of ['2026-02-30', '2100-02-29']) {
    const catalog = clone(fixture);
    catalog.revisions[0].effectiveFrom = date;
    assert.equal(validateCatalogJsonSchema(catalog).valid, true);
    assert.throws(() => validateRuleCatalog(catalog), /valid YYYY-MM-DD/);
  }
  const malformed = clone(fixture);
  malformed.revisions[0].effectiveFrom = '2026-2-01';
  reject(malformed, 'pattern', '/revisions/0/effectiveFrom');
});

test('schema validator returns deterministic errors and does not mutate input', () => {
  const catalog = clone(fixture);
  catalog.revisions[0].terms.annualFeePaise = -1;
  catalog.revisions[0].terms.rules[0].rateBps = 10001;
  const before = clone(catalog);
  const first = validateCatalogJsonSchema(catalog);
  const second = validateCatalogJsonSchema(catalog);
  assert.deepEqual(first, second);
  assert.deepEqual(catalog, before);
  assert.equal(first.valid, false);
  assert.ok(first.errors.length >= 2);
});
