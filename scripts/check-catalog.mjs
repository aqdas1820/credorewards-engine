#!/usr/bin/env node
/** Offline fixture check; deliberately never opens, downloads or trusts evidence URLs. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateRuleCatalog } from '../dist/index.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: npm run validate:catalog -- <catalog-file.json> [more-files.json]');
  process.exitCode = 2;
} else {
  let failures = 0;
  for (const file of files) {
    try {
      const catalog = JSON.parse(readFileSync(resolve(file), 'utf8'));
      validateRuleCatalog(catalog);
      const reviewed = catalog.revisions.filter(item => item.review.status === 'reviewed').length;
      console.log(file + ': valid catalog metadata; ' + catalog.revisions.length +
        ' revisions (' + reviewed + ' recorded as reviewed).');
    } catch (error) {
      failures++;
      console.error(file + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  if (failures > 0) process.exitCode = 1;
}
