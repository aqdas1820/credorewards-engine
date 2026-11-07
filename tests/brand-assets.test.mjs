import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const assets = [
  {
    path: '../docs/public/credorewards-brand-banner.webp',
    sha256: 'c5a1fed609ef6a6adb69a51c24ae886168ebebb43ac9eca6c4843b48fd3e3020',
    reference: 'docs/public/credorewards-brand-banner.webp'
  },
  {
    path: '../docs/public/credonomics-parent-product-badge.webp',
    sha256: 'f1b8d6d1de1b97161119c9b1017419cff4029a9e110ef70ccbb73db18cb6f356',
    reference: 'docs/public/credonomics-parent-product-badge.webp'
  }
];

test('README embeds owner-supplied CredoRewards and parent-company artwork', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /<div align="center">/);
  assert.match(readme, /brand-banner\.webp"[^>]+width="700"/);
  assert.match(readme, /CredoNomics Investment Solutions/);
  assert.match(readme, /experimental alpha/i);
  for (const asset of assets) {
    const bytes = readFileSync(new URL(asset.path, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.ok(readme.includes('src="' + asset.reference + '"'),
      'README must embed the reviewed local asset ' + asset.reference);
  }
});

test('README clearly distinguishes product branding from actual bank integrations', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /not a live rewards-and-loyalty service/i);
  assert.match(readme, /complete-year spending/i);
  assert.match(readme, /docs\/PRODUCTION-READINESS\.md/);
});
