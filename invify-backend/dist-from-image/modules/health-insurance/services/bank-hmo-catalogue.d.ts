/**
 * Published HMO catalogue shaping for a bank distribution channel.
 * A plan is distributable only when the plan is active and it has a published version.
 * Draft and retired versions are not offered for new bank activation.
 */
export declare const BANK_PRICE_POLICY_MESSAGE = "Platform reference prices are the published premium_minor values. No minimum, maximum, or permitted bank adjustment is stored, so a bank price is not accepted.";
export type PublishedVersionView = {
    versionId: string;
    version: number;
    premiumMinor: number;
    currency: string;
    billingFrequency: string;
    memberCategories: string[];
    benefits: unknown;
    exclusions: unknown;
    eligibilityRules: unknown;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    publishedAt: string | null;
};
export type PublishedPlanView = {
    planId: string;
    planCode: string;
    planName: string;
    providerId: string;
    providerCode: string;
    providerName: string;
    licenceReference: string | null;
    integrationStatus: string | null;
    versions: PublishedVersionView[];
};
export declare function shapePublishedCatalogue(rows: any[] | null | undefined): PublishedPlanView[];
export declare function filterCatalogue(plans: PublishedPlanView[], search: string): PublishedPlanView[];
export declare function paginate<T>(rows: T[], pageInput: unknown, limitInput: unknown): {
    page: number;
    limit: number;
    total: number;
    data: T[];
};
export declare function catalogueCategories(plans: PublishedPlanView[]): {
    category: string;
    planCount: number;
}[];
export declare function offeringViews(plans: PublishedPlanView[], owned?: Array<{
    id?: string;
    plan_version_id?: string;
    planVersionId?: string;
    is_active?: boolean;
    isActive?: boolean;
}>): Record<string, unknown>[];
