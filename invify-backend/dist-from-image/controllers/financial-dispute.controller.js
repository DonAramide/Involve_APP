"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDisputeController = void 0;
const financial_dispute_policy_1 = require("../services/financial-dispute.policy");
const financial_dispute_service_1 = require("../services/financial-dispute.service");
function actorFrom(req) {
    const user = req.user || {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
    return {
        id: String(user.id || user.sub || '').trim(),
        email: String(user.email || '').trim(),
        name: user.name || user.email?.split('@')[0] || 'Admin',
        ip,
    };
}
function sendError(res, error) {
    const status = error?.status || (error instanceof financial_dispute_policy_1.DisputePolicyError ? error.status : 500);
    console.error('[FinancialDisputeController]', error.message);
    return res.status(status).json({
        error: error.message,
        message: error.message,
        case: error.case || undefined,
    });
}
class FinancialDisputeController {
    static async create(req, res) {
        try {
            const idempotencyKey = req.headers['idempotency-key'] ||
                req.headers['x-idempotency-key'] ||
                req.body?.idempotencyKey;
            const result = await financial_dispute_service_1.FinancialDisputeService.create({
                tenantId: req.body.tenantId || req.body.tenant_id,
                tenantName: req.body.tenantName || req.body.tenant_name,
                caseType: req.body.caseType || req.body.case_type || req.body.type,
                amountKobo: req.body.amountKobo ?? req.body.amount_kobo,
                amountNaira: req.body.amountNaira ?? req.body.amount_naira,
                amount: req.body.amount,
                currency: req.body.currency,
                reason: req.body.reason,
                originalPaymentReference: req.body.originalPaymentReference || req.body.original_payment_reference,
                idempotencyKey,
            }, actorFrom(req));
            return res.status(result.idempotentReplay ? 200 : 201).json(result);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    static async list(req, res) {
        try {
            const rows = await financial_dispute_service_1.FinancialDisputeService.list({
                status: req.query.status,
                tenantId: (req.query.tenantId || req.query.tenant_id),
                limit: req.query.limit ? Number(req.query.limit) : undefined,
            });
            return res.status(200).json({ data: rows });
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    static async get(req, res) {
        try {
            const row = await financial_dispute_service_1.FinancialDisputeService.getById(req.params.id);
            return res.status(200).json(row);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    static async audit(req, res) {
        try {
            const events = await financial_dispute_service_1.FinancialDisputeService.listEvents(req.params.id);
            return res.status(200).json({ data: events });
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    static async approve(req, res) {
        try {
            const result = await financial_dispute_service_1.FinancialDisputeService.approve(req.params.id, actorFrom(req), req.body?.comment);
            return res.status(200).json(result);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    static async reject(req, res) {
        try {
            const result = await financial_dispute_service_1.FinancialDisputeService.reject(req.params.id, actorFrom(req), req.body?.reason || req.body?.comment);
            return res.status(200).json(result);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
}
exports.FinancialDisputeController = FinancialDisputeController;
//# sourceMappingURL=financial-dispute.controller.js.map