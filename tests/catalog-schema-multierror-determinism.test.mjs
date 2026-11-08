import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

test('independent root schema violations report all errors without changing input', () => {
  const input = { schemaVersion: 2, revisions: 'not-an-array', unexpected: true };
  const before = structuredClone(input);
  const result = validateCatalogJsonSchema(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.instancePath === '/schemaVersion' && e.keyword === 'const'));
  assert.ok(result.errors.some(e => e.instancePath === '/revisions' && e.keyword === 'type'));
  assert.ok(result.errors.some(e =>
    e.instancePath === '/unexpected' && e.keyword === 'additionalProperties'));
  assert.deepEqual(input, before);
  assert.deepEqual(validateCatalogJsonSchema(input), result);
});

test('missing required root properties are identified independently', () => {
  const input = {};
  const result = validateCatalogJsonSchema(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.instancePath === '/schemaVersion' && e.keyword === 'required'));
  assert.ok(result.errors.some(e => e.instancePath === '/revisions' && e.keyword === 'required'));
  assert.deepEqual(validateCatalogJsonSchema({ schemaVersion: 1, revisions: [] }),
    { valid: true, errors: [] });
});

test('malformed scalar and null roots fail closed without throwing', () => {
  for (const value of [null, false, 0, '', [], 'catalog']) {
    const first = validateCatalogJsonSchema(value);
    assert.equal(first.valid, false, 'Invalid root accepted: ' + String(value));
    assert.ok(first.errors.some(e => e.keyword === 'type'));
    assert.deepEqual(validateCatalogJsonSchema(value), first);
  }
});
