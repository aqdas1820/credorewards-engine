import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogJsonSchema } from '../bin/catalog-schema-validator.mjs';

const catalog = () => ({ schemaVersion: 1, revisions: [{
  revisionId: 'synthetic-2026', issuer: 'Fictional issuer',
  cardVariant: 'Synthetic card', effectiveFrom: '2026-01-01',
  terms: { id: 'synthetic', name: 'Synthetic card', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }] },
  evidence: [], review: { status: 'draft' }
}] });
const errorsFor = input => validateCatalogJsonSchema(input).errors.map(
  ({ instancePath, keyword }) => [instancePath, keyword]);
const hasError = (errors, path, keyword) =>
  errors.some(([p, k]) => p === path && k === keyword);

test('drafts may omit provenance; reviewed status requires reviewer, date and evidence', () => {
  const draft = catalog();
  assert.deepEqual(errorsFor(draft), []);
  const reviewed = structuredClone(draft);
  reviewed.revisions[0].review.status = 'reviewed';
  const errors = errorsFor(reviewed);
  assert.equal(errors.length, 3);
  assert.ok(hasError(errors, '/revisions/0/evidence', 'minItems'));
  assert.ok(hasError(errors, '/revisions/0/review/reviewer', 'required'));
  assert.ok(hasError(errors, '/revisions/0/review/reviewedOn', 'required'));
  reviewed.revisions[0].review.reviewer = 'Synthetic reviewer';
  reviewed.revisions[0].review.reviewedOn = '2026-02-01';
  reviewed.revisions[0].evidence.push({
    url: 'https://example.invalid/fictional', documentTitle: 'Synthetic terms',
    retrievedOn: '2026-01-01'
  });
  assert.deepEqual(errorsFor(reviewed), []);
  assert.deepEqual(errorsFor(draft), [], 'validation must not mutate caller input');
});

test('nested provenance and financial errors retain precise JSON pointer locations', () => {
  const input = catalog();
  input.revisions[0].terms.rules[0].rateBps = 10001;
  input.revisions[0].terms.rules[0].annualCapPaise = -1;
  input.revisions[0].evidence.push({
    url: 'http://example.invalid/unsafe', documentTitle: 'Synthetic',
    retrievedOn: 'not-a-date', unexpected: true
  });
  const errors = errorsFor(input);
  for (const [path, keyword] of [
    ['/revisions/0/terms/rules/0/rateBps', 'maximum'],
    ['/revisions/0/terms/rules/0/annualCapPaise', 'minimum'],
    ['/revisions/0/evidence/0/url', 'pattern'],
    ['/revisions/0/evidence/0/retrievedOn', 'pattern'],
    ['/revisions/0/evidence/0/unexpected', 'additionalProperties']
  ]) assert.ok(hasError(errors, path, keyword), 'Missing ' + path + ':' + keyword);
});

test('schema validation is deterministic and rejects wrong root and array shapes', () => {
  const input = catalog();
  input.revisions[0].review.status = 'reviewed';
  const first = validateCatalogJsonSchema(input);
  assert.equal(first.valid, false);
  assert.deepEqual(validateCatalogJsonSchema(input), first);
  assert.deepEqual(errorsFor({ schemaVersion: 1, revisions: 'not-an-array' }),
    [['/revisions', 'type']]);
  assert.deepEqual(errorsFor(null), [['', 'type']]);
});
