export declare class BankHmoDistributionService {
    static catalogue(search: string, page: unknown, limit: unknown): Promise<{
        publishedHmos: number;
        publishedPlans: number;
        pricePolicy: string;
        page: number;
        limit: number;
        total: number;
        data: import("./bank-hmo-catalogue").PublishedPlanView[];
    }>;
    static providerDetail(providerId: string): Promise<{
        providerId: string;
        providerName: string;
        providerCode: string;
        plans: import("./bank-hmo-catalogue").PublishedPlanView[];
        facilities: {
            id: any;
            provider_id: any;
            name: any;
            state: any;
            lga: any;
            services: any;
            is_active: any;
            source: any;
        }[];
        facilitiesUnavailable: string | null;
    } | null>;
    static facilities(search: string, page: unknown, limit: unknown): Promise<{
        page: number;
        limit: number;
        total: number;
        data: {
            id: any;
            providerId: any;
            hmoName: string;
            name: any;
            state: any;
            lga: any;
            services: any;
        }[];
    }>;
    static offerings(agentId: string, search: string, page: unknown, limit: unknown): Promise<{
        offeringsUnavailable: string | null;
        pricePolicy: string;
        page: number;
        limit: number;
        total: number;
        data: Record<string, unknown>[];
    }>;
    static availableForTenants(agentId: string): Promise<{
        data: Record<string, unknown>[];
        unavailable: string | null;
    }>;
    static setOffering(input: {
        agentId: string;
        actorUserId: string;
        planVersionId: string;
        active: boolean;
        reason: string;
    }): Promise<{
        offeringId: any;
        planVersionId: string;
        isActive: boolean;
        action: string;
        referencePremiumMinor: any;
        currency: any;
    }>;
    static validateTenantSelection(agentId: string, tenantId: string, planVersionId: string): Promise<{
        eligible: boolean;
        planVersionId: string;
        referencePremiumMinor: any;
        currency: any;
    }>;
    static overview(agentId: string, agentCode: string): Promise<{
        publishedHmos: number;
        publishedPlans: number;
        categories: {
            category: string;
            planCount: number;
        }[];
        activeBankOfferings: number | null;
        activeBankOfferingsReason: string | null;
        attributedTenants: number;
        enrolments: {
            total: null;
            byStatus: {};
            unavailable: string;
        } | {
            total: number;
            byStatus: Record<string, number>;
            unavailable: string | null;
        };
        claims: {
            disbursed: null;
            disbursedReason: string;
            total: null;
            byStatus: {};
            unavailable: string;
        } | {
            disbursed: null;
            disbursedReason: string;
            total: number;
            byStatus: Record<string, number>;
            unavailable: string | null;
        };
        premiums: {
            billedMinor: number;
            collectedMinor: number;
            reconciledMinor: number;
            outstandingMinor: number;
            unavailable: string | null;
        } | {
            billedMinor: null;
            collectedMinor: null;
            reconciledMinor: null;
            outstandingMinor: null;
            unavailable: string;
        } | {
            unavailable: string | null;
            billedMinor: number | null;
            collectedMinor: number | null;
            reconciledMinor: number | null;
            outstandingMinor: number | null;
            collectionRateBps: number | null;
        };
        operatingExpenses: null;
        netOperatingProfit: null;
        financeUnavailableReason: string;
        pricePolicy: string;
    }>;
    static tenants(agentId: string, agentCode: string): Promise<{
        id: any;
        name: any;
        status: any;
        createdAt: any;
        hmoSelection: string;
        hmoSelectionReason: string;
    }[]>;
}
export declare function distributingBankId(tenantId: string): Promise<string | null | 'unavailable'>;
export declare function activeBankOfferingVersionIds(tenantId: string): Promise<Set<string> | null | 'unavailable'>;
export declare function assertBankOfferingForNewEnrolment(tenantId: string, planVersionId: string): Promise<void>;
