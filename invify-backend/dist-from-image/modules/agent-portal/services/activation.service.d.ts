export declare const STAGE_ORDER: readonly ["REGISTRATION", "KYC_PENDING", "KYC_APPROVED", "TERMINAL_ASSIGNED", "TERMINAL_DEPLOYED", "TRAINING_COMPLETED", "FIRST_TRANSACTION", "FULLY_ACTIVATED"];
export type ActivationStage = (typeof STAGE_ORDER)[number];
export declare class ActivationService {
    resolveOwnedLink(rawId: string, agentId: string): Promise<{
        id: any;
        agent_id: any;
        tenant_id: any;
        business_name: any;
        status: any;
        deleted_at: any;
    }>;
    ensureProgress(agentTenantId: string): Promise<any>;
    advanceToNext(agentTenantId: string): Promise<any>;
    advanceStage(agentTenantId: string, newStage: string): Promise<any>;
}
export declare const activationService: ActivationService;
