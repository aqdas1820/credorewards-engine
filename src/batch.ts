import { compareCards } from './index.js';
import type { CardComparisonResult, CardTerms, Transaction } from './index.js';

/** One independent annual what-if comparison. Scenarios are not combined. */
export interface BatchScenario {
  id: string;
  year: number;
  cards: CardTerms[];
  transactions: Transaction[];
}

export interface MonthlyCardSummary {
  /** Calendar month YYYY-MM, including zero-activity months. */
  month: string;
  transactionCount: number;
  totalSpendPaise: number;
  totalRewardsPaise: number;
}

export interface BatchCardMonthlyReport {
  cardId: string;
  months: MonthlyCardSummary[];
}

export interface BatchScenarioReport {
  scenarioId: string;
  year: number;
  /** The unchanged, audit-friendly comparison for this one scenario. */
  comparison: CardComparisonResult;
  /** In the same card order as comparison.entries. */
  monthlyByCard: BatchCardMonthlyReport[];
}

export interface BatchReport {
  reportVersion: 1;
  scenarioCount: number;
  /** Scenarios are sorted by ID; calculations do not share caps or fees. */
  scenarios: BatchScenarioReport[];
  limitations: string[];
}

/**
 * Evaluate separate annual comparison scenarios with per-month card summaries.
 *
 * Each scenario evaluates every card against its own complete-year transaction
 * data. All arithmetic delegates to the existing integer-paise engine. The
 * annual fee is not apportioned to calendar months. Reject the entire batch
 * if any scenario is invalid rather than silently omitting failed comparisons.
 */
export function createBatchReport(scenarios: BatchScenario[]): BatchReport {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error('scenarios must be a non-empty array');
  }
  const ids = new Set<string>();
  const reports: BatchScenarioReport[] = [];

  for (const scenario of scenarios) {
    if (!scenario || typeof scenario !== 'object') {
      throw new Error('batch scenario must be an object');
    }
    if (typeof scenario.id !== 'string' || !scenario.id.trim()) {
      throw new Error('batch scenario id must be a non-empty string');
    }
    if (ids.has(scenario.id)) {
      throw new Error('duplicate batch scenario id: ' + scenario.id);
    }
    ids.add(scenario.id);

    let comparison: CardComparisonResult;
    try {
      comparison = compareCards(scenario.cards, scenario.transactions, scenario.year);
    } catch (error) {
      throw new Error(
        'scenario ' + scenario.id + ': ' +
        (error instanceof Error ? error.message : String(error))
      );
    }

    const monthlyByCard = comparison.entries.map(entry => {
      const amounts = new Map<string, {
        transactionCount: number; spend: bigint; rewards: bigint
      }>();
      for (const transaction of entry.calculation.transactions) {
        const bucket = amounts.get(transaction.month) ?? {
          transactionCount: 0, spend: 0n, rewards: 0n
        };
        bucket.transactionCount += 1;
        bucket.spend += BigInt(transaction.amountPaise);
        bucket.rewards += BigInt(transaction.earnedPaise);
        amounts.set(transaction.month, bucket);
      }

      const months: MonthlyCardSummary[] = Array.from({ length: 12 }, (_, index) => {
        const month = String(scenario.year) + '-' + String(index + 1).padStart(2, '0');
        const bucket = amounts.get(month);
        return {
          month,
          transactionCount: bucket?.transactionCount ?? 0,
          // The existing engine verified annual totals fit in safe integers;
          // each monthly non-negative subtotal is bounded by the annual total.
          totalSpendPaise: Number(bucket?.spend ?? 0n),
          totalRewardsPaise: Number(bucket?.rewards ?? 0n)
        };
      });
      return { cardId: entry.cardId, months };
    });

    reports.push({
      scenarioId: scenario.id,
      year: scenario.year,
      comparison,
      monthlyByCard
    });
  }
  reports.sort((a, b) =>
    a.scenarioId < b.scenarioId ? -1 : a.scenarioId > b.scenarioId ? 1 : 0
  );

  return {
    reportVersion: 1,
    scenarioCount: reports.length,
    scenarios: reports,
    limitations: [
      'Each card is evaluated independently against the same spending inside its scenario; no per-transaction card allocation is performed.',
      'Different scenarios are independent; results, fee waivers and reward caps must not be added together as one financial account.',
      'Calendar months are not issuer statement cycles; annual fees are shown only in annual comparison totals.',
      'Complete-year spending and independently verified card terms must be supplied by the caller; this SDK bundles only synthetic draft examples.'
    ]
  };
}
