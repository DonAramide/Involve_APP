"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAgentController = void 0;
const agent_service_1 = require("../services/agent.service");
const agent_repository_1 = require("../repositories/agent.repository");
const agent_access_service_1 = require("../services/agent-access.service");
function mapAgentRow(row) {
    if (!row)
        return null;
    const profile = Array.isArray(row.agent_profiles)
        ? row.agent_profiles[0]
        : (row.agent_profiles || {});
    return {
        id: row.id,
        agentCode: row.agent_code,
        name: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        kycStatus: profile?.kyc_status || 'PENDING',
        profileStatus: profile?.profile_status || row.status || 'PENDING',
        commissions: row.lifetime_commissions ?? 0,
        territoryId: row.territory_id,
        roleId: row.role_id,
        institutionType: row.institution_type || profile?.regulatory_metadata?.institution_type || (String(row.agent_code || '').toUpperCase().startsWith('MHMO') ? 'HMO' : 'SCHOOL'),
        tradingName: row.trading_name || profile?.regulatory_metadata?.trading_name || null,
        logoUrl: row.logo_url || profile?.logo_url || null,
        cacNumber: profile?.cac_registration_number || profile?.regulatory_metadata?.cac_registration_number || null,
        tin: profile?.tax_identification_number || profile?.regulatory_metadata?.tax_identification_number || null,
        regulatorLicenseReference: profile?.regulator_license_reference || null,
        regulatoryMetadata: profile?.regulatory_metadata || null,
        address: profile?.address || null,
        whatsappNumber: profile?.regulatory_metadata?.whatsapp_number || null,
        passportImage: profile?.profile_photo_url || null,
        idCard: profile?.regulatory_metadata?.id_card_url || null,
        createdAt: row.created_at,
        raw: row,
    };
}
function handleAgentError(res, err) {
    if (err instanceof agent_repository_1.AgentSchemaUnavailableError || err?.code === 'AGENT_SCHEMA_UNAVAILABLE') {
        return res.status(200).json({
            success: true,
            agents: [],
            data: [],
            schemaAvailable: false,
            message: 'Agent portal schema is not provisioned on this database yet',
        });
    }
    console.error('[AdminAgentController]', err?.message || err);
    return res.status(500).json({ success: false, message: err?.message || 'Agent operation failed' });
}
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
            const { agent, welcomeEmailSent } = await agent_service_1.agentService.onboardAgent(creatorId, req.body || {}, ipAddress, userAgent);
            return res.status(201).json({
                success: true,
                welcomeEmailSent,
                message: welcomeEmailSent
                    ? `Agent onboarded. Welcome email with a set-password link sent to ${agent.email}.`
                    : 'Agent onboarded, but the welcome email could not be sent. Use "Resend invite" to try again.',
                data: mapAgentRow(agent),
                agent: mapAgentRow(agent),
            });
        }
        catch (err) {
            if (err instanceof agent_repository_1.AgentSchemaUnavailableError || err?.code === 'AGENT_SCHEMA_UNAVAILABLE') {
                return res.status(503).json({
                    success: false,
                    schemaAvailable: false,
                    message: 'Cannot provision agents until the agent portal schema is applied to this database',
                });
            }
            if (err instanceof agent_access_service_1.AgentAccessError) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('[AdminAgentController] Error onboarding agent:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Re-send the welcome / set-password email
     * POST /admin/agents/:id/resend-invite
     */
    static async resendInvite(req, res) {
        try {
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            const sent = await agent_service_1.agentService.resendInvite(req.params.id, actorId, req.ip, req.headers['user-agent']);
            if (!sent) {
                return res.status(502).json({ success: false, message: 'The invitation email could not be sent. Check SMTP settings and try again.' });
            }
            return res.json({ success: true, message: 'Invitation email re-sent.' });
        }
        catch (err) {
            if (err instanceof agent_access_service_1.AgentAccessError) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('[AdminAgentController] Error resending invite:', err?.message || err);
            return res.status(500).json({ success: false, message: err?.message || 'Failed to resend invite' });
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
            const mapped = (agents || []).map(mapAgentRow);
            return res.status(200).json({
                success: true,
                schemaAvailable: true,
                agents: mapped,
                data: mapped,
            });
        }
        catch (err) {
            return handleAgentError(res, err);
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
            const mapped = mapAgentRow(agent);
            return res.status(200).json({
                success: true,
                data: mapped,
                agent: mapped,
                tenants: [],
            });
        }
        catch (err) {
            return handleAgentError(res, err);
        }
    }
    /**
     * Update Agent / Institute Profile Details
     * PATCH /admin/agents/:id
     */
    static async updateAgentProfile(req, res) {
        try {
            const { id } = req.params;
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            const updatedAgent = await agent_service_1.agentService.updateAgentProfileDetails(id, req.body || {}, actorId, req.ip, req.headers['user-agent']);
            const mapped = mapAgentRow(updatedAgent);
            return res.status(200).json({
                success: true,
                message: 'Institute profile updated successfully',
                data: mapped,
                agent: mapped,
            });
        }
        catch (err) {
            if (err instanceof agent_access_service_1.AgentAccessError) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            return handleAgentError(res, err);
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
     * Update Agent KYC Status
     * PATCH /admin/agents/:id/kyc
     */
    static async updateKycStatus(req, res) {
        try {
            const { id } = req.params;
            const { kycStatus } = req.body;
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            if (!kycStatus) {
                return res.status(400).json({ success: false, message: 'kycStatus is required' });
            }
            const updatedAgent = await agent_service_1.agentService.updateKycStatus(id, kycStatus, actorId, req.ip, req.headers['user-agent']);
            return res.status(200).json({
                success: true,
                message: 'Agent KYC status successfully updated',
                data: updatedAgent
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Get Agent Commissions
     * GET /admin/agents/:id/commissions
     */
    static async getCommissions(req, res) {
        try {
            const { id } = req.params;
            const commissions = await agent_service_1.agentService.getCommissions(id);
            return res.status(200).json({ success: true, data: commissions });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Update Agent Commissions
     * PATCH /admin/agents/:id/commissions
     */
    static async updateCommissions(req, res) {
        try {
            const { id } = req.params;
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            const updatedPlan = await agent_service_1.agentService.updateCommissions(id, req.body, actorId, req.ip, req.headers['user-agent']);
            return res.status(200).json({ success: true, data: updatedPlan });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Send Direct Message to Agent
     * POST /admin/agents/:id/message
     */
    static async messageAgent(req, res) {
        try {
            const { id } = req.params;
            const { message } = req.body;
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            if (!message) {
                return res.status(400).json({ success: false, message: 'Message is required' });
            }
            await agent_service_1.agentService.messageAgent(id, message, actorId);
            return res.status(200).json({ success: true, message: 'Message successfully sent to agent' });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Broadcast message to all tenants managed by agent
     * POST /admin/agents/:id/message-tenants
     */
    static async messageTenants(req, res) {
        try {
            const { id } = req.params;
            const { message } = req.body;
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            if (!message) {
                return res.status(400).json({ success: false, message: 'Message is required' });
            }
            await agent_service_1.agentService.messageTenants(id, message, actorId);
            return res.status(200).json({ success: true, message: 'Broadcast message successfully queued for tenants' });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Upload / update official institution logo
     * POST /admin/agents/:id/logo
     */
    static async updateLogo(req, res) {
        try {
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            const base64Image = req.body?.logoImage || req.body?.image;
            if (!base64Image) {
                return res.status(400).json({ success: false, message: 'Base64 image data is required in logoImage' });
            }
            const result = await agent_service_1.agentService.updateLogo(req.params.id, base64Image, actorId, req.ip, req.headers['user-agent']);
            return res.json({
                success: true,
                message: 'Institution logo updated successfully',
                logoUrl: result.logoUrl,
            });
        }
        catch (err) {
            if (err instanceof agent_access_service_1.AgentAccessError) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            return handleAgentError(res, err);
        }
    }
    /**
     * Remove official institution logo
     * DELETE /admin/agents/:id/logo
     */
    static async deleteLogo(req, res) {
        try {
            const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
            await agent_service_1.agentService.removeLogo(req.params.id, actorId, req.ip, req.headers['user-agent']);
            return res.json({
                success: true,
                message: 'Institution logo removed successfully',
            });
        }
        catch (err) {
            if (err instanceof agent_access_service_1.AgentAccessError) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            return handleAgentError(res, err);
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