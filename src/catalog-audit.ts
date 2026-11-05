import { validateRuleCatalog } from './catalog.js';
import type { CardRuleRevision, RuleCatalog } from './catalog.js';

export interface CatalogUpdateAudit {
  /** Newly introduced immutable revision IDs, sorted lexicographically. */
  addedRevisionIds: string[];
  /** Existing open-ended revisions given a final inclusive date. */
  closedRevisionIds: string[];
  /** Draft revisions promoted to a recorded reviewed assertion. */
  promotedRevisionIds: string[];
  unchangedRevisionIds: string[];
}

/**
 * Guard an update against silently rewriting, removing or reopening history.
 *
 * Existing revision terms and identities are immutable. Evidence may only be
 * appended while still draft or during promotion; earlier evidence cannot be
 * changed. Closing an open-ended period is permitted once, and a draft may be
 * promoted to reviewed with supporting metadata. These are declarations made
 * by the caller, NOT issuer verification, cryptographic proof or authorization.
 */
export function auditCatalogUpdate(
  previous: RuleCatalog,
  proposed: RuleCatalog
): CatalogUpdateAudit {
  validateRuleCatalog(previous);
  validateRuleCatalog(proposed);

  const nextById = new Map(proposed.revisions.map(revision => [revision.revisionId, revision]));
  const oldById = new Map(previous.revisions.map(revision => [revision.revisionId, revision]));
  const result: CatalogUpdateAudit = {
    addedRevisionIds: [], closedRevisionIds: [],
    promotedRevisionIds: [], unchangedRevisionIds: []
  };

  for (const prior of previous.revisions) {
    const next = nextById.get(prior.revisionId);
    if (!next) throw new Error('cannot delete historical revision: ' + prior.revisionId);

    const id = prior.revisionId;
    if (canonical(fixedFields(prior)) !== canonical(fixedFields(next))) {
      throw new Error('revision terms/identity changed; create a new revisionId: ' + id);
    }

    const closed = prior.effectiveThrough === undefined && next.effectiveThrough !== undefined;
    if (prior.effectiveThrough !== next.effectiveThrough && !closed) {
      throw new Error('cannot reopen or change an already closed period: ' + id);
    }

    if (next.evidence.length < prior.evidence.length ||
      prior.evidence.some((source, i) => canonical(source) !== canonical(next.evidence[i]))) {
      throw new Error('cannot remove or rewrite existing evidence: ' + id);
    }

    const promoted = prior.review.status === 'draft' && next.review.status === 'reviewed';
    if (prior.review.status !== next.review.status && !promoted) {
      throw new Error('review status cannot be downgraded: ' + id);
    }
    if (promoted) {
      // Reviewer and date may be recorded on promotion, but notes cannot be rewritten.
      if (prior.review.notes !== next.review.notes) {
        throw new Error('review notes cannot be rewritten on promotion: ' + id);
      }
    } else if (canonical(prior.review) !== canonical(next.review)) {
      throw new Error('review record cannot be rewritten: ' + id);
    }
    if (prior.review.status === 'reviewed' && next.evidence.length !== prior.evidence.length) {
      throw new Error('reviewed evidence is frozen; create a new revision: ' + id);
    }
    if (closed) result.closedRevisionIds.push(id);
    if (promoted) result.promotedRevisionIds.push(id);
    if (!closed && !promoted && next.evidence.length === prior.evidence.length) {
      result.unchangedRevisionIds.push(id);
    }
  }

  for (const next of proposed.revisions) {
    if (!oldById.has(next.revisionId)) result.addedRevisionIds.push(next.revisionId);
  }
  for (const values of Object.values(result)) values.sort();
  return result;
}

function fixedFields(revision: CardRuleRevision): object {
  const { effectiveThrough: _through, evidence: _evidence, review: _review, ...rest } = revision;
  return rest;
}

/** Canonical comparison ignores JSON property order, not field contents. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const entries = Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return '{' + entries.map(([key, entry]) => JSON.stringify(key) + ':' + canonical(entry)).join(',') + '}';
}
