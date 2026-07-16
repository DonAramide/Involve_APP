export declare class TenantRepository {
    findByAgent(agentId: string): Promise<any[]>;
    findAll(): Promise<any[]>;
    updateActivation(agentTenantId: string, updates: any): Promise<any>;
}
export declare const tenantRepository: TenantRepository;
