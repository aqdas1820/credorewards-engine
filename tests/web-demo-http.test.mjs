import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = fileURLToPath(new URL('../scripts/serve-demo.mjs', import.meta.url));

test('offline dashboard binds loopback and serves only explicit assets, no upload API', async () => {
  const child = spawn(process.execPath, [entry], {
    cwd: root, env: { ...process.env, CREDOREWARDS_DEMO_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', x => { stderr += x; });
  try {
    const address = await new Promise((resolve, reject) => {
      let stdout = '';
      const timeout = setTimeout(() => reject(new Error('Offline demo did not start: ' + stderr)), 15000);
      const cleanup = () => clearTimeout(timeout);
      child.once('error', error => { cleanup(); reject(error); });
      child.once('exit', code => { cleanup(); reject(new Error('Server exited: ' + code + ' ' + stderr)); });
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        stdout += chunk;
        const match = stdout.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { cleanup(); resolve(match[0]); }
      });
    });
    const index = await fetch(address + '/');
    assert.equal(index.status, 200);
    assert.match(await index.text(), /CredoRewards/);
    assert.match(index.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.equal(index.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(index.headers.get('cache-control'), 'no-store');
    const app = await fetch(address + '/web/app.mjs');
    assert.equal(app.status, 200);
    assert.match(await app.text(), /compareCards/);
    const scoreboard = await fetch(address + '/web/scoreboard.mjs');
    assert.equal(scoreboard.status, 200);
    assert.match(await scoreboard.text(), /formatPaiseAsRupees/);
    const importer = await fetch(address + '/web/local-import.mjs');
    assert.equal(importer.status, 200);
    assert.match(await importer.text(), /readLocalScenario/);
    const whatIf = await fetch(address + '/web/purchase-input.mjs');
    assert.equal(whatIf.status, 200);
    assert.match(await whatIf.text(), /parseRupeesToPaise/);
    const purchaseSdk = await fetch(address + '/dist/purchase-impact.js');
    assert.equal(purchaseSdk.status, 200);
    assert.match(await purchaseSdk.text(), /comparePurchaseImpact/);
    const cycles = await fetch(address + '/dist/statement-cycles.js');
    assert.equal(cycles.status, 200);
    assert.match(await cycles.text(), /summarizeStatementCycleSpend/);
    const sdk = await fetch(address + '/dist/index.js');
    assert.equal(sdk.status, 200);
    assert.match(await sdk.text(), /function compareCards/);
    const missing = await fetch(address + '/not-allowed.json');
    assert.equal(missing.status, 404);
    const secret = await fetch(address + '/package.json');
    assert.equal(secret.status, 404);
    const traversal = await fetch(address + '/..%2Fpackage.json');
    assert.equal(traversal.status, 404);
    const post = await fetch(address + '/', { method: 'POST', body: '{}' });
    assert.equal(post.status, 405);
    const head = await fetch(address + '/web/app.mjs', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');

    // The local preview is read-only even on error paths; no request can
    // accidentally expose repository files, set tracking cookies, or upload data.
    for (const [path, status] of [
      ['/package-lock.json', 404],
      ['/.env', 404],
      ['/dist/../package.json', 404],
      ['/web/%2e%2e/package.json', 404],
      ['/web/app.mjs?cache=1', 200]
    ]) {
      const response = await fetch(address + path);
      assert.equal(response.status, status, path);
      assert.equal(response.headers.get('cache-control'), 'no-store', path);
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer', path);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
      assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/, path);
      assert.equal(response.headers.get('set-cookie'), null, path);
    }
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const response = await fetch(address + '/', { method });
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get('allow'), 'GET, HEAD', method);
      assert.equal(response.headers.get('cache-control'), 'no-store', method);
      assert.equal(response.headers.get('set-cookie'), null, method);
    }
  } finally {
    child.kill('SIGTERM');
  }
});
