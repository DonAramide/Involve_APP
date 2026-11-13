export type CanonicalInstitutionType = 'BANK' | 'HMO' | 'HOSPITAL' | 'AGGREGATOR' | 'PAYMENT_PROVIDER' | 'UNKNOWN';
export type HmoRole = 'HMO_ADMIN' | 'ENROLLMENT_OFFICER' | 'PROVIDER_NETWORK_MANAGER' | 'CLAIMS_OFFICER' | 'AUTHORIZATION_OFFICER' | 'FINANCE_OFFICER' | 'AUDITOR';
export type HmoPermission = 'hmo.dashboard.view' | 'hmo.profile.manage' | 'hmo.schools.view' | 'hmo.schools.manage' | 'hmo.plans.view' | 'hmo.plans.manage' | 'hmo.members.view' | 'hmo.members.manage' | 'hmo.batches.view' | 'hmo.batches.export' | 'hmo.batches.reconcile' | 'hmo.providers.view' | 'hmo.providers.manage' | 'hmo.preauth.view' | 'hmo.preauth.adjudicate' | 'hmo.claims.view' | 'hmo.claims.adjudicate' | 'hmo.billing.view' | 'hmo.billing.reconcile' | 'hmo.reports.view' | 'hmo.reports.export' | 'hmo.users.manage' | 'hmo.audit.view';
export declare const HMO_ROLE_PERMISSIONS: Record<HmoRole, HmoPermission[]>;
export interface ResolvedInstitutionContext {
    agentId: string | null;
    authUserId: string | null;
    email: string | null;
    institutionId: string | null;
    institutionCode: string;
    institutionName: string;
    institutionType: CanonicalInstitutionType;
    portalMode: 'BANK' | 'HMO' | 'RESTRICTED';
    approvalStatus: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'RETIRED' | 'DRAFT';
    kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
    isVerified: boolean;
    featureEnabled: boolean;
    hmoProviderId: string | null;
    hmoProviderCode: string | null;
    hmoRole: HmoRole | null;
    hmoPermissions: HmoPermission[];
    restrictionReason: string | null;
}
export declare class InstitutionClassificationService {
    /**
     * Authoritatively resolves the institution classification from backend database records.
     * Never trusts client-supplied headers, query params, or localStorage flags.
     */
    resolveForAgentOrUser(params: {
        authUserId?: string | null;
        email?: string | null;
        agentRecord?: any | null;
    }): Promise<ResolvedInstitutionContext>;
}
export declare const institutionClassificationService: InstitutionClassificationService;
