import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// fileURLToPath(directory URL) retains a trailing separator on both platforms.
// Normalize it before checking descendant paths to avoid false traversal alerts.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('every declared package entrypoint exists after build', () => {
  const entrypoints = [
    manifest.main,
    manifest.types,
    ...Object.values(manifest.bin ?? {}),
    ...Object.values(manifest.exports ?? {}).flatMap(value =>
      typeof value === 'string' ? [value] : Object.values(value)
    )
  ];
  assert.ok(entrypoints.length > 0, 'No package entrypoints declared');
  for (const entrypoint of entrypoints) {
    assert.equal(typeof entrypoint, 'string');
    const absolute = resolve(root, entrypoint);
    assert.ok(absolute.startsWith(root + sep), 'Entrypoint escapes repository: ' + entrypoint);
    assert.ok(existsSync(absolute), 'Missing package entrypoint: ' + entrypoint);
  }
});
