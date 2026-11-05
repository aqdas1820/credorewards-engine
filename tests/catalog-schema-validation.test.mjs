import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRuleCatalog } from '../dist/index.js';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const fixture = JSON.parse(readFileSync(new URL('../examples/fictional-catalog.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
function checkError(catalog, keyword, pathFragment) {
  const result = validateCatalogJsonSchema(catalog);
  assert.equal(result.valid, false, 'expected bundled schema to reject input');
  assert.ok(result.errors.some(issue => issue.keyword === keyword &&
    issue.instancePath.includes(pathFragment)), JSON.stringify(result.errors));
}
test('checked-in synthetic catalog passes full bundled schema constraints', () => {
  const result = validateCatalogJsonSchema(fixture);
  assert.deepEqual(result, { valid: true, errors: [] });
});
test('rejects unexpected top-level key', () => {
  checkError({ ...clone(fixture), extra: true }, 'additionalProperties', '/extra');
});
test('rejects unexpected revision, rule, evidence and review keys', () => {
  const sample = clone(fixture);
  sample.revisions[0].unknown = true;
  sample.revisions[0].terms.rules[0].unknown = true;
  sample.revisions[0].review.unknown = true;
  sample.revisions[0].evidence = [{
    url: 'https://example.org/fictional', documentTitle: 'Synthetic',
    retrievedOn: '2026-01-01', unknown: true
  }];
  const errors = validateCatalogJsonSchema(sample).errors;
  for (const fragment of ['/unknown','/terms/rules/0/unknown','/review/unknown',
    '/evidence/0/unknown']) {
    assert.ok(errors.some(issue => issue.keyword === 'additionalProperties' &&
      issue.instancePath.includes(fragment)), JSON.stringify(errors));
  }
});
test('rejects missing required fields at nested paths', () => {
  const c = clone(fixture);
  delete c.revisions[0].terms.rules[0].id;
  checkError(c, 'required', '/terms/rules/0/id');
});
test('requires schemaVersion exactly 1', () => {
  checkError({ ...clone(fixture), schemaVersion: 2 }, 'const', '/schemaVersion');
});
test('requires non-empty identifiers and categories', () => {
  const c = clone(fixture);
  c.revisions[0].terms.id = '   ';
  c.revisions[0].terms.rules[0].category = '';
  checkError(c, 'pattern', '/terms/id');
  checkError(c, 'minLength', '/rules/0/category');
});
test('rejects invalid money bounds and rates', () => {
  const c = clone(fixture);
  c.revisions[0].terms.annualFeePaise = Number.MAX_SAFE_INTEGER + 1;
  c.revisions[0].terms.rules[0].rateBps = 10001;
  checkError(c, 'maximum', '/annualFeePaise');
  checkError(c, 'maximum', '/rateBps');
});
test('rejects fractional basis points and paise', () => {
  const c = clone(fixture);
  c.revisions[0].terms.annualFeePaise = 1.5;
  c.revisions[0].terms.rules[0].rateBps = 1.5;
  checkError(c, 'type', '/annualFeePaise');
  checkError(c, 'type', '/rateBps');
});
test('rejects malformed calendar-date format in source metadata', () => {
  const c = clone(fixture);
  c.revisions[0].effectiveFrom = '01-01-2026';
  checkError(c, 'pattern', '/effectiveFrom');
});
test('reviewed entry requires reviewer and reviewedOn', () => {
  const c = clone(fixture);
  c.revisions[0].review = { status: 'reviewed' };
  c.revisions[0].evidence = [{
    url: 'https://example.org/dummy',documentTitle:'Synthetic',retrievedOn:'2026-01-01'
  }];
  checkError(c, 'required', '/review/reviewer');
  checkError(c, 'required', '/review/reviewedOn');
});
test('reviewed entry requires at least one source record', () => {
  const c = clone(fixture);
  c.revisions[0].review = {
    status: 'reviewed',reviewer:'Fixture reviewer',reviewedOn:'2026-01-01'
  };
  checkError(c, 'minItems', '/evidence');
});
test('draft entries may have no evidence or reviewer', () => {
  const result = validateCatalogJsonSchema(fixture);
  assert.equal(result.valid, true);
});
test('rejects unknown review status and non-HTTPS evidence', () => {
  const c = clone(fixture);
  c.revisions[0].review.status = 'trusted';
  c.revisions[0].evidence = [{
    url:'http://example.org/fake',documentTitle:'Synthetic',retrievedOn:'2026-01-01'
  }];
  checkError(c,'enum','/review/status');
  checkError(c,'pattern','/evidence/0/url');
});
test('schema validation is independent of Gregorian and cross-revision domain checks', () => {
  const c = clone(fixture);
  c.revisions[0].effectiveFrom = '2026-02-30';
  assert.equal(validateCatalogJsonSchema(c).valid,true);
  assert.throws(() => validateRuleCatalog(c), /valid YYYY-MM-DD/);
});
test('schema validator does not mutate the supplied catalog', () => {
  const original = clone(fixture);
  assert.equal(validateCatalogJsonSchema(fixture).valid,true);
  assert.deepEqual(fixture,original);
});
test('wrong root type returns clear type error', () => {
  checkError([], 'type', '');
});
test('schema errors expose stable JSON pointers', () => {
  const c = clone(fixture);
  c.revisions[1].terms.rules[0].rateBps = -5;
  const result = validateCatalogJsonSchema(c);
  assert.ok(result.errors.some(issue =>
    issue.instancePath === '/revisions/1/terms/rules/0/rateBps' &&
    issue.keyword === 'minimum'));
});
