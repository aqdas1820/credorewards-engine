#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { calculateRewards } from '../dist/index.js';

const input = process.argv[2];
if (!input || ['--help', '-h'].includes(input)) {
  console.log('Usage: credorewards <input.json>\nInput: { "year": 2026, "card": { ... }, "transactions": [ ... ] }');
  process.exit(input ? 0 : 1);
}
try {
  const data = JSON.parse(readFileSync(input, 'utf8'));
  console.log(JSON.stringify(calculateRewards(data.card, data.transactions, data.year), null, 2));
} catch (e) {
  console.error(`CredoRewards error: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
