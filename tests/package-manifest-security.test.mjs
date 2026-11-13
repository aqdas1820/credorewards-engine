import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('published package manifest has no automatic install, pack, publish or version lifecycle execution', () => {
  // npm invokes these hooks implicitly during installation, packing, publication or versioning.
  // Keep release steps explicit and reviewable rather than allowing hidden side effects.
  const forbiddenHooks = [
    'preinstall', 'install', 'postinstall',
    'preprepare', 'prepare', 'postprepare',
    'prepack', 'postpack',
    'prepublish', 'prepublishOnly', 'publish', 'postpublish',
    'preversion', 'version', 'postversion'
  ];
  for (const hook of forbiddenHooks) {
    assert.equal(Object.hasOwn(manifest.scripts ?? {}, hook), false,
      `Unexpected package lifecycle hook: ${hook}`);
  }
  assert.equal(manifest.private, false);
});

test('published entrypoints cannot escape package root or use absolute paths', () => {
  const targets = [
    manifest.main,
    manifest.types,
    ...Object.values(manifest.bin ?? {}),
    ...Object.values(manifest.exports ?? {}).flatMap(value =>
      typeof value === 'string' ? [value] : Object.values(value))
  ];
  assert.ok(targets.length >= 5, 'Expected published SDK and CLI targets');
  for (const target of targets) {
    assert.equal(typeof target, 'string');
    assert.match(target, /^(?:\.\/)?[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/,
      `Unsafe package entrypoint: ${target}`);
    assert.equal(target.split('/').includes('..'), false);
    assert.equal(target.includes('\\'), false);
  }
});

test('npm files allowlist excludes repository-only and secret-bearing paths', () => {
  assert.ok(Array.isArray(manifest.files), 'npm files must be an explicit allowlist');
  assert.deepEqual([...manifest.files].sort(),
    ['dist', 'bin', 'README.md', 'LICENSE', 'schemas'].sort());
});
