import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = json('../package.json');
const lockfile = json('../package-lock.json');
const notes = readFileSync(new URL('../docs/RELEASE-NOTES.md', import.meta.url), 'utf8');

test('release manifest and lockfile agree on the exact package version', () => {
  assert.match(manifest.version, /^\\d+\\.\\d+\\.\\d+-alpha\\.\\d+$/);
  assert.equal(lockfile.name, manifest.name);
  assert.equal(lockfile.version, manifest.version);
  assert.equal(lockfile.packages[''].name, manifest.name);
  assert.equal(lockfile.packages[''].version, manifest.version);
});

test('release notes match the candidate and npm tag remains a prerelease', () => {
  assert.equal(notes.split('\\n')[0], '# CredoRewards Engine v' + manifest.version);
  assert.equal(manifest.publishConfig.access, 'public');
  assert.equal(manifest.publishConfig.tag, 'next');
});
