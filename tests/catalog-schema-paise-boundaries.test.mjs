import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const makeCatalog = () => ({
  schemaVersion: 1,
  revisions: [{
    revisionId: 'synthetic-2026', issuer: 'Fictional issuer',
    cardVariant: 'Fictional card', effectiveFrom: '2026-01-01',
    terms: {
      id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }]
    },
    evidence: [], review: { status: 'draft' }
  }]
});

test('schema rejects unsafe and non-integer paise at every declared monetary field', () => {
  const paths = [
    ['annualFeePaise'],
    ['annualFeeWaiverThresholdPaise'],
    ['rules', 0, 'minTransactionPaise'],
    ['rules', 0, 'monthlyCapPaise'],
    ['rules', 0, 'annualCapPaise']
  ];
  const bad = [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '100'];
  for (const path of paths) {
    for (const value of bad) {
      const input = makeCatalog();
      let target = input.revisions[0].terms;
      for (const key of path.slice(0, -1)) target = target[key];
      target[path.at(-1)] = value;
      const result = validateCatalogJsonSchema(input);
      assert.equal(result.valid, false,
        'Expected rejection for ' + path.join('.') + ': ' + String(value));
      const pointer = '/revisions/0/terms/' + path.join('/');
      assert.ok(result.errors.some(error => error.instancePath === pointer),
        'Missing diagnostic for ' + pointer + ': ' + String(value));
    }
  }
});

test('schema accepts integer-paise bounds without mutating synthetic input', () => {
  for (const amount of [0, 1, Number.MAX_SAFE_INTEGER]) {
    const input = makeCatalog();
    input.revisions[0].terms.annualFeePaise = amount;
    input.revisions[0].terms.annualFeeWaiverThresholdPaise = amount;
    Object.assign(input.revisions[0].terms.rules[0], {
      minTransactionPaise: amount, monthlyCapPaise: amount, annualCapPaise: amount
    });
    const before = structuredClone(input);
    assert.deepEqual(validateCatalogJsonSchema(input), { valid: true, errors: [] });
    assert.deepEqual(input, before);
  }
});
