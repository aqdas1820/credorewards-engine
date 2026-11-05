/**
 * CredoRewards Engine: deterministic, audit-friendly cashback calculations.
 * All money is expressed in integer paise. No real issuer terms are included.
 */
export interface Transaction {
  id: string;
  /** YYYY-MM; transactions must belong to the evaluated year. */
  month: string;
  category: string;
  amountPaise: number;
}

export interface CashbackRule {
  id: string;
  /** Category match, or '*' as fallback. Rules are applied first-match-wins. */
  category: string;
  /** Reward paise per 10,000 paise spent, e.g. 500 = 5%. */
  rateBps: number;
  /** Minimum transaction amount for this rule; if below, no fallback applies. */
  minTransactionPaise?: number;
  /** Maximum rewards from this rule in each YYYY-MM period. */
  monthlyCapPaise?: number;
  /** Maximum rewards from this rule across the evaluated year. */
  annualCapPaise?: number;
}

export interface CardTerms {
  id: string;
  name: string;
  /** Inclusive annual fee; tax treatment should be resolved by the caller. */
  annualFeePaise: number;
  /** Waive fee at this annual qualifying spend (optional). */
  annualFeeWaiverThresholdPaise?: number;
  /** Categories excluded from fee-waiver spend; independent of rewards. */
  feeWaiverExcludedCategories?: string[];
  /** Categories excluded from rewards, regardless of rule. */
  excludedCategories?: string[];
  /** Specific rules before wildcard fallback. First match wins. */
  rules: CashbackRule[];
}

export type TransactionReason =
  | 'earned'
  | 'excluded_category'
  | 'no_matching_rule'
  | 'below_minimum'
  | 'reward_cap_reached'
  | 'rounded_to_zero'
  | 'zero_reward';

export interface TransactionResult {
  id: string;
  month: string;
  category: string;
  amountPaise: number;
  matchedRuleId: string | null;
  earnedPaise: number;
  reason: TransactionReason;
}

export interface CalculationResult {
  year: number;
  cardId: string;
  totalSpendPaise: number;
  rewardEligibleSpendPaise: number;
  feeWaiverEligibleSpendPaise: number;
  totalRewardsPaise: number;
  annualFeeWaived: boolean;
  annualFeeChargedPaise: number;
  netAnnualValuePaise: number;
  transactions: TransactionResult[];
  /** Limitations of this intentionally narrow alpha calculation. */
  notes: string[];
}

function requireString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string`);
}
function requirePaise(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer (paise)`);
  }
}
function requireBps(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10000) {
    throw new Error(`${field} must be an integer from 0 to 10000`);
  }
}
function safeNumber(n: bigint, field: string): number {
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`${field} exceeds safe integer range`);
  }
  return Number(n);
}
function validateCategories(categories: unknown, field: string): void {
  if (categories === undefined) return;
  if (!Array.isArray(categories) || !categories.every(c => typeof c === 'string' && c.trim().length > 0)) {
    throw new Error(`${field} must be a string array`);
  }
}
function validateTerms(card: CardTerms): void {
  if (!card || typeof card !== 'object') throw new Error('card is required');
  requireString(card.id, 'card.id');
  requireString(card.name, 'card.name');
  requirePaise(card.annualFeePaise, 'card.annualFeePaise');
  if (card.annualFeeWaiverThresholdPaise !== undefined) requirePaise(card.annualFeeWaiverThresholdPaise, 'card.annualFeeWaiverThresholdPaise');
  validateCategories(card.excludedCategories, 'card.excludedCategories');
  validateCategories(card.feeWaiverExcludedCategories, 'card.feeWaiverExcludedCategories');
  if (!Array.isArray(card.rules)) throw new Error('card.rules must be an array');
  const ruleIds = new Set<string>();
  for (const rule of card.rules) {
    if (!rule || typeof rule !== 'object') throw new Error('invalid rule');
    requireString(rule.id, 'rule.id');
    requireString(rule.category, `rule[${rule.id}].category`);
    requireBps(rule.rateBps, `rule[${rule.id}].rateBps`);
    if (ruleIds.has(rule.id)) throw new Error(`duplicate rule id: ${rule.id}`);
    ruleIds.add(rule.id);
    for (const field of ['minTransactionPaise', 'monthlyCapPaise', 'annualCapPaise'] as const) {
      if (rule[field] !== undefined) requirePaise(rule[field], `rule[${rule.id}].${field}`);
    }
  }
}

/**
 * The caller MUST supply a complete year of spending when evaluating the annual fee.
 * Inputs are deliberately explicit; never infer card terms from card names.
 */
export function calculateRewards(card: CardTerms, transactions: Transaction[], year: number): CalculationResult {
  validateTerms(card);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('year must be an integer 2000–2100');
  if (!Array.isArray(transactions)) throw new Error('transactions must be an array');
  const seen = new Set<string>();
  for (const tx of transactions) {
    if (!tx || typeof tx !== 'object') throw new Error('invalid transaction');
    requireString(tx.id, 'transaction.id');
    requireString(tx.category, `transaction[${tx.id}].category`);
    requirePaise(tx.amountPaise, `transaction[${tx.id}].amountPaise`);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(tx.month) || !tx.month.startsWith(`${year}-`)) {
      throw new Error(`transaction[${tx.id}].month must be YYYY-MM in ${year}`);
    }
    if (seen.has(tx.id)) throw new Error(`duplicate transaction id: ${tx.id}`);
    seen.add(tx.id);
  }
  const excluded = new Set(card.excludedCategories ?? []);
  const feeExcluded = new Set(card.feeWaiverExcludedCategories ?? []);
  const monthlyUsage = new Map<string, bigint>();
  const annualUsage = new Map<string, bigint>();
  const results: TransactionResult[] = [];
  let totalSpend = 0n;
  let rewardEligibleSpend = 0n;
  let feeWaiverSpend = 0n;
  let totalRewards = 0n;

  // Avoid caller ordering affecting monthly caps. Order by month, then transaction ID.
  const ordered = [...transactions].sort((a, b) => a.month.localeCompare(b.month) || a.id.localeCompare(b.id));
  for (const tx of ordered) {
    const amount = BigInt(tx.amountPaise);
    totalSpend += amount;
    if (!feeExcluded.has(tx.category)) feeWaiverSpend += amount;
    const base = { id: tx.id, month: tx.month, category: tx.category, amountPaise: tx.amountPaise };
    if (excluded.has(tx.category)) {
      results.push({ ...base, matchedRuleId: null, earnedPaise: 0, reason: 'excluded_category' });
      continue;
    }
    // Rules are deliberately ordered: specific categories should precede wildcard.
    const rule = card.rules.find(r => r.category === tx.category || r.category === '*');
    if (!rule) {
      results.push({ ...base, matchedRuleId: null, earnedPaise: 0, reason: 'no_matching_rule' });
      continue;
    }
    if (amount < BigInt(rule.minTransactionPaise ?? 0)) {
      results.push({ ...base, matchedRuleId: rule.id, earnedPaise: 0, reason: 'below_minimum' });
      continue;
    }
    rewardEligibleSpend += amount;
    const rawReward = amount * BigInt(rule.rateBps) / 10000n; // round down to a whole paisa
    let reward = rawReward;
    const monthlyKey = `${rule.id}:${tx.month}`;
    const monthlyUsed = monthlyUsage.get(monthlyKey) ?? 0n;
    const annualUsed = annualUsage.get(rule.id) ?? 0n;
    const monthlyRemaining = rule.monthlyCapPaise === undefined ? reward : BigInt(rule.monthlyCapPaise) - monthlyUsed;
    const annualRemaining = rule.annualCapPaise === undefined ? reward : BigInt(rule.annualCapPaise) - annualUsed;
    reward = [reward, monthlyRemaining, annualRemaining].reduce((a, b) => a < b ? a : b);
    if (reward < 0n) reward = 0n;
    monthlyUsage.set(monthlyKey, monthlyUsed + reward);
    annualUsage.set(rule.id, annualUsed + reward);
    totalRewards += reward;
    results.push({ ...base, matchedRuleId: rule.id, earnedPaise: safeNumber(reward, 'earnedPaise'), reason: reward > 0n ? 'earned' : rule.rateBps === 0 ? 'zero_reward' : rawReward === 0n ? 'rounded_to_zero' : 'reward_cap_reached' });
  }

  const annualFeeWaived = card.annualFeeWaiverThresholdPaise !== undefined && feeWaiverSpend >= BigInt(card.annualFeeWaiverThresholdPaise);
  const fee = annualFeeWaived ? 0n : BigInt(card.annualFeePaise);
  return {
    year,
    cardId: card.id,
    totalSpendPaise: safeNumber(totalSpend, 'totalSpendPaise'),
    rewardEligibleSpendPaise: safeNumber(rewardEligibleSpend, 'rewardEligibleSpendPaise'),
    feeWaiverEligibleSpendPaise: safeNumber(feeWaiverSpend, 'feeWaiverEligibleSpendPaise'),
    totalRewardsPaise: safeNumber(totalRewards, 'totalRewardsPaise'),
    annualFeeWaived,
    annualFeeChargedPaise: safeNumber(fee, 'annualFeeChargedPaise'),
    netAnnualValuePaise: safeNumber(totalRewards - fee, 'netAnnualValuePaise'),
    transactions: results,
    notes: [
      'Fictional card rules must not be interpreted as actual bank/issuer terms.',
      'Annual fee calculation assumes the transactions represent the complete evaluated year.',
      'No points conversion, fuel surcharge, milestone offers, GST computation, merchant-specific offers or statement cycles in this alpha.'
    ]
  };
}
