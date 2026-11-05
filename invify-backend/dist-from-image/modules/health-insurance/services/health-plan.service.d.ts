import { HealthContext } from '../types';
export declare class HealthPlanService {
    /**
     * List approved insurance providers.
     */
    static listProviders(): Promise<{
        id: any;
        code: any;
        display_name: any;
        licence_reference: any;
        integration_status: any;
        adapter_key: any;
        capabilities: any;
        last_verified_at: any;
    }[]>;
    /**
     * List available published plans and versions.
     */
    static listPlans(providerId?: string): Promise<{
        id: any;
        code: any;
        name: any;
        status: any;
        provider_id: any;
        hw_providers: {
            id: any;
            code: any;
            display_name: any;
        }[];
        hw_plan_versions: {
            id: any;
            version: any;
            status: any;
            premium_minor: any;
            currency: any;
            billing_frequency: any;
            member_categories: any;
            eligibility_rules: any;
            benefits: any;
            exclusions: any;
            effective_from: any;
            effective_to: any;
        }[];
    }[]>;
    /**
     * List plan versions offered by the caller's tenant.
     */
    static listTenantOffers(ctx: HealthContext): Promise<{
        id: any;
        default_funding: any;
        shared_split: any;
        is_active: any;
        hw_plan_versions: {
            id: any;
            version: any;
            status: any;
            premium_minor: any;
            currency: any;
            billing_frequency: any;
            member_categories: any;
            benefits: any;
            exclusions: any;
            hw_plans: {
                id: any;
                code: any;
                name: any;
                hw_providers: {
                    id: any;
                    code: any;
                    display_name: any;
                }[];
            }[];
        }[];
    }[]>;
    /**
     * Configure a plan offer for a tenant.
     */
    static configureTenantOffer(ctx: HealthContext, params: {
        planVersionId: string;
        defaultFunding: 'school' | 'employer' | 'member' | 'shared';
        sharedSplit?: {
            tenant_bps: number;
            member_bps: number;
        };
    }): Promise<any>;
    /**
     * List verified participating healthcare facilities.
     */
    static listFacilities(filter?: {
        state?: string;
        planId?: string;
    }): Promise<{
        id: any;
        provider_id: any;
        external_ref: any;
        name: any;
        state: any;
        lga: any;
        address: any;
        phone: any;
        services: any;
        restrictions: any;
        last_verified_at: any;
    }[]>;
}
