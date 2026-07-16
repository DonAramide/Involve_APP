"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const supabase_1 = require("../db/supabase");
const ledger_service_1 = require("../services/ledger.service");
const notification_service_1 = require("../services/notification.service");
const event_service_1 = require("../services/event.service");
const audit_service_1 = require("../services/audit.service");
const gateway_service_1 = require("../services/gateway.service");
const quasar_webhook_service_1 = require("../integrations/quasar/quasar-webhook.service");
const quasar_integration_store_1 = require("../integrations/quasar/quasar-integration.store");
/**
 * WebhookController is the CRITICAL entry point for financial state updates.
 * Rule: This is the ONLY place where student financial states (wallets/ledgers) are modified.
 */
class WebhookController {
    static async handleQuasarWebhook(req, res) {
        const signature = req.headers['x-quasar-signature'];
        const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
        if (!signature || !rawBody) {
            return res.status(400).json({ error: 'Security headers or body missing' });
        }
        try {
            const event = req.body;
            const { reference, amount, status } = event?.data || {};
            // 1. RESOLVE TRANSACTION & TENANT (Never trust tenantId from payload)
            if (!reference) {
                return res.status(400).json({ error: 'Missing reference in payload' });
            }
            const { data: transaction, error: txError } = await supabase_1.supabase
                .from('transactions_log')
                .select('tenant_id, wallet_id, status, type, amount, metadata')
                .eq('reference', reference)
                .single();
            if (txError || !transaction) {
                console.warn(`[Webhook] No transaction found for reference: ${reference}. Acknowledging silently.`);
                return res.status(200).json({ received: true, note: 'unknown_reference' });
            }
            const tenantId = transaction.tenant_id;
            const expectedAmount = Number(transaction.amount);
            if (Math.round(amount) !== expectedAmount) {
                console.error(`[Webhook] Amount mismatch for reference ${reference}. Expected: ${expectedAmount}, Received: ${Math.round(amount)}`);
                // We reject the webhook or store it for manual reconciliation.
                // For strict double-entry, we must reject it.
                return res.status(400).json({ error: 'Payment amount mismatch. Flagged for reconciliation.' });
            }
            // 2. LOAD ENCRYPTED SIGNING SECRET FOR THIS TENANT
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
            if (!integration?.quasar_webhook_signing_secret_enc) {
                console.error(`[Security] No webhook signing secret for tenant ${tenantId}`);
                return res.status(401).json({ error: 'Auth configuration missing' });
            }
            const signingSecret = quasar_integration_store_1.QuasarIntegrationStore.decryptSigningSecret(integration);
            // 3. VERIFY SIGNATURE (HMAC-SHA256, constant-time, timestamp replay protection)
            const isValid = quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, signingSecret, event?.timestamp);
            if (!isValid) {
                console.error('[Security] Webhook HMAC signature mismatch');
                return res.status(401).json({ error: 'Auth failure' });
            }
            // 4. LOG WEBHOOK RECEIVE
            await audit_service_1.AuditService.log({
                eventType: 'webhook.received',
                reference,
                tenantId,
                payload: event
            });
            // 5. IDEMPOTENCY CHECK
            const idempotencyKey = `quasar:${reference}:credit`;
            if (await ledger_service_1.LedgerService.exists(idempotencyKey)) {
                console.log(`[Idempotency] Already processed ${reference}. Returning success.`);
                return res.status(200).json({ status: 'already_processed' });
            }
            // 6. PROCESS STATE UPDATES
            if (status === 'success') {
                await WebhookController._handleSuccess(tenantId, transaction.wallet_id, reference, amount, idempotencyKey, event, transaction.type);
            }
            else if (status === 'failed') {
                await WebhookController._handleFailure(tenantId, transaction.wallet_id, reference, event, transaction.type);
            }
            return res.status(200).json({ received: true });
        }
        catch (error) {
            console.error('[Webhook Critical Error]', error.message);
            try {
                await supabase_1.supabase.from('webhook_dead_letters').insert({
                    provider: 'quasar',
                    endpoint: '/api/v1/webhooks/quasar',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
                console.log(`[Webhook DLQ] Event stored in Dead Letter Queue for Quasar.`);
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure] Could not store Quasar webhook in DLQ:', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/paystack
     * Real Paystack webhook listener verifying HMAC SHA256 signatures.
     */
    static async handlePaystackWebhook(req, res) {
        const signature = req.headers['x-paystack-signature'];
        const secret = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_key_quasar";
        const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
        const isValid = gateway_service_1.PaymentGatewayConvergenceService.verifyWebhookHMAC(rawBody, signature, secret, "paystack");
        if (!isValid) {
            console.error('[Security] Paystack Webhook HMAC verification failed.');
            return res.status(401).json({ error: 'Signature mismatch' });
        }
        try {
            const result = await gateway_service_1.PaymentGatewayConvergenceService.processSettlementWebhook("paystack", signature, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[Paystack Webhook Error]', error.message);
            try {
                await supabase_1.supabase.from('webhook_dead_letters').insert({
                    provider: 'paystack',
                    endpoint: '/api/v1/webhooks/paystack',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure]', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/flutterwave
     * Real Flutterwave webhook listener.
     */
    static async handleFlutterwaveWebhook(req, res) {
        const signature = req.headers['verif-hash'];
        const secret = process.env.FLW_SECRET_KEY || "flwseck_test_mock_key_quasar";
        const isValid = gateway_service_1.PaymentGatewayConvergenceService.verifyWebhookHMAC("", signature, secret, "flutterwave");
        if (!isValid) {
            console.error('[Security] Flutterwave Webhook signature mismatch.');
            return res.status(401).json({ error: 'Signature mismatch' });
        }
        try {
            const result = await gateway_service_1.PaymentGatewayConvergenceService.processSettlementWebhook("flutterwave", signature, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[Flutterwave Webhook Error]', error.message);
            try {
                await supabase_1.supabase.from('webhook_dead_letters').insert({
                    provider: 'flutterwave',
                    endpoint: '/api/v1/webhooks/flutterwave',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure]', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/stripe
     * Real Stripe webhook listener verifying Stripe-Signature HMAC SHA256 header.
     */
    static async handleStripeWebhook(req, res) {
        const signature = req.headers['stripe-signature'];
        const secret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_secret_quasar";
        const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
        const isValid = gateway_service_1.PaymentGatewayConvergenceService.verifyWebhookHMAC(rawBody, signature, secret, "stripe");
        if (!isValid) {
            console.error('[Security] Stripe Webhook HMAC verification failed.');
            return res.status(401).json({ error: 'Signature mismatch' });
        }
        try {
            const result = await gateway_service_1.PaymentGatewayConvergenceService.processSettlementWebhook("stripe", signature, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[Stripe Webhook Error]', error.message);
            try {
                await supabase_1.supabase.from('webhook_dead_letters').insert({
                    provider: 'stripe',
                    endpoint: '/api/v1/webhooks/stripe',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure]', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Performs the double-entry write and updates transaction status.
     */
    static async _handleSuccess(tenantId, walletId, reference, amount, idempotencyKey, event, type = 'payment') {
        console.log(`[Webhook] Processing success for ${type} ref: ${reference}`);
        // 1. Write double-entry ledger (Rules-compliant)
        const entries = type === 'payout'
            ? [
                { account: "SCHOOL_WALLET", type: "DEBIT", amount },
                { account: "EXTERNAL_BANK", type: "CREDIT", amount }
            ]
            : [
                { account: "QUASAR_CLEARING", type: "DEBIT", amount },
                { account: "USER_WALLET", type: "CREDIT", amount }
            ];
        await ledger_service_1.LedgerService.createDoubleEntry({
            idempotencyKey,
            tenantId,
            reference,
            entries: entries,
            actorId: 'SYSTEM_WEBHOOK',
            provider: 'quasar',
            metadata: { source: 'quasar_webhook', type }
        });
        // 2. Update Transaction Status → SUCCESS
        await supabase_1.supabase
            .from('transactions_log')
            .update({ status: 'SUCCESS', processed_at: new Date().toISOString() })
            .eq('reference', reference);
        // 3. Emit Financial Event for Realtime UI update
        await event_service_1.FinancialEventService.emit({
            type: type === 'payout' ? 'payout.success' : 'payment.success',
            reference,
            tenantId,
            walletId,
            amount,
            metadata: event.data?.metadata || {},
            idempotencyKey: `event:${type === 'payout' ? 'payout' : 'payment'}_success:${reference}`
        });
        // 4. Emit Push Notification to School Admin
        if (type === 'payout') {
            await notification_service_1.NotificationService.notifySchoolAdminOfPayoutSuccess(tenantId, amount);
        }
        else {
            const studentName = event.data?.metadata?.studentName || 'Student';
            await notification_service_1.NotificationService.notifySchoolAdminOfPayment(tenantId, amount, studentName);
        }
        // 5. IMMUTABLE AUDIT LOG
        await audit_service_1.AuditService.log({
            eventType: (type === 'payout' ? 'payout.success' : 'payment.success'),
            reference,
            tenantId,
            payload: { amount, type, event_data: event.data }
        });
        console.log(`[Event] Emit payment.success for ${reference}`);
    }
    /**
     * Updates transaction status to FAILED.
     */
    static async _handleFailure(tenantId, walletId, reference, event, type = 'payment') {
        console.log(`[Webhook] Processing failure for ${type} ref: ${reference}`);
        await supabase_1.supabase
            .from('transactions_log')
            .update({ status: 'FAILED', processed_at: new Date().toISOString() })
            .eq('reference', reference);
        // Emit Financial Event
        await event_service_1.FinancialEventService.emit({
            type: type === 'payout' ? 'payout.failed' : 'payment.failed',
            reference,
            tenantId,
            walletId,
            amount: event.data?.amount || 0,
            idempotencyKey: `event:${type === 'payout' ? 'payout' : 'payment'}_failed:${reference}`
        });
        if (type === 'payout') {
            await notification_service_1.NotificationService.notifySchoolAdminOfPayoutFailure(tenantId, event.data?.amount || 0);
        }
        // IMMUTABLE AUDIT LOG
        await audit_service_1.AuditService.log({
            eventType: (type === 'payout' ? 'payout.failed' : 'payment.failed'),
            reference,
            tenantId,
            payload: { ...event, type }
        });
        console.log(`[Event] Emit payment.failed for ${reference}`);
    }
}
exports.WebhookController = WebhookController;
//# sourceMappingURL=webhook.controller.js.map