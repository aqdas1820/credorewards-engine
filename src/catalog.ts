import type { CardTerms } from './index.js';

/** Evidence is user-supplied metadata, not proof that an issuer term is true. */
export interface RuleEvidence {
  /** HTTPS source document URL. The caller must verify the issuer/domain. */
  url: string;
  documentTitle: string;
  /** Date when the reviewer retrieved the source, YYYY-MM-DD. */
  retrievedOn: string;
  /** Optional specific section, page, table, or quoted identifier. */
  section?: string;
}

export interface RuleReview {
  /** 'reviewed' is a recorded human assertion, not automated verification. */
  status: 'draft' | 'reviewed';
  reviewer?: string;
  reviewedOn?: string;
  notes?: string;
}

export interface CardRuleRevision {
  /** Immutable, globally unique revision identifier. */
  revisionId: string;
  issuer: string;
  cardVariant: string;
  /** First date on which these terms apply, inclusive. */
  effectiveFrom: string;
  /** Last date on which these terms apply, inclusive; omitted if still applicable. */
  effectiveThrough?: string;
  /** Existing cashback schema; its id stays constant across revisions. */
  terms: CardTerms;
  evidence: RuleEvidence[];
  review: RuleReview;
}

export interface RuleCatalog {
  schemaVersion: 1;
  revisions: CardRuleRevision[];
}

export interface RuleResolveOptions {
  /**
   * Permit draft revisions for explicitly hypothetical experiments.
   * Defaults to false; callers must not enable it for production card claims.
   */
  allowDraft?: boolean;
}

function fail(message: string): never {
  throw new Error(message);
}

function nonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(field + ' must be a non-empty string');
  }
}

function nonnegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail(field + ' must be a non-negative safe integer');
  }
}

/** Parse valid Gregorian YYYY-MM-DD without timezone-dependent date parsing. */
function day(value: unknown, field: string): string {
  if (typeof value !== 'string') fail(field + ' must be a valid YYYY-MM-DD date');
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!match) fail(field + ' must be a valid YYYY-MM-DD date');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  if (year < 2000 || year > 2100) fail(field + ' year must be 2000–2100');
  const actual = new Date(Date.UTC(year, month - 1, date));
  if (
    actual.getUTCFullYear() !== year ||
    actual.getUTCMonth() + 1 !== month ||
    actual.getUTCDate() !== date
  ) fail(field + ' must be a valid YYYY-MM-DD date');
  return value;
}

function httpsUrl(value: unknown, field: string): void {
  if (typeof value !== 'string') fail(field + ' must be an HTTPS URL');
  // Explicitly reject non-HTTPS schemes, credentials, ports and local hostnames.
  const match = /^https:\/\/([^/?#\s]+)(?:[/?#][^\s]*)?$/i.exec(value);
  const hostname = match?.[1];
  if (!hostname || hostname.includes('@') || hostname.includes(':')) {
    fail(field + ' must be an HTTPS URL with a public hostname');
  }
  const labels = hostname.split('.');
  if (labels.length < 2 || labels.some(label =>
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  ) || (labels[labels.length - 1]?.length ?? 0) < 2) {
    fail(field + ' must be an HTTPS URL with a public hostname');
  }
}

function stringArray(values: unknown, field: string): void {
  if (values === undefined) return;
  if (!Array.isArray(values)) fail(field + ' must be an array of strings');
  for (const value of values) nonEmpty(value, field + ' entry');
}

/** Mirror the existing CardTerms invariants at the catalog ingestion boundary. */
function validateCardTerms(terms: CardTerms): void {
  if (!terms || typeof terms !== 'object') fail('revision.terms must be an object');
  nonEmpty(terms.id, 'revision.terms.id');
  nonEmpty(terms.name, 'revision.terms.name');
  nonnegativeInteger(terms.annualFeePaise, 'revision.terms.annualFeePaise');
  if (terms.annualFeeWaiverThresholdPaise !== undefined) {
    nonnegativeInteger(terms.annualFeeWaiverThresholdPaise, 'revision.terms.annualFeeWaiverThresholdPaise');
  }
  stringArray(terms.excludedCategories, 'revision.terms.excludedCategories');
  stringArray(terms.feeWaiverExcludedCategories, 'revision.terms.feeWaiverExcludedCategories');
  if (!Array.isArray(terms.rules)) fail('revision.terms.rules must be an array');
  const ids = new Set<string>();
  for (const rule of terms.rules) {
    if (!rule || typeof rule !== 'object') fail('revision.terms rule must be an object');
    nonEmpty(rule.id, 'revision.terms rule id');
    nonEmpty(rule.category, 'revision.terms rule category');
    if (!Number.isInteger(rule.rateBps) || rule.rateBps < 0 || rule.rateBps > 10000) {
      fail('revision.terms rule rateBps must be 0–10000');
    }
    if (ids.has(rule.id)) fail('duplicate rule id: ' + rule.id);
    ids.add(rule.id);
    for (const field of ['minTransactionPaise', 'monthlyCapPaise', 'annualCapPaise'] as const) {
      if (rule[field] !== undefined) nonnegativeInteger(rule[field], 'revision.terms rule ' + field);
    }
  }
}

/**
 * Validate source metadata, date applicability and financial term shape.
 * No network lookups or automated issuer verification are performed.
 */
export function validateRuleCatalog(catalog: RuleCatalog): void {
  if (!catalog || typeof catalog !== 'object' || catalog.schemaVersion !== 1) {
    fail('catalog.schemaVersion must be 1');
  }
  if (!Array.isArray(catalog.revisions)) fail('catalog.revisions must be an array');

  const revisionIds = new Set<string>();
  const cardIntervals = new Map<string, Array<{ from: string; through: string }>>();

  for (const revision of catalog.revisions) {
    if (!revision || typeof revision !== 'object') fail('catalog revision must be an object');
    nonEmpty(revision.revisionId, 'revision.revisionId');
    nonEmpty(revision.issuer, 'revision.issuer');
    nonEmpty(revision.cardVariant, 'revision.cardVariant');
    if (revisionIds.has(revision.revisionId)) fail('duplicate revision id: ' + revision.revisionId);
    revisionIds.add(revision.revisionId);

    const from = day(revision.effectiveFrom, 'revision.effectiveFrom');
    const through = revision.effectiveThrough === undefined
      ? '9999-12-31'
      : day(revision.effectiveThrough, 'revision.effectiveThrough');
    if (through < from) fail('revision.effectiveThrough must not precede effectiveFrom');

    validateCardTerms(revision.terms);

    if (!Array.isArray(revision.evidence)) fail('revision.evidence must be an array');
    for (const evidence of revision.evidence) {
      if (!evidence || typeof evidence !== 'object') fail('revision evidence must be an object');
      httpsUrl(evidence.url, 'revision.evidence.url');
      nonEmpty(evidence.documentTitle, 'revision.evidence.documentTitle');
      day(evidence.retrievedOn, 'revision.evidence.retrievedOn');
      if (evidence.section !== undefined) nonEmpty(evidence.section, 'revision.evidence.section');
    }

    if (!revision.review || typeof revision.review !== 'object' ||
      (revision.review.status !== 'draft' && revision.review.status !== 'reviewed')) {
      fail('revision.review.status must be draft or reviewed');
    }
    if (revision.review.status === 'reviewed') {
      if (revision.evidence.length === 0) fail('reviewed revisions require source evidence');
      nonEmpty(revision.review.reviewer, 'revision.review.reviewer');
      day(revision.review.reviewedOn, 'revision.review.reviewedOn');
    } else {
      if (revision.review.reviewer !== undefined) nonEmpty(revision.review.reviewer, 'revision.review.reviewer');
      if (revision.review.reviewedOn !== undefined) day(revision.review.reviewedOn, 'revision.review.reviewedOn');
    }
    if (revision.review.notes !== undefined) nonEmpty(revision.review.notes, 'revision.review.notes');

    const intervals = cardIntervals.get(revision.terms.id) ?? [];
    for (const interval of intervals) {
      if (from <= interval.through && interval.from <= through) {
        fail('overlapping effective periods for card: ' + revision.terms.id);
      }
    }
    intervals.push({ from, through });
    cardIntervals.set(revision.terms.id, intervals);
  }
}

/** Return independent copies so consumers cannot mutate the catalog history. */
function copyRevision(revision: CardRuleRevision): CardRuleRevision {
  return {
    ...revision,
    terms: {
      ...revision.terms,
      excludedCategories: revision.terms.excludedCategories?.slice(),
      feeWaiverExcludedCategories: revision.terms.feeWaiverExcludedCategories?.slice(),
      rules: revision.terms.rules.map(rule => ({ ...rule }))
    },
    evidence: revision.evidence.map(evidence => ({ ...evidence })),
    review: { ...revision.review }
  };
}

function requireReviewed(revision: CardRuleRevision, options: RuleResolveOptions): void {
  if (revision.review.status !== 'reviewed' && options.allowDraft !== true) {
    fail('card revision is draft: ' + revision.revisionId + ' (explicit allowDraft required)');
  }
}

/** Resolve the revision applicable on a particular calendar date. */
export function resolveCardTerms(
  catalog: RuleCatalog,
  cardId: string,
  asOf: string,
  options: RuleResolveOptions = {}
): CardRuleRevision {
  validateRuleCatalog(catalog);
  nonEmpty(cardId, 'cardId');
  const requested = day(asOf, 'asOf');
  const revision = catalog.revisions.find(item =>
    item.terms.id === cardId &&
    item.effectiveFrom <= requested &&
    (item.effectiveThrough === undefined || item.effectiveThrough >= requested)
  );
  if (!revision) fail('no applicable revision for card ' + cardId + ' on ' + requested);
  requireReviewed(revision, options);
  return copyRevision(revision);
}

/**
 * Annual fee and cap calculations are not date-split. Refuse an annual request
 * unless a single revision covers January 1 through December 31.
 */
export function resolveAnnualCardTerms(
  catalog: RuleCatalog,
  cardId: string,
  year: number,
  options: RuleResolveOptions = {}
): CardRuleRevision {
  validateRuleCatalog(catalog);
  nonEmpty(cardId, 'cardId');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    fail('year must be an integer 2000–2100');
  }
  const first = String(year) + '-01-01';
  const last = String(year) + '-12-31';
  const revision = catalog.revisions.find(item =>
    item.terms.id === cardId &&
    item.effectiveFrom <= first &&
    (item.effectiveThrough === undefined || item.effectiveThrough >= last)
  );
  if (!revision) {
    fail('no single revision covers full year ' + year + ' for card ' + cardId +
      '; split-year calculations are not supported');
  }
  requireReviewed(revision, options);
  return copyRevision(revision);
}
