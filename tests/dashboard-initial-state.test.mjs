import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../web/app.mjs', import.meta.url), 'utf8');

test('offline dashboard provides beginner-friendly reset and computes synthetic example on load', () => {
  assert.match(html, /id="reset" type="button"/);
  assert.match(html, /id="calculate" type="button"/);
  assert.match(script, /document\.getElementById\('reset'\)\.addEventListener\('click'/);
  assert.match(script, /input\.value = exampleJson/);
  assert.match(script, /compareCards\(payload\.cards, payload\.transactions, payload\.year\)/);
  assert.match(script, /\/\/ Display a real SDK comparison immediately;[^\n]*\ncalculate\(\);/);
  assert.match(script, /scoreboard\.replaceChildren\(\)/);
});
