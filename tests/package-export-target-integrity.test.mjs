import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

test('all public package export targets exist and remain inside the package', () => {
  const exports = manifest.exports;
  assert.ok(exports && typeof exports === 'object');
  for (const [specifier, entry] of Object.entries(exports)) {
    assert.ok(specifier === '.' || specifier.startsWith('./'), `Invalid export specifier: ${specifier}`);
    const targets = typeof entry === 'string' ? [entry] : Object.values(entry);
    assert.ok(targets.length > 0, `Missing export targets for ${specifier}`);
    for (const target of targets) {
      assert.equal(typeof target, 'string', `Invalid export target for ${specifier}`);
      assert.ok(target.startsWith('./') && !isAbsolute(target),
        `Export target must be package-relative: ${specifier}`);
      const absolute = resolve(root, target);
      const within = relative(root, absolute);
      assert.ok(within && within !== '..' && !within.startsWith('..' + sep) && !isAbsolute(within),
        `Export target escapes package root: ${specifier}`);
      assert.ok(existsSync(absolute), `Export target is missing: ${specifier} -> ${target}`);
      assert.ok(statSync(absolute).isFile(), `Export target is not a file: ${target}`);
      const real = relative(realpathSync(root), realpathSync(absolute));
      assert.ok(real && real !== '..' && !real.startsWith('..' + sep) && !isAbsolute(real),
        `Export target resolves outside package root: ${specifier}`);
      const packaged = manifest.files.some(prefix =>
        within === prefix || within.startsWith(prefix + sep));
      assert.ok(packaged, `Export target excluded from npm package files: ${specifier} -> ${target}`);
    }
  }
});
