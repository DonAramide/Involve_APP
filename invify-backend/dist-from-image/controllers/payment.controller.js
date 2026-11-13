"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const gateway_service_1 = require("../services/gateway.service");
const finance_tenant_1 = require("../utils/finance-tenant");
class PaymentController {
    /**
     * POST /payments/create | POST /payments/intents
     * Initiates the payment workflow by persisting a record and creating a Quaser intent.
     */
    static async createPayment(req, res) {
        try {
            const tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            const { walletId, studentName, amount, metadata } = req.body;
            const idempotencyKey = req.headers['idempotency-key'] ||
                req.headers['x-idempotency-key'] ||
                req.body?.idempotencyKey;
            if (!walletId || !studentName || !amount) {
                return res.status(400).json({ error: "WalletId, StudentName, and Amount are required." });
            }
            const result = await payment_service_1.PaymentService.createIntent({
                tenantId,
                walletId,
                studentName,
                amount,
                metadata,
                idempotencyKey,
            });
            return res.status(201).json(result);
        }
        catch (error) {
            const status = error.status || 500;
            console.error('[PaymentController] createPayment Error:', error.message);
            return res.status(status).json({ error: error.message });
        }
    }
    /**
     * POST /payments/initialize
     * Direct multi-processor checkout gateway initialisation layer (Stripe/Paystack/Flutterwave).
     */
    static async initializeGatewayCheckout(req, res) {
        try {
            const tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            const { gateway, amount, currency, customerEmail, metadata } = req.body;
            const idempotencyKey = req.headers['idempotency-key'] ||
                req.headers['x-idempotency-key'] ||
                req.body?.idempotencyKey;
            if (!gateway || !amount || !customerEmail) {
                return res.status(400).json({ error: "gateway (stripe/paystack/flutterwave), amount, and customerEmail are required." });
            }
            const result = await gateway_service_1.PaymentGatewayConvergenceService.initializeCheckout({
                tenantId,
                gateway,
                amount,
                currency: currency || "NGN",
                customerEmail,
                metadata,
                idempotencyKey,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            const status = error.status || 500;
            console.error('[PaymentController] initializeGatewayCheckout Error:', error.message);
            return res.status(status).json({ error: error.message });
        }
    }
    static async getPaymentIntent(req, res) {
        try {
            const { id } = req.params;
            const result = await payment_service_1.PaymentService.getIntent(id);
            (0, finance_tenant_1.assertTransactionTenantAccess)(result.tenant_id, req);
            return res.status(200).json(result);
        }
        catch (error) {
            const status = error.status || (error.message.includes('not found') ? 404 : 500);
            console.error('[PaymentController] getPaymentIntent Error:', error.message);
            return res.status(status).json({ error: error.message });
        }
    }
    static async cancelPaymentIntent(req, res) {
        try {
            const { id } = req.params;
            const existing = await payment_service_1.PaymentService.getIntent(id);
            (0, finance_tenant_1.assertTransactionTenantAccess)(existing.tenant_id, req);
            const result = await payment_service_1.PaymentService.cancelIntent(id);
            return res.status(200).json(result);
        }
        catch (error) {
            const status = error.status || (error.message.includes('not found') ? 404 : 500);
            console.error('[PaymentController] cancelPaymentIntent Error:', error.message);
            return res.status(status).json({ error: error.message });
        }
    }
    static async getPaymentHistory(req, res) {
        try {
            const tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            const result = await payment_service_1.PaymentService.getHistory(tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            const status = error.status || 500;
            console.error('[PaymentController] getPaymentHistory Error:', error.message);
            return res.status(status).json({ error: error.message });
        }
    }
    static async refundPaymentIntent(req, res) {
        try {
            const { id } = req.params;
            const { amount, reason } = req.body;
            if (!amount) {
                return res.status(400).json({ error: "amount is required for processing refunds." });
            }
            const existing = await payment_service_1.PaymentService.getIntent(id);
            (0, finance_tenant_1.assertTransactionTenantAccess)(existing.tenant_id, req);
            const idempotencyKey = req.headers['idempotency-key'] ||
                req.headers['x-idempotency-key'] ||
                req.body?.idempotencyKey;
            const result = await payment_service_1.PaymentService.refundIntent(id, amount, reason, idempotencyKey);
            return res.status(200).json(result);
        }
        catch (error) {
            const status = error.status || (error.message.includes('not found') ? 404 : 500);
            console.error('[PaymentController] refundPaymentIntent Error:', error.message);
            return res.status(status).json({ error: error.message });
        }
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=payment.controller.js.map