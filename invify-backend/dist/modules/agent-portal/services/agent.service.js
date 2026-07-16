"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentService = exports.AgentService = void 0;
const agent_repository_1 = require("../repositories/agent.repository");
const uuid_1 = require("uuid");
class AgentService {
    /**
     * Onboards a new agent
     */
    async onboardAgent(creatorId, data, ipAddress, userAgent) {
        // 1. Generate auth_user_id (In reality this requires a call to Supabase Admin Auth API to create the user)
        // For this milestone, we simulate the auth provisioning:
        const authUserId = (0, uuid_1.v4)();
        // 2. Generate Agent Code
        const agentCode = `AG-${Math.floor(100000 + Math.random() * 900000)}`;
        const agentData = {
            auth_user_id: authUserId,
            agent_code: agentCode,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            role_id: data.role_id,
            territory_id: data.territory_id,
            supervisor_agent_id: data.supervisor_agent_id,
            commission_plan_id: data.commission_plan_id,
            created_by: creatorId,
            updated_by: creatorId
        };
        const profileData = {
            // Missing profile data defaults
            kyc_status: 'PENDING'
        };
        const newAgent = await agent_repository_1.agentRepository.createAgent(agentData, profileData);
        // 3. Log Audit
        await agent_repository_1.agentRepository.logAudit(creatorId, 'AGENT', newAgent.id, 'ONBOARD_AGENT', null, newAgent, ipAddress, userAgent);
        return newAgent;
    }
    /**
     * List all agents
     */
    async listAgents(filters) {
        return agent_repository_1.agentRepository.findAll(filters);
    }
    /**
     * Get specific agent
     */
    async getAgent(id) {
        return agent_repository_1.agentRepository.findById(id);
    }
    /**
     * Update Agent Status
     */
    async updateStatus(id, newStatus, reason, actorId, ipAddress, userAgent) {
        const existingAgent = await agent_repository_1.agentRepository.findById(id);
        if (!existingAgent)
            throw new Error('Agent not found');
        const updatedAgent = await agent_repository_1.agentRepository.updateStatus(id, newStatus, existingAgent.status, actorId, reason);
        // Log Audit
        await agent_repository_1.agentRepository.logAudit(actorId, 'AGENT_STATUS', id, 'UPDATE_STATUS', { status: existingAgent.status }, { status: newStatus, reason }, ipAddress, userAgent);
        return updatedAgent;
    }
}
exports.AgentService = AgentService;
exports.agentService = new AgentService();
//# sourceMappingURL=agent.service.js.map