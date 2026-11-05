export type InstitutionLinkSource = 'tenant_institution_relationships' | 'hw_tenant_settings' | 'hw_hmo_school_links' | 'agent_code';
export interface LinkedInstitution {
    id: string | null;
    code: string | null;
    name: string;
    mode: string | null;
    source: InstitutionLinkSource;
    serviceType?: string | null;
    relationshipStatus?: string | null;
}
export interface TenantInstitutionContext {
    institutions: LinkedInstitution[];
    primary: LinkedInstitution | null;
    institutionName: string;
    institutionCode: string | null;
    unresolved: boolean;
    resolution: 'resolved' | 'unlinked' | 'unavailable';
}
export declare function relationMissing(error: unknown): boolean;
export declare function pickPrimaryInstitution(links: LinkedInstitution[]): LinkedInstitution | null;
export declare function describeInstitutions(links: LinkedInstitution[]): TenantInstitutionContext;
export declare function resolveInstitutionsForTenants(tenants: {
    id: string;
    agent_code?: string | null;
}[]): Promise<Map<string, TenantInstitutionContext>>;
export declare function claimStatusBucket(status: string): 'pending' | 'approved' | 'rejected' | 'settled' | 'other';
export declare function summariseClaims(rows: {
    status?: string;
    authorised_amount_minor?: unknown;
    record_type?: string;
}[] | null): {
    submitted: number;
    pending: number;
    approved: number;
    rejected: number;
    settled: number;
    paid: number | null;
    authorisedAmountRecorded: boolean;
    note: string;
};
export declare function premiumSnapshot(invoices: any[] | null, payments: any[] | null): {
    currency: string;
    billedMinor: number | null;
    collectedMinor: number | null;
    outstandingMinor: number | null;
    recognisedRevenueMinor: null;
    profitMinor: null;
    note: string;
};
export declare function foldPremiums(rows: Array<ReturnType<typeof premiumSnapshot> | null>): {
    currency: string;
    billedMinor: number | null;
    collectedMinor: number | null;
    outstandingMinor: number | null;
    recognisedRevenueMinor: null;
    profitMinor: null;
    note: string;
} | null;
export declare function foldClaims(rows: Array<ReturnType<typeof summariseClaims> | null>): {
    paid: number | null;
    note: string;
    submitted: number;
    pending: number;
    approved: number;
    rejected: number;
    settled: number;
} | null;
export declare function memberDisplayName(member: any): string;
