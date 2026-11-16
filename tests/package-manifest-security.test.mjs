import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
  // npm exports may nest conditions or use arrays of fallback targets. Check every leaf.
  const exportTargets = [];
  function collectTargets(value) {
    if (typeof value === 'string') {
      exportTargets.push(value);
    } else if (Array.isArray(value)) {
      for (const entry of value) collectTargets(entry);
    } else if (value !== null && typeof value === 'object') {
      for (const entry of Object.values(value)) collectTargets(entry);
    } else {
      assert.fail('Unexpected non-path package export target');
    }
  }
  collectTargets(manifest.exports);
  const targets = [
    manifest.main,
    manifest.types,
    ...Object.values(manifest.bin ?? {}),
    ...exportTargets
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

test('npm cannot implicitly expose an entire directory as CLI commands', () => {
  // npm supports directories.bin as an alternative to explicit bin mappings.
  // Keep command exposure limited to the individually reviewed manifest.bin entries.
  assert.equal(Object.hasOwn(manifest.directories ?? {}, 'bin'), false,
    'Unexpected implicit npm CLI command directory');
});

test('published SDK export targets resolve to regular package-local files', () => {
  // npm test builds dist first. Validate actual targets, not just manifest path strings.
  const packageRoot = fileURLToPath(new URL('../', import.meta.url));
  const targets = [];
  function collect(value) {
    if (typeof value === 'string') targets.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value !== null && typeof value === 'object') Object.values(value).forEach(collect);
    else assert.fail('Unexpected package export target type');
  }
  collect(manifest.exports);
  targets.push(manifest.main, manifest.types);
  assert.ok(targets.length >= 4, 'Expected SDK export targets');
  for (const target of targets) {
    assert.match(target, /^(?:\.\/)?[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/,
      `Unsafe export target: ${target}`);
    const filePath = fileURLToPath(new URL(target.startsWith('./') ? target : `./${target}`,
      new URL('../', import.meta.url)));
    assert.ok(filePath.startsWith(packageRoot), `Export target escaped package: ${target}`);
    const stat = lstatSync(filePath);
    assert.equal(stat.isSymbolicLink(), false, `Symlink export target: ${target}`);
    assert.equal(stat.isFile(), true, `Non-file export target: ${target}`);
  }
});
