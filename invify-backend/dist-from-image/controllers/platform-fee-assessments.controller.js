"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformFeeAssessmentsController = void 0;
const platform_fee_assessments_service_1 = require("../services/platform-fee-assessments.service");
function sendError(res, err) {
    const status = Number(err?.status) || 500;
    return res.status(status).json({
        error: err?.message || 'Platform fee assessment request failed',
    });
}
class PlatformFeeAssessmentsController {
    static async list(req, res) {
        try {
            const data = await platform_fee_assessments_service_1.platformFeeAssessmentsService.list({
                transactionType: String(req.query.transaction_type || req.query.transactionType || ''),
                mode: String(req.query.mode || ''),
                kind: String(req.query.kind || ''),
                sourceSystem: String(req.query.source_system || req.query.sourceSystem || ''),
                sourceIdempotencyKey: String(req.query.source_idempotency_key || req.query.idempotency_key || ''),
                reference: String(req.query.reference || req.query.source || ''),
                from: String(req.query.from || ''),
                to: String(req.query.to || ''),
                limit: Number(req.query.limit || 100),
                agentId: String(req.query.agentId || req.query.agent_id || ''),
                tenantId: String(req.query.tenantId || req.query.tenant_id || ''),
            });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async get(req, res) {
        try {
            const data = await platform_fee_assessments_service_1.platformFeeAssessmentsService.get(String(req.params.assessmentId || ''));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async reconciliation(req, res) {
        try {
            const data = await platform_fee_assessments_service_1.platformFeeAssessmentsService.reconciliation({
                transactionType: String(req.query.transaction_type || ''),
                mode: String(req.query.mode || ''),
                kind: String(req.query.kind || ''),
                sourceSystem: String(req.query.source_system || ''),
                from: String(req.query.from || ''),
                to: String(req.query.to || ''),
            });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
}
exports.PlatformFeeAssessmentsController = PlatformFeeAssessmentsController;
//# sourceMappingURL=platform-fee-assessments.controller.js.map