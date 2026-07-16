"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAgentController = void 0;
const agent_service_1 = require("../services/agent.service");
class AdminAgentController {
    /**
     * Onboard a new Agent
     * POST /admin/agents/onboard
     */
    static async onboardAgent(req, res) {
        try {
            // Typically from req.user (JWT context)
            const creatorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];
            const newAgent = await agent_service_1.agentService.onboardAgent(creatorId, req.body, ipAddress, userAgent);
            return res.status(201).json({
                success: true,
                message: 'Agent successfully onboarded and invitation dispatched',
                data: newAgent
            });
        }
        catch (err) {
            console.error('[AdminAgentController] Error onboarding agent:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * List Agents
     * GET /admin/agents
     */
    static async listAgents(req, res) {
        try {
            const { status, territory_id } = req.query;
            const agents = await agent_service_1.agentService.listAgents({
                status: status,
                territory_id: territory_id
            });
            return res.status(200).json({ success: true, data: agents });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Get specific Agent by ID
     * GET /admin/agents/:id
     */
    static async getAgent(req, res) {
        try {
            const { id } = req.params;
            const agent = await agent_service_1.agentService.getAgent(id);
            if (!agent) {
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            return res.status(200).json({ success: true, data: agent });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Update Agent Status
     * PATCH /admin/agents/:id/status
     */
    static async updateAgentStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            if (!status || !reason) {
                return res.status(400).json({ success: false, message: 'Status and reason are required' });
            }
            const updatedAgent = await agent_service_1.agentService.updateStatus(id, status, reason, actorId, req.ip, req.headers['user-agent']);
            return res.status(200).json({
                success: true,
                message: 'Agent status successfully updated',
                data: updatedAgent
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Global Audit Logs
     * GET /admin/agents/audit-logs
     */
    static async getAuditLogs(req, res) {
        // Requires a fetch from agentRepository
        // ... Placeholder for implementation
        return res.status(200).json({ success: true, data: [] });
    }
}
exports.AdminAgentController = AdminAgentController;
//# sourceMappingURL=admin-agent.controller.js.map