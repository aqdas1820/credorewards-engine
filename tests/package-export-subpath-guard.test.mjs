import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('npm export subpath keys are explicit and cannot escape the package namespace', () => {
  assert.ok(manifest.exports && typeof manifest.exports === 'object' && !Array.isArray(manifest.exports));
  assert.ok(Object.hasOwn(manifest.exports, '.'), 'Expected the SDK root export');

  for (const key of Object.keys(manifest.exports)) {
    if (key === '.') continue;
    assert.match(key, /^\.\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/,
      `Unsafe npm export subpath: ${key}`);
    assert.equal(key.includes('*'), false, `Wildcard export requires dedicated review: ${key}`);
    assert.equal(key.split('/').includes('..'), false, `Parent traversal in export: ${key}`);
    assert.equal(key.includes('\\'), false, `Backslash in export: ${key}`);
  }
});
