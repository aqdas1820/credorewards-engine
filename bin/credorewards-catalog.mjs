#!/usr/bin/env node
/** Offline catalog JSON Schema + cross-revision validation; no network access. */
import { readFileSync } from 'node:fs';
import { validateRuleCatalog } from '../dist/index.js';
import { validateCatalogJsonSchema } from './catalog-schema-validator.mjs';

const paths = process.argv.slice(2);
if (paths.length === 0 || paths.some(path => path === '--help' || path === '-h')) {
  console.log('Usage: credorewards-catalog <catalog.json> [more-catalogs.json]');
  process.exitCode = paths.length === 0 ? 2 : 0;
} else {
  let failed = false;
  for (const path of paths) {
    try {
      const document = JSON.parse(readFileSync(path, 'utf8'));
      const checked = validateCatalogJsonSchema(document);
      if (!checked.valid) {
        const details = checked.errors.map(issue =>
          (issue.instancePath || '/') + ' [' + issue.keyword + '] ' + issue.message
        ).join('; ');
        throw new Error('JSON Schema: ' + details);
      }
      // Schema shape validation cannot check invalid Gregorian dates,
      // duplicate revision IDs, overlapping intervals, or true issuer rates.
      validateRuleCatalog(document);
      const reviewed = document.revisions.filter(x => x.review.status === 'reviewed').length;
      console.log(path + ': valid catalog metadata; ' + document.revisions.length +
        ' revisions (' + reviewed + ' recorded as reviewed).');
    } catch (error) {
      failed = true;
      console.error(path + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  if (failed) process.exitCode = 1;
}
