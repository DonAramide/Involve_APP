import { HealthContext } from '../types';
export declare class HealthClaimService {
    /**
     * List claims/authorisations for a tenant.
     */
    static listClaims(ctx: HealthContext, policyId?: string): Promise<{
        id: any;
        claim_reference: any;
        record_type: any;
        status: any;
        submitted_date: any;
        status_date: any;
        authorised_amount_minor: any;
        currency: any;
        rejection_reason: any;
        last_synced_at: any;
        hw_members: {
            id: any;
            member_category: any;
            students: {
                first_name: any;
                last_name: any;
                admission_number: any;
            }[];
        }[];
        hw_facilities: {
            name: any;
            state: any;
            lga: any;
        }[];
    }[]>;
    /**
     * Look up claim status from provider.
     */
    static lookupClaimStatus(ctx: HealthContext, claimReference: string): Promise<{
        connected: boolean;
        isSandbox: boolean;
        data: import("../adapters/provider-adapter.interface").ClaimStatusResponse;
        message?: undefined;
    } | {
        connected: boolean;
        isSandbox: boolean;
        message: string;
        data?: undefined;
    }>;
}
