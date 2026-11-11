import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'credorewards-package-'));
const npmCli = process.env.npm_execpath;

function run(command, args, cwd, shell = false, env = process.env) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell, env });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`);
  return result.stdout;
}

function runNpm(args, cwd) {
  // npm 12 may export a user-level allow-scripts policy into npm run's
  // environment. When forwarded to a nested project-scoped npm install,
  // npm treats it as a forbidden CLI/env override and raises EALLOWSCRIPTS.
  // Remove only that inherited override; preserve the user's .npmrc policy
  // and the --ignore-scripts protection used by this smoke test.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !/^npm_config_allow[_-]scripts$/i.test(name))
  );
  if (npmCli) return run(process.execPath, [npmCli, ...args], cwd, false, env);
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, cwd, process.platform === 'win32', env);
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
  // Release privacy boundary: repository-only fixtures and local configuration
  // must never be bundled into the installable SDK tarball.
  for (const forbidden of [
    '.env', '.env.local', '.npmrc', '.git', '.github',
    'tests', 'examples', 'scripts', 'coverage', 'node_modules'
  ]) {
    assert.equal(existsSync(join(installedDir, forbidden)), false,
      'Unexpected repository-only content in npm package: ' + forbidden);
  }
  const metadata = JSON.parse(readFileSync(join(installedDir, 'package.json'), 'utf8'));
  const sourceManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(metadata.name, sourceManifest.name, 'Installed package name differs from source');
  assert.equal(metadata.version, sourceManifest.version, 'Installed package version differs from source');
  assert.equal(metadata.bin?.credorewards, 'bin/credorewards.mjs', 'CLI mapping missing from package');
  assert.equal(metadata.bin?.['credorewards-batch'], 'bin/credorewards-batch.mjs');
  assert.equal(metadata.bin?.['credorewards-catalog'], 'bin/credorewards-catalog.mjs');
  assert.equal(metadata.exports?.['./catalog-schema-validator']?.default,
    './bin/catalog-schema-validator.mjs');
  const schemaPath = join(installedDir, 'schemas', 'rule-catalog.v1.schema.json');
  assert.ok(existsSync(schemaPath), 'Public JSON Schema missing from installed tarball');
  const publishedSchema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  assert.equal(publishedSchema.properties?.schemaVersion?.const, 1);
  assert.equal(metadata.exports?.['./schemas/rule-catalog.v1.schema.json'],
    './schemas/rule-catalog.v1.schema.json', 'Public schema export missing');
  // Resolve the documented JSON Schema subpath from a real consuming project,
  // not by reaching inside node_modules. A manifest entry alone is insufficient.
  run(process.execPath, ['-e',
    "const s = require('@credonomics/rewards-engine/schemas/rule-catalog.v1.schema.json'); if (s.properties?.schemaVersion?.const !== 1) process.exit(1);"
  ], temp);

  // Check the actual npm-installed entrypoints, not just package.json's bin map.
  // A missing bundled script or npm shim would break consumers even if direct
  // invocations of source-tree scripts and library imports continue to pass.
  for (const [command, script] of Object.entries({
    credorewards: 'bin/credorewards.mjs',
    'credorewards-batch': 'bin/credorewards-batch.mjs',
    'credorewards-catalog': 'bin/credorewards-catalog.mjs'
  })) {
    assert.equal(metadata.bin?.[command], script, command + ' bin mapping missing');
    assert.ok(existsSync(join(installedDir, ...script.split('/'))),
      command + ' script missing from installed package');
    const shimName = process.platform === 'win32' ? command + '.cmd' : command;
    const shim = join(temp, 'node_modules', '.bin', shimName);
    assert.ok(existsSync(shim), command + ' npm executable shim missing');
    // Execute the consumer-facing shim, not just its underlying JS script.
    // Windows .cmd launchers require a shell; POSIX shims run directly.
    const helpFromShim = run(shim, ['--help'], temp, process.platform === 'win32');
    assert.match(helpFromShim, new RegExp('Usage: ' + command));
  }

  const help = run(process.execPath, [join(installedDir, 'bin', 'credorewards.mjs'), '--help'], temp);
  assert.match(help, /Usage: credorewards/);
  const batchHelp = run(process.execPath,
    [join(installedDir, 'bin', 'credorewards-batch.mjs'), '--help'], temp);
  assert.match(batchHelp, /Usage: credorewards-batch/);
  const catalogHelp = run(process.execPath,
    [join(installedDir, 'bin', 'credorewards-catalog.mjs'), '--help'], temp);
  assert.match(catalogHelp, /Usage: credorewards-catalog/);

  const consumer = join(temp, 'consumer.mjs');
  writeFileSync(consumer, `import { calculateRewards, compareCards, comparePurchaseImpact, validateRuleCatalog, resolveAnnualCardTerms, compareCatalogCards, auditCatalogUpdate, createBatchReport } from '@credonomics/rewards-engine';
import { validateCatalogJsonSchema } from '@credonomics/rewards-engine/catalog-schema-validator';
const card = { id: 'test', name: 'Test', annualFeePaise: 0,
  excludedCategories: [], rules: [{ id: 'base', category: '*', rateBps: 100 }] };
const tx = [{ id: '1', month: '2026-01', category: 'utilities', amountPaise: 10000 }];
if (calculateRewards(card, tx, 2026).totalRewardsPaise !== 100) process.exit(1);
const other = { ...card, id: 'other', annualFeePaise: 200 };
const comparison = compareCards([other, card], tx, 2026);
if (comparison.leaderCardIds.length !== 1 || comparison.leaderCardIds[0] !== 'test') process.exit(2);
if (comparison.entries[0].rank !== 1 || comparison.entries[0].netAnnualValuePaise !== 100) process.exit(3);
const impact = comparePurchaseImpact([other, card], [], tx[0], 2026);
if (impact.entries.length !== 2 || impact.entries.some(e => e.incrementalRewardsPaise !== 100)) process.exit(11);
const catalog = { schemaVersion: 1, revisions: [
  { revisionId: 'test-2026', issuer: 'Fictional', cardVariant: 'Sample', effectiveFrom: '2026-01-01',
    terms: card, evidence: [], review: { status: 'draft' } },
  { revisionId: 'other-2026', issuer: 'Fictional', cardVariant: 'Sample', effectiveFrom: '2026-01-01',
    terms: other, evidence: [], review: { status: 'draft' } }
] };
validateRuleCatalog(catalog);
if (resolveAnnualCardTerms(catalog, 'test', 2026, { allowDraft: true }).revisionId !== 'test-2026') process.exit(4);
const ranked = compareCatalogCards(catalog, ['other', 'test'], tx, 2026, { allowDraft: true });
if (ranked.comparison.leaderCardIds[0] !== 'test' || ranked.selections[0].revisionId !== 'test-2026') process.exit(5);
const report = auditCatalogUpdate(catalog, catalog);
if (report.unchangedRevisionIds.length !== 2) process.exit(6);
if (!validateCatalogJsonSchema(catalog).valid) process.exit(7);
if (validateCatalogJsonSchema({ ...catalog, typo: true }).valid) process.exit(8);
const reviewed = structuredClone(catalog);
reviewed.revisions[0].review = { status: 'reviewed' };
const missingReview = validateCatalogJsonSchema(reviewed);
if (missingReview.valid || !missingReview.errors.some(e =>
  e.instancePath === '/revisions/0/review/reviewer' && e.keyword === 'required')) process.exit(12);
reviewed.revisions[0].review = {
  status: 'reviewed', reviewer: 'Synthetic Reviewer', reviewedAt: '2026-01-01'
};
const missingEvidence = validateCatalogJsonSchema(reviewed);
if (missingEvidence.valid || !missingEvidence.errors.some(e =>
  e.instancePath === '/revisions/0/evidence' && e.keyword === 'minItems')) process.exit(13);
reviewed.revisions[0].review = { status: 'draft' };
if (!validateCatalogJsonSchema(reviewed).valid) process.exit(14);
const batch = createBatchReport([{ id: 'synthetic-case', year: 2026,
  cards: [card, other], transactions: tx }]);
if (batch.scenarios[0].comparison.leaderCardIds[0] !== 'test') process.exit(9);
if (batch.scenarios[0].monthlyByCard[0].months[0].totalRewardsPaise !== 100) process.exit(10);
`);
  run(process.execPath, [consumer], temp);
  // Compile a real consuming TypeScript project against the INSTALLED tarball,
  // not the source tree. This protects published declaration exports and
  // NodeNext module resolution from silently breaking despite passing JS tests.
  const typedConsumer = join(temp, 'consumer.mts');
  writeFileSync(typedConsumer, `import {
  calculateRewards, compareCards, comparePurchaseImpact, createBatchReport,
  type CardTerms, type Transaction, type CalculationResult,
  type CardComparisonResult, type BatchScenario, type BatchReport,
  type PurchaseImpactResult
} from '@credonomics/rewards-engine';
import { validateCatalogJsonSchema } from '@credonomics/rewards-engine/catalog-schema-validator';
const card: CardTerms = {
  id: 'typed', name: 'Synthetic', annualFeePaise: 0,
  rules: [{ id: 'fallback', category: '*', rateBps: 100 }]
};
const tx: Transaction[] = [
  { id: 'jan', month: '2026-01', category: 'fictional', amountPaise: 10000 }
];
const reward: CalculationResult = calculateRewards(card, tx, 2026);
const impact: PurchaseImpactResult = comparePurchaseImpact([
  card, { ...card, id: 'typed-b' }
], [], tx[0], 2026);
const comparison: CardComparisonResult = compareCards([
  card, { ...card, id: 'typed-b' }
], tx, 2026);
const scenario: BatchScenario = {
  id: 'typed-test', year: 2026, cards: [card, { ...card, id: 'typed-b' }],
  transactions: tx
};
const report: BatchReport = createBatchReport([scenario]);
const checked: boolean = validateCatalogJsonSchema({ schemaVersion: 1, revisions: [] }).valid;
const result: number = reward.totalRewardsPaise +
  comparison.entries.length + impact.entries.length + report.scenarioCount + Number(checked);
void result;
// @ts-expect-error amountPaise must stay a number, not a string
const badAmount: Transaction = { id: 'bad', month: '2026-01', category: 'x', amountPaise: '100' };
void badAmount;
// @ts-expect-error rateBps must remain numeric in published declarations
const badRate: CardTerms = { ...card, rules: [{ id: 'bad-rate', category: '*', rateBps: '500' }] };
void badRate;
// @ts-expect-error required annual fee cannot be omitted from public CardTerms
const missingFee: CardTerms = { id: 'missing-fee', name: 'Synthetic', rules: [] };
void missingFee;
// @ts-expect-error month must remain a string, not a numeric timestamp
const badMonth: Transaction = { id: 'bad-month', month: 202601, category: 'x', amountPaise: 100 };
void badMonth;
// @ts-expect-error a comparison result must not accept arbitrary leader IDs as a scalar
const badLeaders: CardComparisonResult = { ...comparison, leaderCardIds: 'typed' };
void badLeaders;
`);
  const tscCli = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  assert.ok(existsSync(tscCli), 'Expected installed TypeScript compiler for consumer smoke test');
  run(process.execPath, [tscCli, '--strict', '--noEmit', '--skipLibCheck',
    '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
    '--target', 'ES2022', typedConsumer], temp);
  const catalogFile = join(temp, 'catalog-demo.json');
  writeFileSync(catalogFile, JSON.stringify({
    schemaVersion: 1, revisions: [{
      revisionId: 'synthetic-v1', issuer: 'Fictional Issuer',
      cardVariant: 'Fictional Card', effectiveFrom: '2026-01-01',
      terms: { id: 'fictional', name: 'Fictional',
        annualFeePaise: 0, rules: [{ id: 'base', category: '*', rateBps: 100 }] },
      evidence: [], review: { status: 'draft' }
    }]
  }));
  const catalogOutput = run(process.execPath,
    [join(installedDir, 'bin', 'credorewards-catalog.mjs'), catalogFile], temp);
  assert.match(catalogOutput, /valid catalog metadata/);
  const malformedCatalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
  malformedCatalog.revisions[0].terms.unsupported = true;
  const invalidCatalogFile = join(temp, 'invalid-catalog.json');
  writeFileSync(invalidCatalogFile, JSON.stringify(malformedCatalog));
  const invalidCatalog = spawnSync(process.execPath, [
    join(installedDir, 'bin', 'credorewards-catalog.mjs'), invalidCatalogFile
  ], { cwd: temp, encoding: 'utf8' });
  assert.equal(invalidCatalog.status, 1, invalidCatalog.stdout);
  assert.match(invalidCatalog.stderr, /JSON Schema:.*additionalProperties/);
  const batchFile = join(temp, 'batch-demo.json');
  writeFileSync(batchFile, JSON.stringify({ scenarios: [{
    id: 'fictional-case', year: 2026,
    cards: [
      { id: 'a', name: 'Fictional A', annualFeePaise: 0,
        rules: [{ id: 'base', category: '*', rateBps: 100 }] },
      { id: 'b', name: 'Fictional B', annualFeePaise: 0,
        rules: [{ id: 'base', category: '*', rateBps: 200 }] }
    ],
    transactions: [{ id: 'tx', month: '2026-01',
      category: 'utilities', amountPaise: 10000 }]
  }] }));
  const batchOutput = run(process.execPath,
    [join(installedDir, 'bin', 'credorewards-batch.mjs'), batchFile], temp);
  assert.equal(JSON.parse(batchOutput).scenarios[0].comparison.leaderCardIds[0], 'b');
  const invalidBatchFile = join(temp, 'invalid-batch.json');
  writeFileSync(invalidBatchFile, JSON.stringify({ scenarios: [] }));
  const invalidBatch = spawnSync(process.execPath, [
    join(installedDir, 'bin', 'credorewards-batch.mjs'), invalidBatchFile
  ], { cwd: temp, encoding: 'utf8' });
  assert.equal(invalidBatch.status, 1);
  assert.match(invalidBatch.stderr, /scenarios must be a non-empty array/);
  console.log('Package smoke test passed: installed CLIs, reward/comparison/catalog/audit/batch APIs and strict schema validation.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
