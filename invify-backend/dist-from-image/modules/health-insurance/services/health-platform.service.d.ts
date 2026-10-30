import { HealthContext } from '../types';
export interface OperatorGrantDiagnostic {
    hasActiveGrants: boolean;
    activeGrants: {
        permission: string;
        expires_at: string;
    }[];
    inactiveGrants: {
        permission: string;
        status: 'expired' | 'revoked';
        expiresAt: string;
    }[];
}
/**
 * Classifies one operator's own grant rows.
 * Active rows are unrevoked and still in the future. Expired and revoked rows
 * are diagnostic only and must not be treated as authorization.
 * A permission with no row is omitted; callers report that as missing.
 * An unreadable expiry throws so the caller does not describe the row as missing.
 */
export declare function classifyOperatorGrantRows(rows: {
    permission?: string;
    expires_at?: string;
    revoked_at?: string | null;
}[] | null | undefined, nowMs: number): OperatorGrantDiagnostic;
export interface GrantOperatorOption {
    id: string;
    email: string;
    role: string;
}
/** Active administrator accounts that can be selected as a grant recipient. The caller is omitted. */
export declare function grantOperatorOptions(rows: {
    id?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
}[] | null | undefined, actorUserId: string): GrantOperatorOption[];
/** Eight-hour ceiling for ordinary platform grants. Durable entitlements do not use this cap. */
export declare function boundedGrantDurationMinutes(value: unknown): number;
/** A failed or missing count is unavailable. Zero is returned only for a successful count of zero. */
export declare function metricCount(count: number | null | undefined, error: {
    message?: string;
} | null | undefined): number | null;
export declare class HealthPlatformService {
    static getPlatformOverview(ctx: HealthContext): Promise<{
        participatingTenants: number | null;
        totalEnabledTenants: number | null;
        totalEnrolledMembers: number | null;
        totalDistinctMembers: number | null;
        activePolicies: number | null;
        activePoliciesCount: number | null;
        pendingVerification: number | null;
        awaitingPayment: number | null;
        awaitingInsurerActivation: number | null;
        activeEnrolments: number | null;
        policiesExpiringSoon: number | null;
        expiringSoonCount: number | null;
        configuredProviders: number | null;
        providersWithErrors: number | null;
        totalBilledMinor: number | null;
        totalPremiumsBilledKobo: number | null;
        totalCollectedMinor: number | null;
        totalPremiumsCollectedKobo: number | null;
        enrolmentStatusBreakdown: {
            active: number | null;
            awaiting_verification: number | null;
            awaiting_premium_payment: number | null;
            awaiting_insurer_activation: number | null;
        };
        lastRefreshedAt: string;
    }>;
    static listPlatformTenants(ctx: HealthContext, query: any): Promise<{
        tenants: {
            id: any;
            name: any;
            mode: any;
            tenantCode: any;
            agentCode: any;
            institutionName: string;
            institutionCode: string | null;
            institutionId: string | null;
            institutions: import("./health-institution-context").LinkedInstitution[];
            institutionResolution: "unavailable" | "resolved" | "unlinked";
            isEnabled: boolean | null;
            is_enabled: boolean | null;
            schoolEnabled: boolean | null;
            retailEnabled: boolean | null;
            servicesEnabled: boolean | null;
            enrolledCount: number | null;
            enrolled_count: number | null;
            enrolledMembersCount: number | null;
            activeCount: number | null;
            active_count: number | null;
            activePoliciesCount: number | null;
            pendingEnrolmentsCount: number | null;
            integrationStatus: string;
        }[];
        total: number | null;
        limit: number;
        offset: number;
    }>;
    /**
     * Turns hw_tenant_settings.enabled on or off for one tenant.
     * This does not enrol members, issue an invoice, or move money.
     */
    static setTenantParticipation(ctx: HealthContext, tenantId: string, enabled: boolean): Promise<{
        tenantId: string;
        name: any;
        enabled: boolean;
    }>;
    static getProvidersHealth(ctx: HealthContext): Promise<{
        providers: {
            id: any;
            code: any;
            name: any;
            displayName: any;
            integrationStatus: any;
            adapterKey: any;
            isSandbox: boolean;
            isActive: boolean;
            licenceReference: any;
            activePlansCount: number;
            lastVerifiedAt: any;
            capabilities: any;
            observedLatencyMs: null;
            telemetryStatus: string;
        }[];
        timestamp: string;
    }>;
    static getCoverageTrends(ctx: HealthContext): Promise<{
        distributionByMode: Record<string, number>;
        distributionByCategory: Record<string, number>;
        policiesByStatus: Record<string, number>;
        byMode: {
            mode: string;
            count: number;
        }[];
        byCategory: {
            category: string;
            count: number;
        }[];
        byStatus: {
            status: string;
            count: number;
        }[];
        timestamp: string;
    }>;
    static listGrantOperators(actorUserId: string): Promise<GrantOperatorOption[]>;
    static listPlatformGrants(ctx: HealthContext, statusFilter?: string): Promise<{
        id: any;
        userId: any;
        user_id: any;
        email: string;
        userEmail: string;
        user_email: string;
        permission: any;
        grantedBy: any;
        granted_by: any;
        grantedAt: any;
        granted_at: any;
        expiresAt: any;
        expires_at: any;
        revokedAt: any;
        revoked_at: any;
        isActive: boolean;
        is_active: boolean;
        isExpired: boolean;
        is_expired: boolean;
        isRevoked: boolean;
        is_revoked: boolean;
        status: string;
    }[]>;
    static createPlatformGrant(actorUserId: string, data: {
        userId: string;
        permission: string;
        durationMinutes?: number;
        reason: string;
    }): Promise<{
        userId: any;
        email: any;
        userEmail: any;
        user_email: any;
        id: any;
        user_id: any;
        permission: any;
        expires_at: any;
        granted_at: any;
    }>;
    static revokePlatformGrant(actorUserId: string, grantId: string, reason: string): Promise<{
        id: string;
        revokedAt: string;
        status: string;
    }>;
    static listPlatformAuditEvents(ctx: HealthContext, query: any): Promise<{
        events: {
            id: any;
            tenant_id: any;
            actor_user_id: any;
            actor_role: any;
            action: any;
            resource_type: any;
            resource_id: any;
            changes: any;
            via_platform_access: any;
            platform_reason: any;
            occurred_at: any;
        }[];
        total: number | null;
        limit: number;
        offset: number;
    }>;
    static getOperatorGrantStatus(userId: string): Promise<{
        durableEntitlements: import("./platform-entitlement.service").DurableEntitlementDiagnostic[];
        hasActiveGrants: boolean;
        activeGrants: {
            permission: string;
            expires_at: string;
        }[];
        inactiveGrants: {
            permission: string;
            status: "expired" | "revoked";
            expiresAt: string;
        }[];
    }>;
    static getTenantHealthDetail(tenantId: string): Promise<{
        tenant: {
            id: any;
            name: any;
            mode: any;
            tenantCode: any;
            status: any;
        };
        institutions: import("./health-institution-context").TenantInstitutionContext;
        healthAccess: string;
        members: {
            total: number;
            active: number;
            pendingEnrolments: number;
            suspendedOrInactive: number;
            dependants: number | null;
            byPlan: {
                plan: string;
                count: number;
            }[];
            byStatus: Record<string, number>;
            byCategory: Record<string, number>;
        } | null;
        policies: {
            total: number;
            active: number;
        } | null;
        hmos: {
            id: any;
            code: any;
            name: any;
            onboardingStatus: any;
        }[];
        premiums: {
            currency: string;
            billedMinor: number | null;
            collectedMinor: number | null;
            outstandingMinor: number | null;
            recognisedRevenueMinor: null;
            profitMinor: null;
            note: string;
        } | null;
        claims: {
            submitted: number;
            pending: number;
            approved: number;
            rejected: number;
            settled: number;
            paid: number | null;
            authorisedAmountRecorded: boolean;
            note: string;
        } | null;
        utilisation: {
            available: boolean;
            reason: string;
        };
    }>;
    static getInstitutionHealthDetail(institutionId: string): Promise<{
        institution: {
            id: any;
            code: any;
            name: any;
            mode: any;
            status: any;
            source: string;
        };
        tenants: {
            id: any;
            name: any;
            mode: any;
        }[];
        totals: {
            institutions: number;
            tenants: number;
            members: number | null;
            dependants: number | null;
            activePolicies: number | null;
        };
        membersByTenant: {
            tenantId: any;
            tenantName: any;
            members: number | null;
            byCategory: Record<string, number>;
        }[];
        premiums: {
            currency: string;
            billedMinor: number | null;
            collectedMinor: number | null;
            outstandingMinor: number | null;
            recognisedRevenueMinor: null;
            profitMinor: null;
            note: string;
        } | null;
        claims: {
            paid: number | null;
            note: string;
            submitted: number;
            pending: number;
            approved: number;
            rejected: number;
            settled: number;
        } | null;
        utilisation: {
            available: boolean;
            reason: string;
        };
    }>;
    static listPlatformMembers(query: any): Promise<{
        members: {
            id: any;
            memberId: any;
            name: string;
            tenantId: any;
            tenantName: any;
            institutionName: string;
            institutionCode: string | null;
            institutionId: string | null;
            hmoName: any;
            planName: any;
            memberCategory: any;
            enrolmentDate: any;
            membershipStatus: any;
            dependantsCount: number;
            policyStatus: any;
        }[];
        total: number | null;
        limit: number;
        offset: number;
    }>;
    /** Canonical HMO organisation rows. This read does not load plans. */
    static listProviderRegistry(): Promise<{
        id: any;
        code: any;
        display_name: any;
        integration_status: any;
        licence_reference: any;
    }[]>;
    /** Invoice and payment status totals. No payer, member, or enrolment identifiers. */
    static getFinanceSnapshot(): Promise<{
        currency: string;
        invoices: import("./finance-summary").StatusAmountBucket[];
        invoiceCollected: import("./finance-summary").StatusAmountBucket[];
        payments: import("./finance-summary").StatusAmountBucket[];
    }>;
    /**
     * Period premium command data. Amounts stay in integer kobo.
     * Operating expenses, profit, and claim disbursements are not derived here.
     */
    static getFinanceCommand(query: any): Promise<{
        currency: string;
        period: {
            from: string | null;
            to: string | null;
        };
        generatedAt: string;
        totals: {
            billedMinor: number | null;
            collectedMinor: number | null;
            reconciledMinor: number | null;
            outstandingMinor: number | null;
            collectionRateBps: number | null;
        };
        series: {
            points: import("./finance-summary").PremiumMonthPoint[];
            undatedInvoices: number;
            undatedPayments: number;
            incomplete: boolean;
        };
        records: {
            rows: {
                reference: any;
                recordType: string;
                grossMinor: number | null;
                paidMinor: number | null;
                outstandingMinor: number | null;
                status: any;
                occurredOn: any;
                currency: any;
            }[];
            total: number | null;
            limit: number;
            offset: number;
        };
        unavailable: {
            operatingExpenses: string;
            netOperatingProfit: string;
            claimsPaid: string;
            claimsOutstanding: string;
            collectionByHmo: string;
        };
    }>;
    /** Facility network rows for one HMO, or every HMO when no provider filter is set. */
    static listFacilities(providerId?: string): Promise<{
        id: any;
        provider_id: any;
        name: any;
        state: any;
        lga: any;
        services: any;
        is_active: any;
        last_verified_at: any;
        hw_providers: {
            id: any;
            code: any;
            display_name: any;
        }[];
    }[]>;
}
