import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const documents = [
  'README.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'docs/ARCHITECTURE.md',
  'docs/README.md',
  'docs/BRANDING.md'
];

test('repository landing, contributor and architecture documents have valid local links', () => {
  for (const document of documents) {
    const from = join(root, document);
    const text = readFileSync(from, 'utf8');
    // External URLs and same-page anchors are managed outside this offline test.
    for (const match of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const raw = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(raw)) continue;
      const local = raw.split('#')[0].split('?')[0];
      if (!local) continue;
      const target = resolve(dirname(from), decodeURIComponent(local));
      assert.ok(existsSync(target), document + ' has broken local link: ' + raw);
    }
  }
});
