/** Pure, read-only display adapter. Never changes the underlying reward calculations. */
export function formatPaiseAsRupees(value) {
  if (!Number.isSafeInteger(value)) throw new TypeError('paise must be a safe integer');
  const amount = BigInt(value);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const major = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '-₹' : '₹') + major + '.' + (absolute % 100n).toString().padStart(2, '0');
}

/** Same ordering, rank, fee and cashback amounts as the SDK comparison. */
export function createScoreboardRows(comparison) {
  return comparison.entries.map(entry => ({
    rank: entry.rank,
    name: entry.cardName,
    cardId: entry.cardId,
    rewards: formatPaiseAsRupees(entry.totalRewardsPaise),
    fee: formatPaiseAsRupees(entry.annualFeeChargedPaise),
    net: formatPaiseAsRupees(entry.netAnnualValuePaise),
    isLeader: entry.rank === 1
  }));
}


/**
 * UI-only rows for the hypothetical purchase-impact report.
 * Values come directly from the SDK's before/after ledgers.
 */
export function createPurchaseImpactRows(impact) {
  return impact.entries.map(entry => ({
    rank: entry.rank,
    cardId: entry.cardId,
    name: entry.cardName,
    purchaseRewards: formatPaiseAsRupees(entry.purchase.earnedPaise),
    existingRewardsDelta: formatPaiseAsRupees(entry.otherTransactionsRewardDeltaPaise),
    feeSavings: formatPaiseAsRupees(entry.feeSavingsPaise),
    netDelta: formatPaiseAsRupees(entry.incrementalNetAnnualValuePaise),
    isLeader: entry.rank === 1
  }));
}
