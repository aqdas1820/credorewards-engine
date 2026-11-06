import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRuleCatalog, resolveCardTerms, resolveAnnualCardTerms, compareCatalogCards
} from '../dist/index.js';

const card = id => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const revision = (id, revisionId, effectiveFrom, effectiveThrough) => ({
  revisionId, issuer: 'Synthetic issuer', cardVariant: 'Fictional card',
  effectiveFrom, ...(effectiveThrough === undefined ? {} : { effectiveThrough }),
  terms: card(id), evidence: [], review: { status: 'draft' }
});
const catalog = (...revisions) => ({ schemaVersion: 1, revisions });
const options = { allowDraft: true };

test('closed effective interval is inclusive on both boundary days', () => {
  const source = catalog(revision('a', 'a-1', '2026-02-01', '2026-02-28'));
  assert.equal(resolveCardTerms(source, 'a', '2026-02-01', options).revisionId, 'a-1');
  assert.equal(resolveCardTerms(source, 'a', '2026-02-28', options).revisionId, 'a-1');
  assert.throws(() => resolveCardTerms(source, 'a', '2026-01-31', options), /no applicable revision/);
  assert.throws(() => resolveCardTerms(source, 'a', '2026-03-01', options), /no applicable revision/);
});

test('leap-day boundary permits next-day successor without overlapping', () => {
  const source = catalog(
    revision('a', 'a-1', '2024-01-01', '2024-02-29'),
    revision('a', 'a-2', '2024-03-01')
  );
  assert.doesNotThrow(() => validateRuleCatalog(source));
  assert.equal(resolveCardTerms(source, 'a', '2024-02-29', options).revisionId, 'a-1');
  assert.equal(resolveCardTerms(source, 'a', '2024-03-01', options).revisionId, 'a-2');
  assert.throws(() => resolveAnnualCardTerms(source, 'a', 2024, options),
    /split-year calculations are not supported/);
});

test('inclusive overlap is rejected even for a single shared leap day', () => {
  const source = catalog(
    revision('a', 'a-1', '2024-01-01', '2024-02-29'),
    revision('a', 'a-2', '2024-02-29')
  );
  assert.throws(() => validateRuleCatalog(source), /overlapping effective periods/);
});

test('open-ended revision rejects later same-card revisions but not other cards', () => {
  assert.throws(() => validateRuleCatalog(catalog(
    revision('a', 'a-1', '2026-01-01'),
    revision('a', 'a-2', '2027-01-01')
  )), /overlapping effective periods/);
  assert.doesNotThrow(() => validateRuleCatalog(catalog(
    revision('a', 'a-1', '2026-01-01'),
    revision('b', 'b-1', '2026-01-01')
  )));
});

test('year-wide resolution accepts exactly Jan 1 through Dec 31 and rejects gaps', () => {
  const full = catalog(revision('a', 'a-1', '2026-01-01', '2026-12-31'));
  assert.equal(resolveAnnualCardTerms(full, 'a', 2026, options).revisionId, 'a-1');
  for (const [from, through] of [
    ['2026-01-02', '2026-12-31'], ['2026-01-01', '2026-12-30']
  ]) {
    assert.throws(() => resolveAnnualCardTerms(
      catalog(revision('a', 'a-1', from, through)), 'a', 2026, options
    ), /split-year calculations are not supported/);
  }
});

test('comparison does not silently use a partial-year revision', () => {
  const source = catalog(
    revision('a', 'a-1', '2026-01-01', '2026-12-30'),
    revision('b', 'b-1', '2026-01-01')
  );
  assert.throws(() => compareCatalogCards(source, ['a', 'b'], [], 2026, options),
    /split-year calculations are not supported/);
});

test('resolution order does not depend on revision insertion order', () => {
  const earlier = revision('a', 'a-1', '2025-01-01', '2025-12-31');
  const later = revision('a', 'a-2', '2026-01-01');
  for (const revisions of [[earlier, later], [later, earlier]]) {
    const source = catalog(...revisions);
    assert.equal(resolveCardTerms(source, 'a', '2025-12-31', options).revisionId, 'a-1');
    assert.equal(resolveCardTerms(source, 'a', '2026-01-01', options).revisionId, 'a-2');
    assert.equal(resolveAnnualCardTerms(source, 'a', 2026, options).revisionId, 'a-2');
  }
});
