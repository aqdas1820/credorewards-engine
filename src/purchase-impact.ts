import { calculateRewards } from './index.js';
import type { CardTerms, CalculationResult, Transaction, TransactionResult } from './index.js';

/** Reporting-only marginal impact for one hypothetical purchase on one card. */
export interface PurchaseImpactEntry {
  rank: number;
  cardId: string;
  cardName: string;
  /** Reward credited to the proposed transaction after applicable caps. */
  purchase: TransactionResult;
  /** Change in the *total* annual rewards, which may differ from purchase.earnedPaise. */
  incrementalRewardsPaise: number;
  /** Changes to existing transactions when the purchase consumes shared caps. */
  otherTransactionsRewardDeltaPaise: number;
  /** Difference in annual fee charged before versus after including the purchase. */
  feeSavingsPaise: number;
  incrementalNetAnnualValuePaise: number;
  baseline: CalculationResult;
  withPurchase: CalculationResult;
}

export interface PurchaseImpactResult {
  year: number;
  purchaseId: string;
  leaderCardIds: string[];
  entries: PurchaseImpactEntry[];
  assumptions: string[];
}

function safeDelta(after: number, before: number, field: string): number {
  const difference = BigInt(after) - BigInt(before);
  if (difference < BigInt(Number.MIN_SAFE_INTEGER) ||
      difference > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(field + ' exceeds safe integer range');
  }
  return Number(difference);
}

/**
 * Compare the marginal impact of adding ONE hypothetical transaction to an
 * otherwise identical annual history for each supplied card.
 *
 * Every card is evaluated as though ALL prior transactions were charged to
 * that card. This is not real wallet allocation or a merchant recommendation.
 * The caller must supply complete-year history for annual fee/waiver results.
 * All issuer terms and transaction categories must be caller supplied.
 *
 * Reuse calculateRewards for BOTH snapshots, so the existing cap, exclusion,
 * deterministic transaction ordering, and annual fee semantics stay intact.
 */
export function comparePurchaseImpact(
  cards: CardTerms[],
  historicalTransactions: Transaction[],
  purchase: Transaction,
  year: number
): PurchaseImpactResult {
  if (!Array.isArray(cards) || cards.length < 2) {
    throw new Error('cards must contain at least two card terms');
  }

  const cardIds = new Set<string>();
  const rows: Omit<PurchaseImpactEntry, 'rank'>[] = [];
  for (const card of cards) {
    const baseline = calculateRewards(card, historicalTransactions, year);
    if (cardIds.has(baseline.cardId)) {
      throw new Error('duplicate card id: ' + baseline.cardId);
    }
    cardIds.add(baseline.cardId);
    const withPurchase = calculateRewards(card, [...historicalTransactions, purchase], year);
    const purchaseResult = withPurchase.transactions.find(tx => tx.id === purchase.id);
    if (!purchaseResult) throw new Error('purchase result is missing');

    const incrementalRewardsPaise = safeDelta(
      withPurchase.totalRewardsPaise, baseline.totalRewardsPaise, 'incrementalRewardsPaise'
    );
    rows.push({
      cardId: card.id,
      cardName: card.name,
      purchase: purchaseResult,
      incrementalRewardsPaise,
      otherTransactionsRewardDeltaPaise: safeDelta(
        incrementalRewardsPaise, purchaseResult.earnedPaise, 'otherTransactionsRewardDeltaPaise'
      ),
      feeSavingsPaise: safeDelta(
        baseline.annualFeeChargedPaise, withPurchase.annualFeeChargedPaise, 'feeSavingsPaise'
      ),
      incrementalNetAnnualValuePaise: safeDelta(
        withPurchase.netAnnualValuePaise, baseline.netAnnualValuePaise,
        'incrementalNetAnnualValuePaise'
      ),
      baseline,
      withPurchase
    });
  }

  rows.sort((a, b) => {
    if (a.incrementalNetAnnualValuePaise !== b.incrementalNetAnnualValuePaise) {
      return a.incrementalNetAnnualValuePaise > b.incrementalNetAnnualValuePaise ? -1 : 1;
    }
    return a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0;
  });

  let rank = 0;
  let previous: number | undefined;
  const entries = rows.map((row, index): PurchaseImpactEntry => {
    if (previous === undefined || row.incrementalNetAnnualValuePaise !== previous) {
      rank = index + 1;
      previous = row.incrementalNetAnnualValuePaise;
    }
    return { rank, ...row };
  });

  return {
    year,
    purchaseId: purchase.id,
    leaderCardIds: entries.filter(entry => entry.rank === 1).map(entry => entry.cardId),
    entries,
    assumptions: [
      'Each card is evaluated independently as though the entire historical spend was made on that card.',
      'This is a hypothetical marginal annual-value comparison, not a real per-purchase wallet allocation or merchant recommendation.',
      'Annual fee and fee-waiver impacts assume a complete-year transaction history; partial-year inputs are not suitable for fee recommendations.',
      'A new purchase can displace older transaction rewards under monthly or annual caps; purchase reward and incremental annual rewards may differ.',
      'Only caller-provided card rules are used; issuer terms, MCC mapping, points valuations and merchant offers are not verified or supplied.'
    ]
  };
}
