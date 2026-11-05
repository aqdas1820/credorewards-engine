import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'credorewards-package-'));
const npmCli = process.env.npm_execpath;

function run(command, args, cwd, shell = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`);
  return result.stdout;
}

function runNpm(args, cwd) {
  if (npmCli) return run(process.execPath, [npmCli, ...args], cwd);
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, cwd, process.platform === 'win32');
}

try {
  // npm 12 changed npm pack --json from an array to a keyed object.
  // Detect the uniquely created tarball instead of relying on npm CLI JSON output.
  runNpm(['pack', '--ignore-scripts', '--pack-destination', temp], root);
  const filenames = readdirSync(temp).filter(name => name.endsWith('.tgz'));
  assert.equal(filenames.length, 1, 'Expected exactly one packed npm tarball');
  const filename = filenames[0];
  assert.ok(filename && existsSync(join(temp, filename)), 'Expected npm tarball');

  runNpm([
    'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(temp, filename)
  ], temp);

  const installedDir = join(temp, 'node_modules', '@credonomics', 'rewards-engine');
  const metadata = JSON.parse(readFileSync(join(installedDir, 'package.json'), 'utf8'));
  assert.equal(metadata.bin?.credorewards, 'bin/credorewards.mjs', 'CLI mapping missing from package');

  const shim = join(temp, 'node_modules', '.bin', process.platform === 'win32'
    ? 'credorewards.cmd'
    : 'credorewards');
  assert.ok(existsSync(shim), 'npm did not create a CLI executable shim');

  const help = run(process.execPath, [join(installedDir, 'bin', 'credorewards.mjs'), '--help'], temp);
  assert.match(help, /Usage: credorewards/);

  const consumer = join(temp, 'consumer.mjs');
  writeFileSync(consumer, `import { calculateRewards } from '@credonomics/rewards-engine';
const card = { id: 'test', name: 'Test', annualFeePaise: 0,
  excludedCategories: [], rules: [{ id: 'base', category: '*', rateBps: 100 }] };
const tx = [{ id: '1', month: '2026-01', category: 'utilities', amountPaise: 10000 }];
if (calculateRewards(card, tx, 2026).totalRewardsPaise !== 100) process.exit(1);
`);
  run(process.execPath, [consumer], temp);
  console.log('Package smoke test passed: installed CLI and ESM import.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
