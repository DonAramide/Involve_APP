export declare class AgentRepository {
    /**
     * Retrieves all agents with their territories and roles
     */
    findAll(filters?: {
        status?: string;
        territory_id?: string;
    }): Promise<any[]>;
    /**
     * Finds a specific agent by ID
     */
    findById(id: string): Promise<any>;
    /**
     * Creates an agent and profile inside a transaction-like flow
     * Note: Supabase JS client doesn't support explicit transactions over REST,
     * so we rely on Postgres RPC or sequential inserts.
     */
    createAgent(agentData: any, profileData: any): Promise<any>;
    /**
     * Update Agent core details
     */
    updateAgent(id: string, updates: any): Promise<any>;
    /**
     * Updates Agent Status and logs history
     */
    updateStatus(id: string, newStatus: string, oldStatus: string, changedBy: string, reason: string): Promise<any>;
    /**
     * Audit Logging Enforcement
     */
    logAudit(actorId: string, entityType: string, entityId: string, action: string, oldValue: any, newValue: any, ipAddress?: string, userAgent?: string): Promise<void>;
}
export declare const agentRepository: AgentRepository;
