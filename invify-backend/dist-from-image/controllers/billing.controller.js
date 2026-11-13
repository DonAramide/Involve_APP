"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const billing_service_1 = require("../services/billing.service");
const supabase_1 = require("../db/supabase");
class BillingController {
    /**
     * GET /billing/status
     */
    static async getStatus(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const status = await billing_service_1.BillingService.getBillingStatus(tenantId);
            return res.status(200).json(status);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /billing/subscribe
     * Initiates payment for a subscription plan.
     */
    static async subscribe(req, res) {
        try {
            const { plan } = req.body;
            const { tenantId, email } = req.user;
            // 1. Get Plan pricing
            const { data: limit } = await supabase_1.supabase
                .from('usage_limits')
                .select('price_ngn')
                .eq('plan', plan)
                .single();
            if (!limit)
                return res.status(400).json({ error: 'Invalid plan selected' });
            // 2. Integration: Use Quaser Payment to handle checkout
            // We pass the subscription metadata for the webhook to capture
            const { PaymentController } = require('./payment.controller');
            const paymentPayload = {
                amount: limit.price_ngn,
                email,
                metadata: {
                    type: 'subscription',
                    plan,
                    tenant_id: tenantId
                }
            };
            // Mocking the payment initialization call internally
            // In a real scenario, this returns the Quaser checkout URL
            return res.status(200).json({
                message: `Checkout initialized for ${plan} plan`,
                amount: limit.price_ngn,
                checkoutUrl: `https://checkout.quaser.com/invify?tenant=${tenantId}&plan=${plan}`,
                metadata: paymentPayload.metadata
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.BillingController = BillingController;
//# sourceMappingURL=billing.controller.js.map