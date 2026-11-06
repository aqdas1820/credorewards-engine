import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = name => join(root, 'bin', name);
const commands = ['credorewards.mjs', 'credorewards-catalog.mjs', 'credorewards-batch.mjs'];

function invoke(command, args) {
  return spawnSync(process.execPath, [cli(command), ...args], {
    cwd: root, encoding: 'utf8'
  });
}

test('all three CLIs fail closed on malformed JSON without emitting a partial result', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-invalid-cli-'));
  try {
    const file = join(dir, 'broken.json');
    writeFileSync(file, '{ "incomplete": ');
    for (const command of commands) {
      const result = invoke(command, [file]);
      assert.equal(result.status, 1, command + ': ' + result.stderr);
      assert.equal(result.stdout, '', command + ' emitted partial output');
      assert.ok(result.stderr.trim().length > 0, command + ' lacked a diagnostic');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('all three CLIs reject nonexistent input files without printing JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'credorewards-missing-cli-'));
  try {
    const absent = join(dir, 'does-not-exist.json');
    for (const command of commands) {
      const result = invoke(command, [absent]);
      assert.equal(result.status, 1, command + ': ' + result.stderr);
      assert.equal(result.stdout, '', command + ' emitted partial output');
      assert.match(result.stderr, /ENOENT|no such file/i, command);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('all three CLIs support --help without requiring an input file', () => {
  for (const command of commands) {
    const result = invoke(command, ['--help']);
    assert.equal(result.status, 0, command + ': ' + result.stderr);
    assert.match(result.stdout, /Usage:/, command);
  }
});
