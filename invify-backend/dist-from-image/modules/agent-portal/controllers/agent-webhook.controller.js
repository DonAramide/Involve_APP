"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentWebhookController = void 0;
const supabase_1 = require("../../../db/supabase");
const agent_webhook_service_1 = require("../services/agent-webhook.service");
const agent_fee_read_model_1 = require("../services/agent-fee-read-model");
function actor(req) {
    return req.user?.email || '';
}
class AgentWebhookController {
    static async sessionCommission(req, res) {
        try {
            const verified = await (0, agent_webhook_service_1.resolveAgentFromAuth)(req.user?.id);
            const attributed = await (0, agent_fee_read_model_1.loadAttributedTenantIds)(verified.id, verified.agent_code);
            const data = await (0, agent_fee_read_model_1.loadAgentFeeReadModel)(verified.agent_code, attributed.tenantIds, verified.id);
            res.json({ success: true, data, agent_id: verified.id });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async snapshot(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.getDeveloperSnapshot)(req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async saveWebhook(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.saveWebhook)(req.user?.id, req.body?.webhook_url || req.body?.url, actor(req));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 400).json({ success: false, code: err.code, message: err.message });
        }
    }
    static async enable(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.setWebhookStatus)(req.user?.id, 'ENABLED', actor(req));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async disable(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.setWebhookStatus)(req.user?.id, 'DISABLED', actor(req));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async test(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.enqueueTestEvent)(req.user?.id, actor(req));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async rotateWebhook(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.rotateWebhookSigning)(req.user?.id, actor(req), Boolean(req.body?.confirm));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 400).json({ success: false, code: err.code, message: err.message });
        }
    }
    static async rotateApi(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.rotateApiCredential)(req.user?.id, actor(req), Boolean(req.body?.confirm));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 400).json({ success: false, code: err.code, message: err.message });
        }
    }
    static async deliveries(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.listDeliveries)(req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async adminList(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.adminListWebhooks)();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async adminDeliveries(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.adminListDeliveries)(req.params.agentId);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async adminEnable(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.adminSetWebhookStatus)(req.params.agentId, 'ENABLED', actor(req));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async adminDisable(req, res) {
        try {
            const data = await (0, agent_webhook_service_1.adminSetWebhookStatus)(req.params.agentId, 'DISABLED', actor(req));
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 500).json({ success: false, message: err.message });
        }
    }
    static async v1Commission(req, res) {
        try {
            const keyId = String(req.header('X-Invify-Key-ID') || '');
            const timestamp = String(req.header('X-Invify-Timestamp') || '');
            const signature = String(req.header('X-Invify-Signature') || '');
            const verified = await (0, agent_webhook_service_1.verifyAgentApiRequest)(keyId, timestamp, { path: '/api/agent/v1/commission', method: 'GET' }, signature);
            const { data: agent } = await supabase_1.supabaseAdmin.from('agents').select('id, agent_code').eq('id', verified.agent_id).maybeSingle();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const attributed = await (0, agent_fee_read_model_1.loadAttributedTenantIds)(agent.id, agent.agent_code);
            const data = await (0, agent_fee_read_model_1.loadAgentFeeReadModel)(agent.agent_code, attributed.tenantIds, agent.id);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(err.status || 401).json({ success: false, code: err.code, message: err.message });
        }
    }
    static async v1Withdrawals(req, res) {
        try {
            const keyId = String(req.header('X-Invify-Key-ID') || '');
            const timestamp = String(req.header('X-Invify-Timestamp') || '');
            const signature = String(req.header('X-Invify-Signature') || '');
            await (0, agent_webhook_service_1.verifyAgentApiRequest)(keyId, timestamp, { path: req.path, method: req.method }, signature);
            if (req.method === 'POST') {
                if (!(0, agent_fee_read_model_1.isAgentPayoutExecutionEnabled)()) {
                    return res.status(409).json({
                        success: false,
                        code: 'PAYOUT_DISABLED',
                        message: 'PAYOUT_DISABLED: real-money payouts are not enabled.',
                    });
                }
                return res.status(409).json({ success: false, code: 'PAYOUT_DISABLED', message: 'PAYOUT_DISABLED' });
            }
            res.json({ success: true, data: [] });
        }
        catch (err) {
            res.status(err.status || 401).json({ success: false, code: err.code, message: err.message });
        }
    }
}
exports.AgentWebhookController = AgentWebhookController;
//# sourceMappingURL=agent-webhook.controller.js.map