import type { CalculationResult } from './index.js';

/** Source-of-truth-free reporting view over an already calculated annual result. */
export interface RewardCategorySummary {
  category: string;
  transactionCount: number;
  totalSpendPaise: number;
  totalRewardsPaise: number;
}

export interface RewardCategoryAudit {
  year: number;
  cardId: string;
  categories: RewardCategorySummary[];
  totalSpendPaise: number;
  totalRewardsPaise: number;
}

function safePaise(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(label + ' exceeds non-negative safe integer range');
  }
  return Number(value);
}

/**
 * Aggregate the existing transaction-level audit by category without
 * recalculating a single reward, cap, fee, or bank rule.
 *
 * Categories are sorted lexicographically. The caller's input is not mutated.
 * Tampered, partial, or inconsistent annual result totals fail closed rather
 * than producing a misleading dashboard summary.
 */
export function summarizeRewardCategories(result: CalculationResult): RewardCategoryAudit {
  if (!result || typeof result !== 'object' || !Array.isArray(result.transactions)) {
    throw new Error('calculation result must include transactions');
  }
  if (!Number.isInteger(result.year) || result.year < 2000 || result.year > 2100 ||
      typeof result.cardId !== 'string' || !result.cardId.trim()) {
    throw new Error('calculation result requires valid year and cardId');
  }
  for (const field of ['totalSpendPaise', 'totalRewardsPaise'] as const) {
    if (!Number.isSafeInteger(result[field]) || result[field] < 0) {
      throw new Error('calculation.' + field + ' must be a non-negative safe integer');
    }
  }
  const categories = new Map<string, { count: number; spend: bigint; rewards: bigint }>();
  const seen = new Set<string>();
  let spend = 0n;
  let rewards = 0n;
  for (const tx of result.transactions) {
    if (!tx || typeof tx !== 'object' || typeof tx.id !== 'string' || !tx.id.trim() ||
        typeof tx.category !== 'string' || !tx.category.trim() ||
        typeof tx.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(tx.month) ||
        !tx.month.startsWith(result.year + '-')) {
      throw new Error('invalid calculated transaction identity or month');
    }
    if (seen.has(tx.id)) throw new Error('duplicate calculated transaction id: ' + tx.id);
    seen.add(tx.id);
    if (!Number.isSafeInteger(tx.amountPaise) || tx.amountPaise < 0 ||
        !Number.isSafeInteger(tx.earnedPaise) || tx.earnedPaise < 0 ||
        tx.earnedPaise > tx.amountPaise) {
      throw new Error('invalid calculated transaction paise: ' + tx.id);
    }
    const group = categories.get(tx.category) ?? { count: 0, spend: 0n, rewards: 0n };
    group.count += 1;
    group.spend += BigInt(tx.amountPaise);
    group.rewards += BigInt(tx.earnedPaise);
    categories.set(tx.category, group);
    spend += BigInt(tx.amountPaise);
    rewards += BigInt(tx.earnedPaise);
  }
  if (spend !== BigInt(result.totalSpendPaise) ||
      rewards !== BigInt(result.totalRewardsPaise)) {
    throw new Error('calculation transaction totals do not reconcile');
  }
  return {
    year: result.year,
    cardId: result.cardId,
    categories: [...categories].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([category, bucket]) => ({
        category,
        transactionCount: bucket.count,
        totalSpendPaise: safePaise(bucket.spend, 'category spend'),
        totalRewardsPaise: safePaise(bucket.rewards, 'category rewards')
      })),
    totalSpendPaise: safePaise(spend, 'total spend'),
    totalRewardsPaise: safePaise(rewards, 'total rewards')
  };
}
