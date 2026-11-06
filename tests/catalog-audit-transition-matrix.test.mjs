import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCatalogUpdate } from '../dist/index.js';

const evidence = suffix => ({
  url: 'https://example.org/synthetic-' + suffix,
  documentTitle: 'Synthetic evidence ' + suffix,
  retrievedOn: '2026-01-10'
});
const draft = (id, from = '2026-01-01') => ({
  revisionId: id + '-v1',
  issuer: 'Fictional Issuer',
  cardVariant: 'Synthetic Variant',
  effectiveFrom: from,
  terms: {
    id, name: 'Fictional ' + id, annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  },
  evidence: [],
  review: { status: 'draft', notes: 'Synthetic-only' }
});
const reviewed = value => ({
  ...structuredClone(value),
  evidence: [evidence('one')],
  review: {
    status: 'reviewed', notes: 'Synthetic-only',
    reviewer: 'Synthetic Reviewer', reviewedOn: '2026-02-01'
  }
});
const catalog = (...revisions) => ({ schemaVersion: 1, revisions });

test('simultaneous legal closure, promotion, evidence append and new revision are sorted', () => {
  const original = [draft('c'), draft('a'), draft('b')];
  const closed = { ...structuredClone(original[0]), effectiveThrough: '2026-06-30' };
  const promoted = reviewed(original[1]);
  const appended = structuredClone(original[2]);
  appended.evidence.push(evidence('two'));
  const successor = { ...draft('c', '2026-07-01'), revisionId: 'c-v2' };
  const before = structuredClone(original);
  const proposed = [successor, appended, closed, promoted];
  const report = auditCatalogUpdate(catalog(...original), catalog(...proposed));
  assert.deepEqual(report, {
    addedRevisionIds: ['c-v2'],
    closedRevisionIds: ['c-v1'],
    promotedRevisionIds: ['a-v1'],
    evidenceAppendedRevisionIds: ['a-v1', 'b-v1'],
    unchangedRevisionIds: []
  });
  assert.deepEqual(original, before);
  assert.deepEqual(report, auditCatalogUpdate(
    catalog(...[...original].reverse()), catalog(...[...proposed].reverse())));
});

test('a closed reviewed revision cannot append new evidence in the same update', () => {
  const prior = reviewed(draft('a'));
  const next = { ...structuredClone(prior), effectiveThrough: '2026-12-31' };
  next.evidence.push(evidence('extra'));
  assert.throws(
    () => auditCatalogUpdate(catalog(prior), catalog(next)),
    /reviewed evidence is frozen/
  );
});

test('a reviewed revision cannot replace reviewer identity or reviewed date', () => {
  const prior = reviewed(draft('a'));
  for (const mutate of [
    next => { next.review.reviewer = 'Different Reviewer'; },
    next => { next.review.reviewedOn = '2026-02-02'; }
  ]) {
    const next = structuredClone(prior);
    mutate(next);
    assert.throws(
      () => auditCatalogUpdate(catalog(prior), catalog(next)),
      /review record cannot be rewritten/
    );
  }
});

test('a draft cannot silently reorder, remove or rewrite existing evidence', () => {
  const prior = draft('a');
  prior.evidence = [evidence('one'), evidence('two')];
  for (const mutate of [
    next => { next.evidence.reverse(); },
    next => { next.evidence.shift(); },
    next => { next.evidence[0].retrievedOn = '2026-01-11'; }
  ]) {
    const next = structuredClone(prior);
    mutate(next);
    assert.throws(
      () => auditCatalogUpdate(catalog(prior), catalog(next)),
      /cannot remove or rewrite existing evidence/
    );
  }
});

test('a promoted revision may not rewrite historical evidence while adding new entries', () => {
  const prior = draft('a');
  prior.evidence.push(evidence('one'));
  const next = reviewed(prior);
  next.evidence[0] = evidence('rewritten');
  next.evidence.push(evidence('two'));
  assert.throws(
    () => auditCatalogUpdate(catalog(prior), catalog(next)),
    /cannot remove or rewrite existing evidence/
  );
});
