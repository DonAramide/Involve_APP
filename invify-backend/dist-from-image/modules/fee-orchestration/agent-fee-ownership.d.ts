export type OwningAgent = {
    agent_id: string;
    agent_code: string;
};
export declare class AgentOwnershipError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(message: string, code: string, status?: number);
}
export declare function pickOwningAgent(input: {
    tenantId: string;
    agentTenants: Array<{
        tenant_id: string;
        agent_id: string;
        agent_code?: string;
    }>;
    tenantsByCode?: Array<{
        id: string;
        agent_code: string;
        agent_id?: string;
    }>;
    agentsByCode?: Array<{
        id: string;
        agent_code: string;
    }>;
}): OwningAgent | null;
export declare function assertTenantBelongsToAgent(owner: OwningAgent | null, agentId: string | null | undefined): OwningAgent | null;
