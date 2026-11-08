import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const assets = [
  'web/app.mjs', 'web/scoreboard.mjs', 'web/local-import.mjs',
  'web/purchase-input.mjs', 'dist/index.js', 'dist/purchase-impact.js',
  'dist/statement-cycles.js', 'dist/batch.js', 'dist/catalog.js',
  'dist/catalog-audit.js'
];

test('static HTML preflight rejects non-executable module mentions without partial output', () => {
  for (const html of [
    '<!doctype html><p>/web/app.mjs</p>',
    '<!doctype html><!-- <script type="module" src="/web/app.mjs"></script> -->',
    '<!doctype html><script type="module" src="/web/not-app.mjs"></script>',
    '<!doctype html><script type="text/plain" src="/web/app.mjs"></script>',
    '<!doctype html><template><script type="module" src="/web/app.mjs"></script></template>',
    '<!doctype html><noscript><script type="module" src="/web/app.mjs"></script></noscript>',
    '<!doctype html><textarea><script type="module" src="/web/app.mjs"></script></textarea>',
    '<!doctype html><style><script type="module" src="/web/app.mjs"></script></style>',
    '<!doctype html><title><script type="module" src="/web/app.mjs"></script></title>',
    '<!doctype html><script type="module" src="/web/app.mjs"></script>' +
      '<script type="module" src="/web/app.mjs"></script>',
    '<!doctype html><script type="application/json">' +
      '<script type="module" src="/web/app.mjs"></script></script>',
    '<!doctype html><script type="text/plain">' +
      '<script type="module" src="/web/app.mjs"></script></script>'
  ]) {
    const sandbox = mkdtempSync(join(tmpdir(), 'credorewards-script-preflight-'));
    try {
      mkdirSync(join(sandbox, 'scripts'));
      cpSync(join(root, 'scripts/build-web-static.mjs'),
        join(sandbox, 'scripts/build-web-static.mjs'));
      for (const asset of assets) {
        const target = join(sandbox, asset);
        mkdirSync(dirname(target), { recursive: true });
        cpSync(join(root, asset), target);
      }
      writeFileSync(join(sandbox, 'web/index.html'), html);
      const result = spawnSync(process.execPath,
        [join(sandbox, 'scripts/build-web-static.mjs')], {
          cwd: sandbox, encoding: 'utf8'
        });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Missing browser entrypoint/);
      assert.equal(existsSync(join(sandbox, 'site-dist')), false,
        'Failed preflight must not create partial deployable assets');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
});
