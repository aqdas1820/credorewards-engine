import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceFiles = [
  'scripts/build-web-static.mjs',
  'web/index.html',
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
];
const expected = sourceFiles.filter(file => !file.startsWith('scripts/'))
  .map(file => file === 'web/index.html' ? 'index.html' : file).sort();

function collect(directory, output) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    assert.equal(lstatSync(path).isSymbolicLink(), false, 'static output contains symlink');
    if (entry.isDirectory()) return collect(path, output);
    assert.equal(entry.isFile(), true, 'static output contains non-file');
    return [relative(output, path).replaceAll('\\', '/')];
  });
}

test('static demo artifact contains exactly reviewed public assets', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-artifact-'));
  const output = join(sandbox, 'site-dist');
  try {
    for (const file of sourceFiles) {
      const destination = join(sandbox, file);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(root, file), destination);
    }
    const result = spawnSync(process.execPath, ['scripts/build-web-static.mjs'], {
      cwd: sandbox, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(output), true);
    assert.deepEqual(collect(output, output).sort(), expected);
    const html = readFileSync(join(output, 'index.html'), 'utf8');
    assert.match(html, /<script\s+type=["']module["']\s+src=["']\/web\/app\.mjs["']/i);
    for (const file of expected) {
      assert.deepEqual(readFileSync(join(output, file)),
        readFileSync(join(root, file === 'index.html' ? 'web/index.html' : file)),
        'built asset differs from allowlisted source: ' + file);
    }
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
