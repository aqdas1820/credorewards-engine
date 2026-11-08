import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

test('schema diagnostics escape JSON Pointer segments for unknown properties', () => {
  const catalog = { schemaVersion: 1, revisions: [], 'unexpected/key~name': true };
  const snapshot = structuredClone(catalog);
  const result = validateCatalogJsonSchema(catalog);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error =>
    error.keyword === 'additionalProperties' &&
    error.instancePath === '/unexpected~1key~0name'));
  assert.deepEqual(catalog, snapshot, 'validation must not modify caller input');
});

test('schema diagnostics are repeatable and do not retain mutable error state', () => {
  const invalid = { schemaVersion: 1, revisions: [], typo: true };
  const first = validateCatalogJsonSchema(invalid);
  assert.equal(first.valid, false);
  const baseline = structuredClone(first);
  first.errors[0].message = 'changed by consumer';
  first.errors.push({ instancePath: '/fake', keyword: 'fake', message: 'fake' });
  assert.deepEqual(validateCatalogJsonSchema(invalid), baseline);
  assert.deepEqual(validateCatalogJsonSchema({ schemaVersion: 1, revisions: [] }),
    { valid: true, errors: [] });
});

test('schema validation rejects unknown properties without traversing prototypes', () => {
  const catalog = JSON.parse('{"schemaVersion":1,"revisions":[],"__proto__":{"reviewed":true}}');
  const result = validateCatalogJsonSchema(catalog);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error =>
    error.keyword === 'additionalProperties' && error.instancePath === '/__proto__'));
  assert.equal(Object.prototype.reviewed, undefined);
});
