import { HealthContext } from '../types';
export declare class HealthPlanGovernanceService {
    static listCatalogue(): Promise<{
        providers: {
            id: any;
            code: any;
            display_name: any;
            integration_status: any;
            licence_reference: any;
        }[];
        plans: {
            id: any;
            provider_id: any;
            code: any;
            name: any;
            status: any;
            created_by: any;
            created_at: any;
            updated_at: any;
            hw_providers: {
                id: any;
                code: any;
                display_name: any;
                integration_status: any;
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
                requires_verification: any;
                activation_requires_payment: any;
                effective_from: any;
                effective_to: any;
                published_at: any;
                published_by: any;
                created_at: any;
            }[];
        }[];
        lifecycle: {
            plan: string[];
            version: string[];
            note: string;
        };
    }>;
    static createDraft(ctx: HealthContext, body: any): Promise<{
        planId: string | undefined;
        versionId: any;
        version: any;
        planStatus: string;
        versionStatus: string;
    }>;
    static publishVersion(ctx: HealthContext, versionId: string, body: any): Promise<{
        versionId: string;
        planId: any;
        versionStatus: string;
        planStatusUnchanged: boolean;
    }>;
    static activatePlan(ctx: HealthContext, planId: string, body: any): Promise<{
        planId: string;
        status: string;
    }>;
    static retirePlan(ctx: HealthContext, planId: string, body: any): Promise<{
        planId: string;
        status: string;
    }>;
    static updateDraftVersion(ctx: HealthContext, versionId: string, body: any): Promise<{
        versionId: string;
        planId: any;
        versionStatus: string;
    }>;
}
