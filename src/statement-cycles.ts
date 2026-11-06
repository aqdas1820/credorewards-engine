/**
 * Statement-date spend grouping only. Does not calculate rewards, reset
 * monthly cashback caps, or infer an issuer's billing-cycle rules.
 */
export interface DatedSpendTransaction {
  id: string;
  /** Exact Gregorian transaction date, YYYY-MM-DD (2000–2100). */
  date: string;
  /** Caller-provided integer amount, in paise. */
  amountPaise: number;
}

export interface StatementCycleSpendSummary {
  /** Inclusive cycle ending date, YYYY-MM-DD; may cross a year boundary. */
  cycleCloseDate: string;
  transactionCount: number;
  totalSpendPaise: number;
  /** Deterministically sorted transaction IDs for audit/reconciliation. */
  transactionIds: string[];
}

function daysInMonth(year: number, month: number): number {
  // Dates are constructed in UTC; there is no local-time/DST dependence.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDate(year: number, month: number, day: number): string {
  return String(year).padStart(4, '0') + '-' +
    String(month).padStart(2, '0') + '-' +
    String(day).padStart(2, '0');
}

/**
 * Aggregate caller-supplied dated spending by an *assumed* statement close day.
 *
 * Close day 1..31 is inclusive; e.g. close day 15 groups January 16 through
 * February 15 in the cycle ending February 15. Days absent from a shorter
 * month are clamped to its last calendar day (e.g. February 28/29 for day 31).
 * This is only reporting, not an issuer-verified cap/reset or fee model.
 *
 * Rejected: malformed/impossible dates, duplicate IDs, invalid paise,
 * invalid close day, and totals beyond JavaScript's safe integer range.
 * Input order is immaterial and inputs are never mutated.
 */
export function summarizeStatementCycleSpend(
  transactions: DatedSpendTransaction[],
  closingDay: number
): StatementCycleSpendSummary[] {
  if (!Array.isArray(transactions)) {
    throw new Error('transactions must be an array');
  }
  if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
    throw new Error('closingDay must be an integer from 1 to 31');
  }

  const seen = new Set<string>();
  const buckets = new Map<string, { count: number; total: bigint; ids: string[] }>();
  for (const tx of transactions) {
    if (!tx || typeof tx !== 'object') throw new Error('invalid dated transaction');
    if (typeof tx.id !== 'string' || !tx.id.trim()) {
      throw new Error('transaction.id must be a non-empty string');
    }
    if (seen.has(tx.id)) throw new Error('duplicate transaction id: ' + tx.id);
    seen.add(tx.id);
    if (typeof tx.amountPaise !== 'number' ||
        !Number.isSafeInteger(tx.amountPaise) || tx.amountPaise < 0) {
      throw new Error('transaction[' + tx.id + '].amountPaise must be a non-negative safe integer (paise)');
    }
    const match = typeof tx.date === 'string'
      ? /^(20\\d{2}|2100)-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/.exec(tx.date)
      : null;
    if (!match) throw new Error('transaction[' + tx.id + '].date must be valid YYYY-MM-DD (2000–2100)');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (day > daysInMonth(year, month)) {
      throw new Error('transaction[' + tx.id + '].date must be a valid Gregorian date');
    }

    const closeThisMonth = Math.min(closingDay, daysInMonth(year, month));
    const endYear = day <= closeThisMonth ? year : year + (month === 12 ? 1 : 0);
    const endMonth = day <= closeThisMonth ? month : month === 12 ? 1 : month + 1;
    const close = formatDate(endYear, endMonth,
      Math.min(closingDay, daysInMonth(endYear, endMonth)));
    const bucket = buckets.get(close) ?? { count: 0, total: 0n, ids: [] };
    bucket.count += 1;
    bucket.total += BigInt(tx.amountPaise);
    bucket.ids.push(tx.id);
    buckets.set(close, bucket);
  }

  return [...buckets].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  ).map(([cycleCloseDate, bucket]) => {
    if (bucket.total > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('cycle ' + cycleCloseDate + ' totalSpendPaise exceeds safe integer range');
    }
    return {
      cycleCloseDate,
      transactionCount: bucket.count,
      totalSpendPaise: Number(bucket.total),
      transactionIds: bucket.ids.sort()
    };
  });
}
