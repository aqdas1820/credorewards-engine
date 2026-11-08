import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPaiseAsRupees } from '../web/scoreboard.mjs';
import { parseRupeesToPaise } from '../web/purchase-input.mjs';

// Independent display oracle: repeated two-digit groups, without the SDK
// formatter's regular expression or floating-point conversions.
function referenceFormat(paise) {
  const negative = paise < 0;
  const absolute = BigInt(negative ? -paise : paise);
  const decimal = (absolute / 100n).toString();
  const groups = [];
  if (decimal.length > 3) {
    let prefix = decimal.slice(0, -3);
    while (prefix.length > 2) {
      groups.unshift(prefix.slice(-2));
      prefix = prefix.slice(0, -2);
    }
    groups.unshift(prefix);
    groups.push(decimal.slice(-3));
  } else {
    groups.push(decimal);
  }
  return (negative ? '-₹' : '₹') + groups.join(',') + '.' +
    (absolute % 100n).toString().padStart(2, '0');
}

function random(seed) {
  let state = seed >>> 0;
  return () => (state = Math.imul(state, 1664525) + 1013904223 >>> 0);
}

test('Indian currency grouping matches independent reference at every digit transition', () => {
  const boundaries = [0, 1, 99, 100, 999, 1000, 99999, 100000,
    999999, 1000000, 9999999, 10000000, 99999999, 100000000,
    999999999, 1000000000, Number.MAX_SAFE_INTEGER];
  for (const n of boundaries) {
    for (const value of new Set([n, -n, n - (n > 0 ? 1 : 0)])) {
      assert.equal(formatPaiseAsRupees(value), referenceFormat(value),
        'boundary paise ' + value);
    }
  }
});

test('seeded safe-integer amounts match reference without rounding or sign loss', () => {
  const next = random(20261108);
  for (let index = 0; index < 1000; index++) {
    // Combine two 32-bit random words using bigint, then constrain to safe
    // integer range. No floating-point multiplication of large amounts.
    const amount = Number(((BigInt(next()) << 32n) | BigInt(next())) %
      BigInt(Number.MAX_SAFE_INTEGER + 1));
    const signed = index % 2 ? -amount : amount;
    assert.equal(formatPaiseAsRupees(signed), referenceFormat(signed),
      'seeded case ' + index);
  }
});

test('positive formatted amounts roundtrip through the exact browser rupee parser', () => {
  const values = [1, 99, 100, 101, 100000, Number.MAX_SAFE_INTEGER];
  for (const paise of values) {
    // The form intentionally accepts ungrouped decimal input; remove only
    // display grouping and currency prefix before parsing.
    const displayed = formatPaiseAsRupees(paise);
    assert.equal(parseRupeesToPaise(displayed.replace('₹', '').replaceAll(',', '')),
      paise, 'roundtrip paise ' + paise);
  }
});
