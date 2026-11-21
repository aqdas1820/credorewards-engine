import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCardTerms, resolveAnnualCardTerms } from '../dist/index.js';

const terms = id => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const revision = (id, from, through, status = 'draft') => ({
  revisionId: id + '-' + from,
  issuer: 'FICTIONAL issuer', cardVariant: 'Synthetic test card',
  effectiveFrom: from, ...(through ? { effectiveThrough: through } : {}),
  terms: terms(id),
  evidence: status === 'reviewed' ? [{
    url: 'https://example.org/synthetic-only',
    documentTitle: 'Synthetic fixture, not real issuer terms',
    retrievedOn: '2024-02-29'
  }] : [],
  review: status === 'reviewed'
    ? { status, reviewer: 'Synthetic reviewer', reviewedOn: '2024-02-29' }
    : { status }
});

test('leap-day revision boundaries remain inclusive and calendar-safe', () => {
  const before = revision('demo', '2024-01-01', '2024-02-28');
  const after = revision('demo', '2024-02-29', '2024-12-31');
  const source = Object.freeze({ schemaVersion: 1, revisions: Object.freeze([
    Object.freeze(before), Object.freeze(after)
  ]) });
  assert.equal(resolveCardTerms(source, 'demo', '2024-02-28', { allowDraft: true }).revisionId, before.revisionId);
  assert.equal(resolveCardTerms(source, 'demo', '2024-02-29', { allowDraft: true }).revisionId, after.revisionId);
  assert.throws(() => resolveCardTerms(source, 'demo', '2024-03-00', { allowDraft: true }), /valid YYYY-MM-DD/);
  assert.throws(() => resolveAnnualCardTerms(source, 'demo', 2024, { allowDraft: true }), /split-year calculations are not supported/);
  assert.equal(source.revisions[0].effectiveThrough, '2024-02-28');
});

test('annual resolver accepts exact leap-year coverage but never bypasses draft gate', () => {
  const reviewed = revision('reviewed', '2024-01-01', '2024-12-31', 'reviewed');
  const draft = revision('draft', '2024-01-01', '2024-12-31');
  const source = { schemaVersion: 1, revisions: [reviewed, draft] };
  assert.equal(resolveAnnualCardTerms(source, 'reviewed', 2024).revisionId, reviewed.revisionId);
  assert.throws(() => resolveAnnualCardTerms(source, 'draft', 2024), /draft/);
  assert.equal(resolveAnnualCardTerms(source, 'draft', 2024, { allowDraft: true }).revisionId, draft.revisionId);
  assert.throws(() => resolveAnnualCardTerms(source, 'reviewed', 2025), /full year/);
  assert.throws(() => resolveCardTerms(source, 'reviewed', '2025-01-01'), /no applicable revision/);
});
