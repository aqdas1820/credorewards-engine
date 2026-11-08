#!/usr/bin/env node
// Build a static-only, read-only public DEMO. No server/API or user data collection.
import { cp, lstat, mkdir, rm, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'site-dist');
const files = [
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
await rm(output, { recursive: true, force: true });
for (const file of files) {
  const source = resolve(root, file);
  const relative = file === 'web/index.html' ? 'index.html' : file;
  const destination = resolve(output, relative);
  if (!source.startsWith(root + sep) || !destination.startsWith(output + sep)) {
    throw new Error('Unexpected build path');
  }
  // Refuse symlinked build inputs: copying a link could disclose files outside
  // the reviewed allowlist even when its pathname is inside this repository.
  const stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('Static demo input must be a regular file: ' + file);
  }
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}
const html = await readFile(join(output, 'index.html'), 'utf8');
if (!html.includes('/web/app.mjs')) throw new Error('Missing browser entrypoint');
const top = (await readdir(output)).sort();
if (JSON.stringify(top) !== JSON.stringify(['dist', 'index.html', 'web'])) {
  throw new Error('Unexpected static output contents');
}
console.log('Built standalone static demo assets: ' + files.length);
