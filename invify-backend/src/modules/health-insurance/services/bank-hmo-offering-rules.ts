/**
 * Bank offering status changes. The reference price stays on the published
 * plan version. This module does not calculate or store a bank price.
 */

export type OfferingAction = 'unchanged' | 'activated' | 'deactivated' | 'reactivated';

export type OfferingDecision =
  | { ok: true; action: OfferingAction; nextActive: boolean }
  | { ok: false; status: number; code: string; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeReason(value: unknown): string {
  return String(value || '').trim();
}

export function decideOfferingChange(input: {
  planVersionId: string;
  exists: boolean;
  currentActive: boolean | null;
  requestedActive: boolean;
  versionStatus: string | null;
  planStatus: string | null;
  reason: string;
}): OfferingDecision {
  if (!UUID.test(input.planVersionId)) {
    return { ok: false, status: 400, code: 'PLAN_VERSION_INVALID', message: 'A published plan version id is required.' };
  }
  if (normalizeReason(input.reason).length < 5) {
    return { ok: false, status: 400, code: 'REASON_REQUIRED', message: 'A reason of at least 5 characters is required.' };
  }
  if (!input.versionStatus) {
    return { ok: false, status: 404, code: 'PLAN_VERSION_NOT_FOUND', message: 'That plan version was not found.' };
  }
  if (input.requestedActive && (input.versionStatus !== 'published' || input.planStatus !== 'active')) {
    return {
      ok: false,
      status: 409,
      code: 'PLAN_VERSION_INELIGIBLE',
      message: 'Only a published version of an active plan can be activated. Draft and retired versions are refused.',
    };
  }
  if (!input.requestedActive && !input.exists) {
    return { ok: false, status: 404, code: 'OFFERING_NOT_FOUND', message: 'This bank has no offering to deactivate for that plan version.' };
  }
  if (input.exists && input.currentActive === input.requestedActive) {
    return { ok: true, action: 'unchanged', nextActive: input.requestedActive };
  }
  if (!input.exists) return { ok: true, action: 'activated', nextActive: true };
  if (input.requestedActive) return { ok: true, action: 'reactivated', nextActive: true };
  return { ok: true, action: 'deactivated', nextActive: false };
}

export function tenantSelectionDecision(input: {
  attributedToBank: boolean;
  offeringActive: boolean;
  versionPublished: boolean;
  planActive: boolean;
}): { allowed: boolean; code: string; message: string } {
  if (!input.attributedToBank) {
    return {
      allowed: true,
      code: 'NOT_BANK_DISTRIBUTED',
      message: 'This tenant is not attributed to a bank distribution channel.',
    };
  }
  if (!input.versionPublished || !input.planActive) {
    return {
      allowed: false,
      code: 'PLAN_VERSION_INELIGIBLE',
      message: 'That plan version is no longer published for a new selection.',
    };
  }
  if (!input.offeringActive) {
    return {
      allowed: false,
      code: 'OFFERING_INACTIVE',
      message: 'That plan is not an active offering of this tenant\'s bank.',
    };
  }
  return { allowed: true, code: 'ELIGIBLE', message: 'The bank offering is active and the plan version is published.' };
}
