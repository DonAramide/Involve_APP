"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankHmoDistributionController = void 0;
const supabase_1 = require("../../../db/supabase");
const institution_classification_service_1 = require("../services/institution-classification.service");
const bank_hmo_distribution_service_1 = require("../services/bank-hmo-distribution.service");
async function requireBankAgent(req, res) {
    const authUser = req.user;
    if (!authUser?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return null;
    }
    let { data: agent, error } = await supabase_1.supabaseAdmin
        .from('agents')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle();
    if ((!agent || error) && authUser.agentId) {
        const byId = await supabase_1.supabaseAdmin.from('agents').select('*').eq('id', authUser.agentId).is('deleted_at', null).maybeSingle();
        agent = byId.data;
        error = byId.error;
    }
    if ((!agent || error) && authUser.email) {
        const byEmail = await supabase_1.supabaseAdmin.from('agents').select('*').ilike('email', String(authUser.email).trim()).is('deleted_at', null).maybeSingle();
        agent = byEmail.data;
        error = byEmail.error;
    }
    if (error || !agent) {
        res.status(403).json({ success: false, message: 'Institute profile not found.' });
        return null;
    }
    const blocked = ['PENDING', 'PENDING_APPROVAL', 'SUSPENDED'];
    if (blocked.includes(String(agent.status || '').toUpperCase())) {
        res.status(403).json({ success: false, message: 'This institute account cannot distribute HMO products.' });
        return null;
    }
    const context = await institution_classification_service_1.institutionClassificationService.resolveForAgentOrUser({
        authUserId: authUser.id,
        email: agent.email,
        agentRecord: agent,
    });
    if (context.institutionType !== 'BANK') {
        res.status(403).json({
            success: false,
            message: 'HMO catalogue distribution is limited to a bank institute. An HMO institution uses its own portal and cannot change another bank\'s offerings here.',
        });
        return null;
    }
    return agent;
}
function queryOf(req) {
    return {
        search: String(req.query.search || ''),
        page: req.query.page,
        limit: req.query.limit,
    };
}
class BankHmoDistributionController {
    static async catalogue(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const query = queryOf(req);
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.catalogue(query.search, query.page, query.limit);
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'Catalogue request failed' });
        }
    }
    static async provider(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.providerDetail(String(req.params.providerId || ''));
            if (!data)
                return res.status(404).json({ success: false, message: 'No published HMO catalogue entry was found for that provider.' });
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'Provider request failed' });
        }
    }
    static async facilities(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const query = queryOf(req);
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.facilities(query.search, query.page, query.limit);
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'Provider network request failed' });
        }
    }
    static async offerings(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const query = queryOf(req);
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.offerings(agent.id, query.search, query.page, query.limit);
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'Offering request failed' });
        }
    }
    static async changeOffering(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        const authUser = req.user;
        if (typeof req.body?.active !== 'boolean') {
            return res.status(400).json({ success: false, code: 'ACTIVE_REQUIRED', message: 'active must be true or false.' });
        }
        try {
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.setOffering({
                agentId: agent.id,
                actorUserId: authUser.id,
                planVersionId: String(req.body?.planVersionId || ''),
                active: req.body.active,
                reason: String(req.body?.reason || ''),
            });
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(err.status || 500).json({
                success: false,
                code: err.code || 'OFFERING_WRITE_FAILED',
                message: err.message || 'The offering was not saved.',
            });
        }
    }
    static async validateSelection(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.validateTenantSelection(agent.id, String(req.body?.tenantId || ''), String(req.body?.planVersionId || ''));
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(err.status || 500).json({
                success: false,
                code: err.code || 'SELECTION_REJECTED',
                message: err.message || 'The selection was not accepted.',
            });
        }
    }
    static async overview(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.overview(agent.id, String(agent.agent_code || ''));
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'Overview request failed' });
        }
    }
    static async tenants(req, res) {
        const agent = await requireBankAgent(req, res);
        if (!agent)
            return;
        try {
            const data = await bank_hmo_distribution_service_1.BankHmoDistributionService.tenants(agent.id, String(agent.agent_code || ''));
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'Tenant request failed' });
        }
    }
}
exports.BankHmoDistributionController = BankHmoDistributionController;
//# sourceMappingURL=bank-hmo-distribution.controller.js.map