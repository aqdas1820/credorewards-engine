import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('package entrypoints remain relative to the distributable and explicitly declared', () => {
  const paths = [
    manifest.main,
    manifest.types,
    ...Object.values(manifest.bin ?? {}),
    ...Object.values(manifest.exports ?? {}).flatMap(value =>
      typeof value === 'string' ? [value] : Object.values(value)
    )
  ];
  assert.ok(paths.length > 0);
  for (const path of paths) {
    assert.equal(typeof path, 'string');
    assert.match(path, /^(?:\.\/)?(?:dist|bin|schemas)\/[a-zA-Z0-9_./-]+$/);
    assert.ok(!path.split('/').includes('..'), 'Package entrypoint must not traverse directories: ' + path);
    assert.ok(!path.includes('\\'), 'Package entrypoint must use portable separators: ' + path);
  }
});

test('package manifest cannot introduce install or publish lifecycle execution unnoticed', () => {
  const forbidden = [
    'preinstall', 'install', 'postinstall',
    'prepublish', 'prepublishOnly', 'publish', 'postpublish',
    'prepare', 'prepack', 'postpack'
  ];
  for (const name of forbidden) {
    assert.equal(Object.hasOwn(manifest.scripts ?? {}, name), false,
      'Review lifecycle script before enabling: ' + name);
  }
});

test('npm package allowlist excludes private repository material', () => {
  assert.equal(manifest.private, false);
  assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
  for (const path of manifest.files) {
    assert.match(path, /^(?:dist|bin|schemas|README\.md|LICENSE)$/);
  }
});
