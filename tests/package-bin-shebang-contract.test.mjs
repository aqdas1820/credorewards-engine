import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('every published CLI bin has a portable Node shebang and valid ESM source', () => {
  const bins = Object.entries(manifest.bin ?? {});
  assert.ok(bins.length > 0, 'Package must expose at least one CLI');
  for (const [name, path] of bins) {
    assert.match(name, /^[a-z][a-z0-9-]*$/, 'Invalid CLI command name');
    assert.match(path, /^bin\/[a-z0-9-]+\.mjs$/, 'CLI must point to a distributable ESM file');
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.ok(source.startsWith('#!/usr/bin/env node\n'),
      name + ' must have a portable Node shebang as the first line');
    assert.ok(!source.startsWith('\uFEFF'), name + ' must not have a BOM before the shebang');
  }
});
