export declare class AgentSchemaUnavailableError extends Error {
    readonly code = "AGENT_SCHEMA_UNAVAILABLE";
    constructor(message?: string);
}
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
    findConflict(email: string, agentCode: string): Promise<'email' | 'code' | null>;
    /**
     * Creates an agent and profile inside a transaction-like flow.
     * Gracefully handles optional extended columns (institution_type, logo_url, etc.)
     * when running against schemas where additive migrations have not yet been applied.
     */
    createAgent(agentData: any, profileData: any): Promise<any>;
    /**
     * Update Agent core details
     */
    updateAgent(id: string, updates: any): Promise<any>;
    /**
     * Update Agent profile details
     */
    updateAgentProfile(agentId: string, updates: any): Promise<any>;
    /**
     * Updates Agent logo on both core agent and profile tables
     */
    updateLogo(agentId: string, logoUrl: string | null): Promise<void>;
    /**
     * Updates Agent Status and logs history
     */
    updateStatus(id: string, newStatus: string, oldStatus: string, changedBy: string, reason: string): Promise<any>;
    /**
     * Logs an action in the immutable Agent Audit Log
     */
    logAudit(actorId: string, entityType: string, entityId: string | null, action: string, oldValue?: any, newValue?: any, ipAddress?: string, userAgent?: string): Promise<void>;
}
export declare const agentRepository: AgentRepository;
