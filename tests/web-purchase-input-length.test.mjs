import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRupeesToPaise } from '../web/purchase-input.mjs';

test('browser rupee parsing preserves exact maximum safe paise boundary', () => {
  assert.equal(parseRupeesToPaise('90071992547409.91'),
    Number.MAX_SAFE_INTEGER);
  assert.equal(parseRupeesToPaise('  90071992547409.91  '),
    Number.MAX_SAFE_INTEGER);
  assert.throws(() => parseRupeesToPaise('90071992547409.92'),
    /maximum safe paise/);
  assert.throws(() => parseRupeesToPaise('99999999999999.99'),
    /maximum safe paise/);
});

test('browser parser rejects oversized input before costly BigInt conversion', () => {
  const overlyLong = '9'.repeat(100_000);
  assert.throws(() => parseRupeesToPaise(overlyLong), /maximum safe paise/);
  assert.throws(() => parseRupeesToPaise('   ' + overlyLong + '   '),
    /maximum safe paise/);
  assert.throws(() => parseRupeesToPaise('1'.repeat(18)),
    /maximum safe paise/);
  assert.throws(() => parseRupeesToPaise('0'.repeat(100_000)),
    /maximum safe paise/);
  // Existing formatting restrictions must still reject malformed short inputs.
  for (const invalid of ['1e3', '1.234', '001', '-1', '.50']) {
    assert.throws(() => parseRupeesToPaise(invalid),
      /positive rupee amount/);
  }
});
