import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const validCatalog = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'synthetic-2026', issuer: 'Fictional',
    cardVariant: 'Synthetic', effectiveFrom: '2026-01-01',
    terms: {
      id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }]
    },
    evidence: [], review: { status: 'draft' }
  }]
});
const errors = input => validateCatalogJsonSchema(input).errors;
const has = (list, path, keyword) =>
  list.some(error => error.instancePath === path && error.keyword === keyword);

test('additionalProperties diagnostics escape slash and tilde per JSON Pointer', () => {
  const input = validCatalog();
  input['unexpected/a~b'] = true;
  input.revisions[0].terms['x/y~z'] = 1;
  const diagnostics = errors(input);
  assert.ok(has(diagnostics, '/unexpected~1a~0b', 'additionalProperties'));
  assert.ok(has(diagnostics, '/revisions/0/terms/x~1y~0z', 'additionalProperties'));
  assert.equal(diagnostics.length, 2);
});

test('nonempty strings validate Unicode code points and reject whitespace-only values', () => {
  const input = validCatalog();
  input.revisions[0].issuer = '🪙';
  input.revisions[0].terms.name = 'नमूना';
  assert.deepEqual(errors(input), []);
  input.revisions[0].issuer = '';
  input.revisions[0].terms.name = ' \t ';
  const diagnostics = errors(input);
  assert.ok(has(diagnostics, '/revisions/0/issuer', 'minLength'));
  assert.ok(has(diagnostics, '/revisions/0/issuer', 'pattern'));
  assert.ok(has(diagnostics, '/revisions/0/terms/name', 'pattern'));
});

test('paise schema enforces safe integer boundaries without mutating inputs', () => {
  const input = validCatalog();
  input.revisions[0].terms.annualFeePaise = Number.MAX_SAFE_INTEGER;
  assert.deepEqual(errors(input), []);
  input.revisions[0].terms.annualFeePaise = Number.MAX_SAFE_INTEGER + 1;
  input.revisions[0].terms.rules[0].monthlyCapPaise = 1.5;
  const before = structuredClone(input);
  const diagnostics = errors(input);
  assert.ok(has(diagnostics, '/revisions/0/terms/annualFeePaise', 'maximum'));
  assert.ok(has(diagnostics, '/revisions/0/terms/rules/0/monthlyCapPaise', 'type'));
  assert.deepEqual(input, before);
  assert.deepEqual(errors(input), diagnostics);
});
