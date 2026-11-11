export { comparePurchaseImpact } from './purchase-impact.js';
export type { PurchaseImpactEntry, PurchaseImpactResult } from './purchase-impact.js';
export { summarizeStatementCycleSpend } from './statement-cycles.js';
export type { DatedSpendTransaction, StatementCycleSpendSummary } from './statement-cycles.js';
export { createBatchReport } from './batch.js';
export type { BatchScenario, BatchReport, BatchScenarioReport, BatchCardMonthlyReport, MonthlyCardSummary } from './batch.js';
export { auditCatalogUpdate } from './catalog-audit.js';
export type { CatalogUpdateAudit } from './catalog-audit.js';
import { resolveAnnualCardTerms } from './catalog.js';
import type { RuleCatalog, RuleResolveOptions, RuleEvidence, RuleReview } from './catalog.js';
export { validateRuleCatalog, resolveCardTerms, resolveAnnualCardTerms } from './catalog.js';
export type { RuleCatalog, RuleEvidence, RuleReview, CardRuleRevision, RuleResolveOptions } from './catalog.js';

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
  if (!Array.isArray(categories)) throw new Error(`${field} must be a string array`);
  for (let index = 0; index < categories.length; index++) {
    // Check own slots directly: holes/inherited values are not valid entries.
    // Avoid copying an untrusted array or invoking a custom iterator.
    if (!Object.prototype.hasOwnProperty.call(categories, index) ||
        typeof categories[index] !== 'string' || !categories[index].trim()) {
      throw new Error(`${field} must be a string array`);
    }
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
  for (let index = 0; index < card.rules.length; index++) {
    // Validate actual own slots; for..of can be overridden to hide malformed rules.
    if (!Object.prototype.hasOwnProperty.call(card.rules, index)) throw new Error('invalid rule');
    const rule = card.rules[index];
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
    if (typeof tx.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(tx.month) || !tx.month.startsWith(`${year}-`)) {
      throw new Error(`transaction[${tx.id}].month must be YYYY-MM in ${year}`);
    }
    if (seen.has(tx.id)) throw new Error(`duplicate transaction id: ${tx.id}`);
    seen.add(tx.id);
  }
  // Exclusion arrays were validated above; copy indexed values without invoking
  // a caller-provided iterator (which Set(array) would execute).
  const excluded = new Set<string>();
  for (let i = 0; i < (card.excludedCategories?.length ?? 0); i++) excluded.add(card.excludedCategories![i]!);
  const feeExcluded = new Set<string>();
  for (let i = 0; i < (card.feeWaiverExcludedCategories?.length ?? 0); i++) feeExcluded.add(card.feeWaiverExcludedCategories![i]!);
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


/**
 * One independent annual evaluation for a candidate card.
 *
 * Tied cards share the same rank; subsequent ranks use competition ranking
 * (1, 1, 3). A deterministic card-ID sort breaks display-order ties.
 */
export interface CardComparisonEntry {
  rank: number;
  cardId: string;
  cardName: string;
  netAnnualValuePaise: number;
  totalRewardsPaise: number;
  annualFeeChargedPaise: number;
  /** Non-negative gap from the best net annual value. */
  differenceFromLeaderPaise: number;
  /** Full audit-friendly breakdown from calculateRewards. */
  calculation: CalculationResult;
}

export interface CardComparisonResult {
  year: number;
  /** All tied top-ranked cards; never arbitrarily choose one winner. */
  leaderCardIds: string[];
  /** Sorted by net annual value descending, then card ID ascending. */
  entries: CardComparisonEntry[];
  assumptions: string[];
}

/**
 * Compare at least two hypothetical cards against the SAME complete-year spend.
 *
 * This is an all-spend-on-one-card scenario comparison, NOT a per-purchase
 * allocation optimizer. It deliberately reuses calculateRewards so caps,
 * exclusions and fee-waiver semantics remain identical to single-card runs.
 *
 * Only caller-supplied fictional or independently verified terms are used.
 * Do not infer issuer rates or recommend real cards based on unsourced terms.
 */
export function compareCards(
  cards: CardTerms[],
  transactions: Transaction[],
  year: number
): CardComparisonResult {
  if (!Array.isArray(cards) || cards.length < 2) {
    throw new Error('cards must contain at least two card terms');
  }

  const cardIds = new Set<string>();
  const scored: { card: CardTerms; calculation: CalculationResult }[] = [];

  for (const card of cards) {
    const calculation = calculateRewards(card, transactions, year);
    if (cardIds.has(calculation.cardId)) {
      throw new Error('duplicate card id: ' + calculation.cardId);
    }
    cardIds.add(calculation.cardId);
    scored.push({ card, calculation });
  }

  scored.sort((left, right) => {
    const l = left.calculation.netAnnualValuePaise;
    const r = right.calculation.netAnnualValuePaise;
    if (l !== r) return l > r ? -1 : 1;
    return left.card.id < right.card.id ? -1 : left.card.id > right.card.id ? 1 : 0;
  });

  const leader = scored[0];
  if (!leader) throw new Error('no card results to compare');
  const leaderNet = BigInt(leader.calculation.netAnnualValuePaise);

  let rank = 0;
  let previousNet: number | undefined;
  const entries = scored.map(({ card, calculation }, index): CardComparisonEntry => {
    if (previousNet === undefined || calculation.netAnnualValuePaise !== previousNet) {
      rank = index + 1;
      previousNet = calculation.netAnnualValuePaise;
    }
    return {
      rank,
      cardId: card.id,
      cardName: card.name,
      netAnnualValuePaise: calculation.netAnnualValuePaise,
      totalRewardsPaise: calculation.totalRewardsPaise,
      annualFeeChargedPaise: calculation.annualFeeChargedPaise,
      differenceFromLeaderPaise: safeNumber(
        leaderNet - BigInt(calculation.netAnnualValuePaise),
        'differenceFromLeaderPaise'
      ),
      calculation
    };
  });

  return {
    year,
    leaderCardIds: entries.filter(entry => entry.rank === 1).map(entry => entry.cardId),
    entries,
    assumptions: [
      'Every card is evaluated independently against the same complete-year transaction history.',
      'The result is not a per-purchase card-allocation recommendation.',
      'Fees, waiver eligibility and cashback caps are computed under the supplied card terms.',
      'Real issuer rules, reward-point valuations, MCC mapping and statement cycles are not supplied by this engine.'
    ]
  };
}


/** Rule provenance for a year-wide card ranking candidate. */
export interface CatalogComparisonSelection {
  cardId: string;
  revisionId: string;
  effectiveFrom: string;
  effectiveThrough?: string;
  evidence: RuleEvidence[];
  review: RuleReview;
}

export interface CatalogComparisonResult {
  comparison: CardComparisonResult;
  /** In the same order as comparison.entries. */
  selections: CatalogComparisonSelection[];
}

/**
 * Evaluate dated catalog revisions without pretending that a mid-year rule
 * change has a single year-wide rate. Drafts require explicit opt-in.
 *
 * This does not independently authenticate the review metadata or issuer URLs.
 */
export function compareCatalogCards(
  catalog: RuleCatalog,
  cardIds: string[],
  transactions: Transaction[],
  year: number,
  options: RuleResolveOptions = {}
): CatalogComparisonResult {
  if (!Array.isArray(cardIds) || cardIds.length < 2) {
    throw new Error('cardIds must contain at least two card IDs');
  }
  const resolved = cardIds.map(cardId => resolveAnnualCardTerms(catalog, cardId, year, options));
  const comparison = compareCards(resolved.map(revision => revision.terms), transactions, year);
  const selections = comparison.entries.map((entry): CatalogComparisonSelection => {
    const revision = resolved.find(candidate => candidate.terms.id === entry.cardId);
    if (!revision) throw new Error('missing catalog revision for ' + entry.cardId);
    return {
      cardId: entry.cardId,
      revisionId: revision.revisionId,
      effectiveFrom: revision.effectiveFrom,
      ...(revision.effectiveThrough ? { effectiveThrough: revision.effectiveThrough } : {}),
      evidence: revision.evidence,
      review: revision.review
    };
  });
  return { comparison, selections };
}
