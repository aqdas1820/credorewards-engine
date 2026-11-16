import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('npm CLI bin names and targets remain explicit and package-local', () => {
  const bins = manifest.bin;
  assert.ok(bins && typeof bins === 'object' && !Array.isArray(bins));
  assert.deepEqual(Object.keys(bins).sort(), [
    'credorewards', 'credorewards-batch', 'credorewards-catalog'
  ].sort());

  const targets = Object.values(bins);
  assert.equal(new Set(targets).size, targets.length, 'CLI aliases must not silently share a target');
  for (const [name, target] of Object.entries(bins)) {
    assert.match(name, /^credorewards(?:-[a-z]+)?$/);
    assert.equal(typeof target, 'string');
    assert.match(target, /^bin\/[a-z0-9-]+\.mjs$/, `Unsafe CLI target for ${name}: ${target}`);
    assert.equal(target.includes('..'), false);
    assert.equal(target.includes('\\'), false);
  }
});
