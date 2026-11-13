"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformFeeDistributionController = void 0;
const platform_fee_distribution_service_1 = require("../services/platform-fee-distribution.service");
function sendError(res, err) {
    const status = Number(err?.status) || 500;
    return res.status(status).json({
        error: err?.message || 'Platform fee distribution request failed',
        code: err?.code,
    });
}
function actor(req) {
    const user = req.user || {};
    return {
        id: String(user.id || user.sub || ''),
        email: String(user.email || ''),
    };
}
class PlatformFeeDistributionController {
    static async distribution(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.distribution({
                transactionType: String(req.query.transaction_type || req.query.transactionType || ''),
                from: String(req.query.from || ''),
                to: String(req.query.to || ''),
                agentId: String(req.query.agentId || req.query.agent_id || ''),
            });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async agentCommission(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.agentCommission(String(req.query.agentId || req.query.agent_id || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async listStakeholders(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.listStakeholders(String(req.query.agentId || req.query.agent_id || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async createStakeholder(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.createStakeholder(req.body || {}, actor(req));
            return res.status(201).json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async getStakeholder(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.getStakeholder(String(req.params.id || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async updateStakeholder(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.updateStakeholder(String(req.params.id || ''), req.body || {}, actor(req));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async listPayables(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.listPayables(String(req.params.id || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async listSettlements(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.listSettlements(String(req.params.id || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async listWithdrawals(_req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.listWithdrawals();
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async getWithdrawal(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.getWithdrawal(String(req.params.withdrawalId || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async createWithdrawal(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.createWithdrawal(req.body || {}, actor(req));
            return res.status(201).json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async approveWithdrawal(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.approveWithdrawal(String(req.params.withdrawalId || ''), actor(req));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async rejectWithdrawal(req, res) {
        try {
            const data = await platform_fee_distribution_service_1.platformFeeDistributionService.rejectWithdrawal(String(req.params.withdrawalId || ''), String(req.body?.reason || 'Rejected'), actor(req));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async completeSettlement(_req, res) {
        try {
            platform_fee_distribution_service_1.platformFeeDistributionService.completeSettlement();
            return res.status(409).json({ error: 'Payout execution is disabled' });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
}
exports.PlatformFeeDistributionController = PlatformFeeDistributionController;
//# sourceMappingURL=platform-fee-distribution.controller.js.map