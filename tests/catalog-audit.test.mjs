import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCatalogUpdate, validateRuleCatalog } from '../dist/index.js';

const terms = (id, rate = 100) => ({
  id, name: 'Synthetic card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: rate }]
});
const evidence = () => ({
  url: 'https://example.org/fictional-source',
  documentTitle: 'Synthetic source metadata for tests',
  retrievedOn: '2026-02-01'
});
const draft = (id = 'a', from = '2026-01-01') => ({
  revisionId: id + '-rev1', issuer: 'Fictional Issuer',
  cardVariant: 'Synthetic Cashback', effectiveFrom: from,
  terms: terms(id), evidence: [], review: { status: 'draft', notes: 'Synthetic data only' }
});
const catalog = (...revisions) => ({ schemaVersion: 1, revisions });
const clone = data => structuredClone(data);
const approve = original => ({
  ...clone(original), evidence: [evidence()],
  review: { status: 'reviewed', notes: 'Synthetic data only', reviewer: 'Test Reviewer', reviewedOn: '2026-02-02' }
});

test('reports new revisions deterministically without changing inputs', () => {
  const before = catalog(draft('a'));
  const next = catalog(draft('c'), draft('a'), draft('b'));
  const frozenBefore = clone(before);
  assert.deepEqual(auditCatalogUpdate(before, next), {
    addedRevisionIds: ['b-rev1', 'c-rev1'],
    closedRevisionIds: [],
    promotedRevisionIds: [],
    evidenceAppendedRevisionIds: [],
    unchangedRevisionIds: ['a-rev1']
  });
  assert.deepEqual(before, frozenBefore);
});

test('permits append-only evidence on drafts and records additions', () => {
  const original = draft();
  const later = clone(original);
  later.evidence.push(evidence());
  const result = auditCatalogUpdate(catalog(original), catalog(later));
  assert.deepEqual(result.evidenceAppendedRevisionIds, ['a-rev1']);
});

test('records promotion with evidence and reviewer metadata', () => {
  const original = draft();
  const later = approve(original);
  const report = auditCatalogUpdate(catalog(original), catalog(later));
  assert.deepEqual(report.promotedRevisionIds, ['a-rev1']);
  assert.deepEqual(report.evidenceAppendedRevisionIds, ['a-rev1']);
});

test('permits one-time period closure alongside an adjacent successor', () => {
  const original = draft();
  const closed = { ...clone(original), effectiveThrough: '2026-06-30' };
  const successor = {
    ...draft('a', '2026-07-01'),
    revisionId: 'a-rev2', terms: terms('a', 200)
  };
  const next = catalog(successor, closed);
  assert.doesNotThrow(() => validateRuleCatalog(next));
  assert.deepEqual(auditCatalogUpdate(catalog(original), next).closedRevisionIds, ['a-rev1']);
});

test('rejects deleting an historical revision', () => {
  assert.throws(() => auditCatalogUpdate(catalog(draft()), catalog()), /cannot delete historical/);
});

test('rejects same-ID change in reward rates, issuer or applicability start', () => {
  for (const mutate of [
    next => { next.terms.rules[0].rateBps = 500; },
    next => { next.terms.name = 'Changed'; },
    next => { next.issuer = 'New Issuer'; },
    next => { next.effectiveFrom = '2026-02-01'; }
  ]) {
    const original = draft();
    const next = clone(original);
    mutate(next);
    assert.throws(() => auditCatalogUpdate(catalog(original), catalog(next)), /new revisionId/);
  }
});

test('ignores irrelevant JSON object-property order changes', () => {
  const original = draft();
  const next = {
    review: { notes: original.review.notes, status: 'draft' },
    evidence: [],
    terms: { rules: clone(original.terms.rules), annualFeePaise: 0,
      name: original.terms.name, id: original.terms.id },
    effectiveFrom: original.effectiveFrom,
    cardVariant: original.cardVariant, issuer: original.issuer,
    revisionId: original.revisionId
  };
  assert.deepEqual(auditCatalogUpdate(catalog(original), catalog(next)).unchangedRevisionIds, ['a-rev1']);
});

test('rejects changing or removing historical evidence', () => {
  const original = draft();
  original.evidence.push(evidence());
  const changed = clone(original);
  changed.evidence[0].documentTitle = 'Tampered source metadata';
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(changed)), /rewrite existing evidence/);
  const removed = clone(original);
  removed.evidence = [];
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(removed)), /rewrite existing evidence/);
});

test('rejects evidence append after recorded review', () => {
  const approved = approve(draft());
  const next = clone(approved);
  next.evidence.push({ ...evidence(), section: 'Append without re-review' });
  assert.throws(() => auditCatalogUpdate(catalog(approved), catalog(next)), /reviewed evidence is frozen/);
});

test('rejects changing a review record without valid promotion', () => {
  const original = draft();
  const next = clone(original);
  next.review.notes = 'Changed notes';
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(next)), /review record cannot be rewritten/);
});

test('rejects changing review notes during promotion', () => {
  const original = draft();
  const next = approve(original);
  next.review.notes = 'Changed during review';
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(next)), /review notes cannot be rewritten/);
});

test('rejects downgrading a reviewed revision', () => {
  const original = approve(draft());
  const next = clone(original);
  next.review.status = 'draft';
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(next)), /cannot be downgraded/);
});

test('rejects reopening or changing a previously closed period', () => {
  const original = { ...draft(), effectiveThrough: '2026-06-30' };
  const reopened = clone(original);
  delete reopened.effectiveThrough;
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(reopened)), /cannot reopen/);
  const moved = clone(original);
  moved.effectiveThrough = '2026-07-01';
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(moved)), /cannot reopen/);
});

test('rejects invalid proposed catalogs before allowing history changes', () => {
  const original = draft();
  const next = clone(original);
  next.terms.rules[0].rateBps = -1;
  assert.throws(() => auditCatalogUpdate(catalog(original), catalog(next)), /rateBps/);
});

test('allows closed reviewed revision to retain its historical evidence', () => {
  const original = approve(draft());
  const next = { ...clone(original), effectiveThrough: '2026-12-31' };
  assert.deepEqual(auditCatalogUpdate(catalog(original), catalog(next)).closedRevisionIds, ['a-rev1']);
});
