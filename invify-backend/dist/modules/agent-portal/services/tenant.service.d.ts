export declare class TenantService {
    updateActivation(agentTenantId: string, stage: string, actorId: string): Promise<any>;
    getTenantsByAgent(agentId: string): Promise<any[]>;
    getAllTenants(): Promise<any[]>;
}
export declare const tenantService: TenantService;
