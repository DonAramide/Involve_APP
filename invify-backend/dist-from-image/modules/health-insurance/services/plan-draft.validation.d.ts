/**
 * Canonical hw_plans / hw_plan_versions draft rules.
 * Lifecycle on the tables is draft | active | retired for plans,
 * and draft | published | retired for versions. There is no separate
 * approval-state column. Publishing and activation are explicit later steps.
 */
export declare const PLAN_MEMBER_CATEGORIES: readonly ["student", "teaching_staff", "non_teaching_staff", "dependant", "retail_employee", "services_member"];
export declare const PLAN_BILLING_FREQUENCIES: readonly ["monthly", "quarterly", "termly", "annual", "one_off"];
export declare class PlanDraftValidationError extends Error {
    status: number;
    constructor(message: string, status?: number);
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
    benefits: Array<{
        category: string;
        limitMinor: number;
        copayBps: number;
    }>;
    exclusions: string[];
    effectiveFrom: string;
    effectiveTo: string | null;
    requiresVerification: boolean;
    activationRequiresPayment: boolean;
}
/** Parse a naira amount with at most two decimal places into integer kobo. */
export declare function nairaToKobo(input: unknown): number | null;
export declare function validatePlanDraft(body: any): ValidatedPlanDraft;
