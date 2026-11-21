import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'bin', 'credorewards-catalog.mjs');
const valid = join(root, 'examples', 'fictional-catalog.json');

test('catalog CLI validates later files despite earlier failures, in either order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-catalog-mixed-'));
  try {
    const malformed = join(dir, 'malformed.json');
    writeFileSync(malformed, '{');
    for (const args of [[malformed, valid], [valid, malformed]]) {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: root, encoding: 'utf8', timeout: 10000
      });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 1, 'Any invalid input must fail the command');
      assert.match(result.stdout, /valid catalog metadata;/);
      assert.ok(result.stdout.includes(valid + ':'), 'Valid input must be reported');
      assert.ok(result.stderr.includes(malformed + ':'), 'Invalid input must be reported');
      assert.doesNotMatch(result.stdout, /malformed\.json: valid catalog metadata/);
      assert.doesNotMatch(result.stderr, /\n\s+at\s/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
