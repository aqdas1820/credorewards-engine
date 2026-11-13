import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function declaredFile(value, label) {
  assert.equal(typeof value, 'string', label + ' must be a path');
  assert.match(value, /^\.\/[\w./-]+$/, label + ' must use a relative package path');
  const absolute = resolve(root, value);
  assert.ok(absolute.startsWith(root.endsWith(sep) ? root : root + sep),
    label + ' must stay inside the package');
  assert.ok(statSync(absolute).isFile(), label + ' must resolve to a file');
}

test('package runtime and declaration entrypoints exist after build', () => {
  declaredFile(manifest.main, 'main');
  declaredFile(manifest.types, 'types');
  assert.equal(manifest.exports['.'].default, manifest.main);
  assert.equal(manifest.exports['.'].types, manifest.types);
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (subpath === '.') continue;
    if (typeof target === 'string') {
      declaredFile(target, 'exports ' + subpath);
    } else {
      for (const [condition, path] of Object.entries(target)) {
        declaredFile(path, 'exports ' + subpath + ' ' + condition);
      }
    }
  }
  for (const [command, path] of Object.entries(manifest.bin)) {
    declaredFile('./' + path.replace(/^\.\//, ''), 'bin ' + command);
  }
});
