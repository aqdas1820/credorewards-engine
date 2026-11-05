import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRuleCatalog } from '../dist/index.js';

const fixture = JSON.parse(readFileSync(new URL('../examples/fictional-catalog.json', import.meta.url), 'utf8'));
const schema = JSON.parse(readFileSync(new URL('../schemas/rule-catalog.v1.schema.json', import.meta.url), 'utf8'));
const script = new URL('../scripts/check-catalog.mjs', import.meta.url);

test('fictional catalog is valid metadata and never asserts that bank evidence was verified', () => {
  assert.doesNotThrow(() => validateRuleCatalog(fixture));
  assert.equal(fixture.schemaVersion, 1);
  assert.ok(fixture.revisions.length >= 2);
  assert.ok(fixture.revisions.every(entry => entry.review.status === 'draft' && entry.evidence.length === 0));
});

test('standalone JSON Schema declares types and strict properties for all catalog levels', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, 1);
  for (const key of ['revision', 'cashbackRule', 'cardTerms', 'evidence', 'review']) {
    assert.equal(schema.$defs[key].type, 'object');
    assert.equal(schema.$defs[key].additionalProperties, false);
  }
  for (const required of ['revisionId', 'issuer', 'cardVariant', 'effectiveFrom', 'terms', 'evidence', 'review']) {
    assert.ok(schema.$defs.revision.required.includes(required));
  }
  assert.equal(schema.$defs.cashbackRule.properties.rateBps.maximum, 10000);
  assert.equal(schema.$defs.paise.maximum, Number.MAX_SAFE_INTEGER);
  assert.equal(schema.$defs.review.properties.status.enum.includes('reviewed'), true);
  assert.ok(schema.$defs.revision.allOf.length > 0);
});

test('catalog CLI accepts the checked-in fictional fixture on Windows and Linux', () => {
  const result = spawnSync(process.execPath, [
    fileURLToPath(script),
    fileURLToPath(new URL('../examples/fictional-catalog.json', import.meta.url))
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid catalog metadata/);
});

test('offline CLI rejects malformed catalogs and non-JSON inputs', () => {
  const root = mkdtempSync(join(tmpdir(), 'catalog-fixture-test-'));
  try {
    const badCatalog = join(root, 'bad-catalog.json');
    const malformed = join(root, 'not-json.json');
    writeFileSync(badCatalog, JSON.stringify({
      schemaVersion: 1,
      revisions: [{
        ...structuredClone(fixture.revisions[0]),
        effectiveFrom: '2026-02-30'
      }]
    }));
    writeFileSync(malformed, 'not json');
    const invalid = spawnSync(process.execPath, [
      fileURLToPath(script), badCatalog, malformed
    ], { encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /valid YYYY-MM-DD/);
    assert.match(invalid.stderr, /Unexpected token|not valid JSON|JSON/);
    const valid = spawnSync(process.execPath, [
      fileURLToPath(script), fileURLToPath(new URL('../examples/fictional-catalog.json', import.meta.url))
    ], { encoding: 'utf8' });
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /2 revisions \(0 recorded as reviewed\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
