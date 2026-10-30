"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const tenant_service_1 = require("../services/tenant.service");
const activation_service_1 = require("../services/activation.service");
const supabase_1 = require("../../../db/supabase");
const agent_fee_read_model_1 = require("../services/agent-fee-read-model");
async function resolveInstituteAgent(req) {
    const authUser = req.user || {};
    const authUserId = authUser.id;
    if (!authUserId)
        return null;
    let { data: agent } = await supabase_1.supabaseAdmin
        .from('agents')
        .select('id, agent_code')
        .eq('auth_user_id', authUserId)
        .is('deleted_at', null)
        .maybeSingle();
    if (!agent && authUser.agentId) {
        const byId = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id, agent_code')
            .eq('id', authUser.agentId)
            .is('deleted_at', null)
            .maybeSingle();
        agent = byId.data;
    }
    if (!agent && authUser.email) {
        const byEmail = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id, agent_code')
            .ilike('email', String(authUser.email).trim())
            .is('deleted_at', null)
            .maybeSingle();
        agent = byEmail.data;
    }
    return agent;
}
function progressStage(row) {
    const nested = row?.tenant_activation_progress;
    const progress = Array.isArray(nested) ? nested[0] : nested;
    return String(progress?.current_stage || row.activation_status || row.current_stage || 'REGISTRATION');
}
class TenantController {
    static async updateActivation(req, res) {
        try {
            const data = await tenant_service_1.tenantService.updateActivation(req.params.id, req.body.stage, req.user?.id || 'sys');
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(Number(err.status) || 500).json({ success: false, message: err.message });
        }
    }
    static async advance(req, res) {
        try {
            const agent = await resolveInstituteAgent(req);
            if (!agent)
                return res.status(401).json({ success: false, message: 'Institute profile not found' });
            const link = await activation_service_1.activationService.resolveOwnedLink(String(req.params.id || ''), agent.id);
            const data = await activation_service_1.activationService.advanceToNext(link.id);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(Number(err.status) || 500).json({ success: false, message: err.message || 'Failed to advance stage' });
        }
    }
    static async list(req, res) {
        try {
            const agent = await resolveInstituteAgent(req);
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const attributed = await (0, agent_fee_read_model_1.loadAttributedTenantIds)(agent.id, String(agent.agent_code || ''));
            const linked = await tenant_service_1.tenantService.getTenantsByAgent(agent.id);
            const byId = new Map();
            for (const row of [...(linked || []), ...attributed.attributedTenants]) {
                const key = String(row.tenant_id || row.id);
                if (!key)
                    continue;
                byId.set(key, {
                    ...row,
                    tenant_id: row.tenant_id || row.id,
                    agent_code: row.agent_code || agent.agent_code,
                    activation_status: progressStage(row),
                });
            }
            res.status(200).json({ success: true, data: [...byId.values()] });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async listAll(req, res) {
        try {
            const tenants = await tenant_service_1.tenantService.getAllTenants();
            res.status(200).json({ success: true, data: tenants });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.TenantController = TenantController;
//# sourceMappingURL=tenant.controller.js.map