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
// Validate the complete allowlist before copying anything. A missing SDK
// module must not leave a partially built directory that looks deployable.
for (const file of files) {
  const source = resolve(root, file);
  const relative = file === 'web/index.html' ? 'index.html' : file;
  const destination = resolve(output, relative);
  if (!source.startsWith(root + sep) || !destination.startsWith(output + sep)) {
    throw new Error('Unexpected build path');
  }
  // A regular file can still be reached through a symlinked parent directory.
  // Check the reviewed top-level input directory without following symlinks.
  const parent = await lstat(resolve(root, file.split('/')[0]));
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error('Static demo input directory must be a real directory: ' + file);
  }
  // Refuse symlinked build inputs: copying a link could disclose files outside
  // the reviewed allowlist even when its pathname is inside this repository.
  const stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('Static demo input must be a regular file: ' + file);
  }
}
// Check the reviewed HTML entrypoint before emitting any deployment assets.
// Invalid HTML must not leave a partial site-dist directory behind.
const html = await readFile(join(root, 'web/index.html'), 'utf8');
// Comments and inert HTML containers must not masquerade as an executable
// browser entrypoint. This is a preflight for our reviewed static HTML, not a
// general-purpose HTML parser.
const executableHtml = html.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(template|noscript|textarea|style|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
// HTML-looking script text inside another script is not executable markup.
const entrypointPattern = /<script\s+type=["']module["']\s+src=["']\/web\/app\.mjs["']\s*><\/script\s*>/i;
const executableScripts = executableHtml.replace(
  /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
  tag => entrypointPattern.test(tag) && (tag.match(/<script\b/gi)?.length ?? 0) === 1 ? tag : ''
);
const entrypoints = executableScripts.match(new RegExp(entrypointPattern.source, 'gi')) ?? [];
if (entrypoints.length !== 1) {
  throw new Error('Missing browser entrypoint');
}
for (const file of files) {
  const source = resolve(root, file);
  const relative = file === 'web/index.html' ? 'index.html' : file;
  const destination = resolve(output, relative);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}
const top = (await readdir(output)).sort();
if (JSON.stringify(top) !== JSON.stringify(['dist', 'index.html', 'web'])) {
  throw new Error('Unexpected static output contents');
}
console.log('Built standalone static demo assets: ' + files.length);
