import type { Transaction } from './index.js';

/** A synthetic or independently sourced caller-owned MCC -> category rule. */
export interface MccCategoryMapping {
  /** Exactly four ASCII digits; leading zeros are significant. */
  mcc: string;
  /** A category that matches the caller's chosen cashback-rule categories. */
  category: string;
}

/** Unclassified transaction; no merchant name or network lookup is performed. */
export interface MccCodedTransaction {
  id: string;
  month: string;
  mcc: string;
  amountPaise: number;
}

/**
 * Map explicit merchant category codes to the cashback engine's category input.
 *
 * All mappings must be caller-supplied. No MCC lookups, bank-specific
 * exemptions, issuer rates or merchant-name inference are bundled.
 * Unknown MCCs fail closed instead of receiving a guessed category.
 * Inputs are not mutated and transaction order is preserved.
 *
 * This only prepares existing Transaction objects. It does not calculate
 * rewards, decide MCC eligibility, or certify that a code was assigned
 * correctly by any card network or issuer.
 */
export function mapMccTransactions(
  transactions: MccCodedTransaction[],
  mappings: MccCategoryMapping[]
): Transaction[] {
  if (!Array.isArray(mappings)) throw new Error('mappings must be an array');
  if (!Array.isArray(transactions)) throw new Error('transactions must be an array');

  const categories = new Map<string, string>();
  for (const entry of mappings) {
    if (!entry || typeof entry !== 'object' ||
        typeof entry.mcc !== 'string' || !/^\d{4}$/.test(entry.mcc)) {
      throw new Error('mapping.mcc must be exactly four digits');
    }
    if (typeof entry.category !== 'string' || !entry.category.trim()) {
      throw new Error('mapping.category must be a non-empty string');
    }
    if (categories.has(entry.mcc)) {
      throw new Error('duplicate MCC mapping: ' + entry.mcc);
    }
    categories.set(entry.mcc, entry.category);
  }

  const seen = new Set<string>();
  return transactions.map(tx => {
    if (!tx || typeof tx !== 'object') throw new Error('invalid MCC transaction');
    if (typeof tx.id !== 'string' || !tx.id.trim()) {
      throw new Error('transaction.id must be a non-empty string');
    }
    if (seen.has(tx.id)) throw new Error('duplicate transaction id: ' + tx.id);
    seen.add(tx.id);
    if (typeof tx.month !== 'string' ||
        !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(tx.month)) {
      throw new Error('transaction[' + tx.id + '].month must be YYYY-MM (2000–2100)');
    }
    if (typeof tx.amountPaise !== 'number' ||
        !Number.isSafeInteger(tx.amountPaise) || tx.amountPaise < 0) {
      throw new Error('transaction[' + tx.id + '].amountPaise must be a non-negative safe integer (paise)');
    }
    if (typeof tx.mcc !== 'string' || !/^\d{4}$/.test(tx.mcc)) {
      throw new Error('transaction[' + tx.id + '].mcc must be exactly four digits');
    }
    const category = categories.get(tx.mcc);
    if (category === undefined) {
      throw new Error('transaction[' + tx.id + '] has unmapped MCC: ' + tx.mcc);
    }
    return { id: tx.id, month: tx.month, category, amountPaise: tx.amountPaise };
  });
}
