import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('published npm CLI targets are regular, package-local Node entrypoints', () => {
  const bins = manifest.bin;
  assert.ok(bins && typeof bins === 'object' && !Array.isArray(bins));
  assert.ok(Object.keys(bins).length > 0, 'Expected explicit CLI commands');
  const canonicalRoot = realpathSync(root);
  for (const [command, target] of Object.entries(bins)) {
    assert.equal(typeof target, 'string', `Invalid target for ${command}`);
    const path = resolve(root, target);
    assert.ok(path.startsWith(root.endsWith(sep) ? root : root + sep),
      `CLI target escapes package root: ${command}`);
    const stat = lstatSync(path);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(),
      `CLI target must be a regular file: ${command}`);
    const canonicalPath = realpathSync(path);
    assert.ok(canonicalPath.startsWith(canonicalRoot + sep),
      `CLI target resolves outside package root: ${command}`);
    const firstLine = readFileSync(path, 'utf8').split(/\r?\n/, 1)[0];
    assert.equal(firstLine, '#!/usr/bin/env node',
      `CLI target must have a Node shebang: ${command}`);
  }
});
