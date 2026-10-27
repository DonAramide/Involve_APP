/**
 * Canonical hw_plans / hw_plan_versions draft rules.
 * Lifecycle on the tables is draft | active | retired for plans,
 * and draft | published | retired for versions. There is no separate
 * approval-state column. Publishing and activation are explicit later steps.
 */

export const PLAN_MEMBER_CATEGORIES = [
  'student',
  'teaching_staff',
  'non_teaching_staff',
  'dependant',
  'retail_employee',
  'services_member'
] as const;

export const PLAN_BILLING_FREQUENCIES = [
  'monthly',
  'quarterly',
  'termly',
  'annual',
  'one_off'
] as const;

const PLAN_CODE = /^[A-Za-z0-9_\-]{2,60}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class PlanDraftValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PlanDraftValidationError';
    this.status = status;
  }
}

export interface ValidatedPlanDraft {
  providerId: string;
  code: string;
  name: string;
  premiumMinor: number;
  currency: 'NGN';
  billingFrequency: (typeof PLAN_BILLING_FREQUENCIES)[number];
  memberCategories: string[];
  eligibilityRules: Record<string, number>;
  benefits: Array<{ category: string; limitMinor: number; copayBps: number }>;
  exclusions: string[];
  effectiveFrom: string;
  effectiveTo: string | null;
  requiresVerification: boolean;
  activationRequiresPayment: boolean;
}

function reject(message: string): never {
  throw new PlanDraftValidationError(message);
}

/** Parse a naira amount with at most two decimal places into integer kobo. */
export function nairaToKobo(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) return null;
    const raw = input.toFixed(2);
    return nairaToKobo(raw);
  }
  const raw = String(input ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, frac = ''] = raw.split('.');
  const kobo = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(kobo) || kobo < 0) return null;
  return kobo;
}

function optionalBoundedInt(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    reject(`${field} must be an integer between ${min} and ${max}.`);
  }
  return n;
}

export function validatePlanDraft(body: any): ValidatedPlanDraft {
  if (!body || typeof body !== 'object') reject('Plan payload is required.');
  if (body.publishImmediately || body.activate || body.status === 'active' || body.status === 'published') {
    reject('Saving a plan draft does not publish or activate it. Use the publish and activate actions after review.');
  }

  const providerId = String(body.providerId || body.provider_id || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId)) {
    reject('Owning HMO provider id is required.');
  }

  const code = String(body.code || '').trim();
  if (!PLAN_CODE.test(code)) {
    reject('Plan code must be 2–60 characters and use only letters, numbers, underscore, or hyphen.');
  }

  const name = String(body.name || '').trim();
  if (name.length < 2 || name.length > 160) reject('Plan name must be between 2 and 160 characters.');

  let premiumMinor: number | null = null;
  if (body.premiumMinor !== undefined || body.premium_minor !== undefined) {
    const rawMinor = Number(body.premiumMinor ?? body.premium_minor);
    if (!Number.isInteger(rawMinor) || rawMinor < 0) reject('Premium minor units must be a non-negative integer (kobo).');
    premiumMinor = rawMinor;
  } else if (body.premiumNaira !== undefined || body.premium !== undefined) {
    premiumMinor = nairaToKobo(body.premiumNaira ?? body.premium);
    if (premiumMinor === null) reject('Premium must be a non-negative NGN amount with at most two decimal places.');
  } else {
    reject('Premium amount is required. No default premium is applied.');
  }

  const billingRaw = String(body.billingFrequency || body.billing_frequency || '').trim();
  if (!PLAN_BILLING_FREQUENCIES.includes(billingRaw as any)) {
    reject(`Billing frequency must be one of: ${PLAN_BILLING_FREQUENCIES.join(', ')}.`);
  }

  const categories = body.memberCategories || body.member_categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    reject('At least one eligible member category is required.');
  }
  const memberCategories = categories.map((c: unknown) => String(c));
  if (memberCategories.some((c: string) => !PLAN_MEMBER_CATEGORIES.includes(c as any))) {
    reject(`Member categories must be chosen from: ${PLAN_MEMBER_CATEGORIES.join(', ')}.`);
  }

  const eligibilityInput = body.eligibilityRules || body.eligibility_rules || {};
  const eligibilityRules: Record<string, number> = {};
  const minAge = optionalBoundedInt(eligibilityInput.minAge, 'Minimum age', 0, 120);
  const maxAge = optionalBoundedInt(eligibilityInput.maxAge, 'Maximum age', 0, 120);
  const waitingPeriodDays = optionalBoundedInt(eligibilityInput.waitingPeriodDays, 'Waiting period days', 0, 3650);
  const maxDependants = optionalBoundedInt(eligibilityInput.maxDependants, 'Maximum dependants', 0, 30);
  if (minAge !== undefined) eligibilityRules.minAge = minAge;
  if (maxAge !== undefined) eligibilityRules.maxAge = maxAge;
  if (minAge !== undefined && maxAge !== undefined && maxAge < minAge) {
    reject('Maximum age cannot be lower than minimum age.');
  }
  if (waitingPeriodDays !== undefined) eligibilityRules.waitingPeriodDays = waitingPeriodDays;
  if (maxDependants !== undefined) eligibilityRules.maxDependants = maxDependants;

  const benefitsInput = body.benefits === undefined ? [] : body.benefits;
  if (!Array.isArray(benefitsInput)) reject('Benefits must be a list.');
  const benefits = benefitsInput.map((benefit: any, index: number) => {
    const category = String(benefit?.category || '').trim();
    if (!category || category.length > 80) reject(`Benefit ${index + 1} needs a category name.`);
    const limitMinor = benefit.limitMinor !== undefined
      ? Number(benefit.limitMinor)
      : nairaToKobo(benefit.limitNaira);
    if (limitMinor === null || !Number.isInteger(limitMinor) || limitMinor < 0) {
      reject(`Benefit ${index + 1} needs a non-negative coverage limit.`);
    }
    const copayBps = benefit.copayBps === undefined ? 0 : Number(benefit.copayBps);
    if (!Number.isInteger(copayBps) || copayBps < 0 || copayBps > 10000) {
      reject(`Benefit ${index + 1} co-payment must be between 0 and 10000 basis points.`);
    }
    return { category, limitMinor, copayBps };
  });

  const exclusionsInput = body.exclusions === undefined ? [] : body.exclusions;
  if (!Array.isArray(exclusionsInput)) reject('Exclusions must be a list of phrases.');
  const exclusions = exclusionsInput.map((item: unknown) => String(item || '').trim()).filter(Boolean);
  if (exclusions.some((item) => item.length > 200)) reject('Each exclusion must be 200 characters or fewer.');

  const effectiveFrom = String(body.effectiveFrom || body.effective_from || '').slice(0, 10);
  if (!ISO_DATE.test(effectiveFrom)) reject('Effective date is required (YYYY-MM-DD).');
  const effectiveToRaw = body.effectiveTo || body.effective_to || null;
  const effectiveTo = effectiveToRaw ? String(effectiveToRaw).slice(0, 10) : null;
  if (effectiveTo && !ISO_DATE.test(effectiveTo)) reject('Expiry date must be YYYY-MM-DD.');
  if (effectiveTo && effectiveTo <= effectiveFrom) reject('Expiry date must be after the effective date.');

  return {
    providerId,
    code,
    name,
    premiumMinor,
    currency: 'NGN',
    billingFrequency: billingRaw as ValidatedPlanDraft['billingFrequency'],
    memberCategories,
    eligibilityRules,
    benefits,
    exclusions,
    effectiveFrom,
    effectiveTo,
    requiresVerification: body.requiresVerification !== false && body.requires_verification !== false,
    activationRequiresPayment: body.activationRequiresPayment !== false && body.activation_requires_payment !== false
  };
}
