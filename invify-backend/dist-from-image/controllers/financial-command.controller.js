"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialCommandController = void 0;
const finance_tenant_1 = require("../utils/finance-tenant");
const financial_command_service_1 = require("../services/financial-command.service");
const build_variant_1 = require("../config/build-variant");
const fee_live_gate_1 = require("../services/fee-live-gate");
function tenantFromRequest(req, res) {
    try {
        return (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
    }
    catch (err) {
        res.status(err?.status || 403).json({
            ack: 'rejected',
            message: err?.message || 'Forbidden: Cross-tenant access denied',
        });
        return null;
    }
}
function commandIdOf(req) {
    return String(req.headers['x-idempotency-key'] || req.body?.commandId || req.body?.idempotencyKey || '').trim();
}
class FinancialCommandController {
    static async parentFund(req, res) {
        const tenantId = tenantFromRequest(req, res);
        if (!tenantId)
            return;
        try {
            const result = await financial_command_service_1.FinancialCommandService.parentFund({
                tenantId,
                commandId: commandIdOf(req),
                amount: req.body?.amount,
                method: req.body?.method || req.body?.paymentMethod,
                parentId: req.body?.parentId,
                providerReference: req.body?.providerReference,
                confirmed: req.body?.confirmed === true,
            });
            const status = result.ack === 'rejected' ? 400 : 200;
            return res.status(status).json(result);
        }
        catch (err) {
            return res.status(err.status || 500).json({ ack: 'rejected', message: err.message });
        }
    }
    static async parentAllocate(req, res) {
        const tenantId = tenantFromRequest(req, res);
        if (!tenantId)
            return;
        try {
            const result = await financial_command_service_1.FinancialCommandService.parentAllocate({
                tenantId,
                commandId: commandIdOf(req),
                amount: req.body?.amount,
                invoiceNumber: req.body?.invoiceNumber,
                reference: req.body?.reference,
                paymentMethod: req.body?.paymentMethod || 'Parent Credit',
                payload: req.body,
            });
            const status = result.ack === 'rejected' ? 400 : 200;
            return res.status(status).json(result);
        }
        catch (err) {
            return res.status(err.status || 500).json({ ack: 'rejected', message: err.message });
        }
    }
    static gates(_req, res) {
        return res.status(200).json({
            FEATURE_REAL_MONEY_PAYOUTS: process.env.FEATURE_REAL_MONEY_PAYOUTS === 'true',
            FEE_ORCHESTRATION_LIVE: process.env.FEE_ORCHESTRATION_LIVE === 'true',
            liveFeePostingAllowed: (0, fee_live_gate_1.isLiveFeePostingAllowed)(),
            realMoneyPayoutsEnabled: build_variant_1.FeatureGateService.isFeatureEnabled('real_money_payouts'),
        });
    }
}
exports.FinancialCommandController = FinancialCommandController;
//# sourceMappingURL=financial-command.controller.js.map