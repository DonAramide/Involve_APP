export declare class AgentService {
    /**
     * Onboards a new agent
     */
    onboardAgent(creatorId: string, data: {
        email: string;
        first_name: string;
        last_name: string;
        phone?: string;
        role_id: string;
        territory_id: string;
        supervisor_agent_id?: string;
        commission_plan_id?: string;
    }, ipAddress?: string, userAgent?: string): Promise<any>;
    /**
     * List all agents
     */
    listAgents(filters?: {
        status?: string;
        territory_id?: string;
    }): Promise<any[]>;
    /**
     * Get specific agent
     */
    getAgent(id: string): Promise<any>;
    /**
     * Update Agent Status
     */
    updateStatus(id: string, newStatus: string, reason: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<any>;
}
export declare const agentService: AgentService;
