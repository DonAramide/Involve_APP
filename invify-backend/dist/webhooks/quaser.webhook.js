"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quaserWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ledger_service_1 = require("../services/ledger.service");
const supabase_1 = require("../db/supabase");
const event_service_1 = require("../services/event.service");
/**
 * POST /webhooks/quaser
 * The absolute source of truth for financial settlement.
 */
const quaserWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-quaser-signature'];
        const secret = process.env.QUASER_WEBHOOK_SECRET;
        if (!secret)
            return res.sendStatus(500);
        // 1. Strict Signature Verification
        const hash = crypto_1.default
            .createHmac('sha256', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        if (hash !== signature) {
            console.error('[Webhook] 🛡️ Invalid Signature');
            return res.sendStatus(403);
        }
        const { event, data } = req.body;
        const { reference, tenantId, amount, provider = 'paystack' } = data;
        console.log(`[Webhook] Processing ${event} for ${reference}`);
        // 2. Financial Settlement (Ledger First)
        if (event === 'payment.success') {
            // Create completed ledger entry (Triggers automatic wallet refresh in DB)
            await ledger_service_1.LedgerService.recordEntry({
                tenantId,
                reference,
                amount,
                type: 'payment',
                provider,
                metadata: { webhook_event: data }
            });
            // Update status to completed (if it was created as pending earlier)
            await ledger_service_1.LedgerService.recordSuccess(reference);
            // 3. Update Payment record (Source of Truth for transactions)
            await supabase_1.supabase
                .from('payments')
                .update({ status: 'successful', updated_at: new Date() })
                .eq('reference', reference);
            // 4. Subscription Logic (Activation/Renewal)
            const isSubscription = data.metadata?.type === 'subscription';
            if (isSubscription) {
                const { plan, tenant_id: subTenantId } = data.metadata;
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(startDate.getDate() + 30); // 30-day rolling cycle
                // Update Subscription Record
                await supabase_1.supabase
                    .from('subscriptions')
                    .upsert({
                    tenant_id: subTenantId,
                    plan,
                    status: 'active',
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    updated_at: new Date()
                }, { onConflict: 'tenant_id' });
                // Update Tenant record
                await supabase_1.supabase
                    .from('tenants')
                    .update({ plan, updated_at: new Date() })
                    .eq('id', subTenantId);
                console.log(`[Webhook] 🚀 Subscribed ${subTenantId} to ${plan} plan`);
            }
            // 5. Emit Events
            event_service_1.eventBus.emit('payment.success', { reference, tenantId, amount });
            event_service_1.eventBus.emit('wallet.updated', { tenantId, reason: 'payment_settled' });
            if (isSubscription)
                event_service_1.eventBus.emit('subscription.updated', { tenantId, plan: data.metadata.plan });
        }
        else if (event === 'payment.failed') {
            await ledger_service_1.LedgerService.recordFailure(reference);
            await supabase_1.supabase
                .from('payments')
                .update({ status: 'failed', updated_at: new Date() })
                .eq('reference', reference);
            event_service_1.eventBus.emit('payment.failed', { reference, tenantId, reason: data.gateway_response || 'Declined' });
        }
        // 5. Acknowledge Fast (200 OK)
        return res.status(200).json({ status: 'processed' });
    }
    catch (error) {
        console.error('[Webhook Critical Error]', error.message);
        // Return 200 to stop Quaser retries once signature is valid, 
        // unless we want a retry for transient DB issues.
        return res.status(200).json({ error: 'Processing logic failed' });
    }
};
exports.quaserWebhook = quaserWebhook;
//# sourceMappingURL=quaser.webhook.js.map