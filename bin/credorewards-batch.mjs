#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createBatchReport } from '../dist/index.js';

const path = process.argv[2];
if (!path || path === '--help' || path === '-h') {
  console.log('Usage: credorewards-batch <batch.json>\nInput: { "scenarios": [{ "id": "fictional", "year": 2026, "cards": [ ... ], "transactions": [ ... ] }] }');
  process.exitCode = path ? 0 : 2;
} else {
  try {
    const input = JSON.parse(readFileSync(path, 'utf8'));
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Array.isArray(input.scenarios)) {
      throw new Error('batch input requires a scenarios array');
    }
    console.log(JSON.stringify(createBatchReport(input.scenarios), null, 2));
  } catch (error) {
    console.error('CredoRewards batch error: ' +
      (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
