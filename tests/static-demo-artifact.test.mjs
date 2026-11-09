import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'site-dist');
const expected = [
  'index.html',
  'web/app.mjs',
  'web/scoreboard.mjs',
  'web/local-import.mjs',
  'web/purchase-input.mjs',
  'dist/index.js',
  'dist/purchase-impact.js',
  'dist/statement-cycles.js',
  'dist/batch.js',
  'dist/catalog.js',
  'dist/catalog-audit.js'
].sort();

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    assert.equal(lstatSync(path).isSymbolicLink(), false, 'static output contains symlink');
    if (entry.isDirectory()) return collect(path);
    assert.equal(entry.isFile(), true, 'static output contains non-file');
    return [relative(output, path).replaceAll('\\', '/')];
  });
}

test('static demo artifact contains exactly reviewed public assets', () => {
  try {
    const result = spawnSync(process.execPath, ['scripts/build-web-static.mjs'], {
      cwd: root, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(output), true);
    assert.deepEqual(collect(output).sort(), expected);
    const html = readFileSync(join(output, 'index.html'), 'utf8');
    assert.match(html, /<script\\s+type=["']module["']\\s+src=["']\\/web\\/app\\.mjs["']/i);
    for (const file of expected) {
      assert.deepEqual(readFileSync(join(output, file)),
        readFileSync(join(root, file === 'index.html' ? 'web/index.html' : file)),
        'built asset differs from allowlisted source: ' + file);
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
