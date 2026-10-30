"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewayConvergenceService = void 0;
// src/services/gateway.service.ts
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../db/supabase");
const audit_service_1 = require("./audit.service");
const build_variant_1 = require("../config/build-variant");
/**
 * Gateway checkout initialisation.
 *
 * IMPORTANT (Phase 2): This path is SIMULATED only. It must never produce a
 * successful production financial outcome. Simulation is allowed only when
 * BuildVariantService.isSimulatorAllowed() is true (LOCAL, or STAGING with
 * ENABLE_SIMULATOR=true). PROD always fails closed.
 */
class PaymentGatewayConvergenceService {
    static async initializeCheckout(params) {
        const { tenantId, gateway, amount, currency, customerEmail, metadata = {}, idempotencyKey } = params;
        const variant = build_variant_1.BuildVariantService.getInstance();
        if (!variant.isSimulatorAllowed()) {
            const err = new Error('Simulated payment gateway checkout is forbidden in this environment. Live gateway HTTP integration is not enabled.');
            err.status = 403;
            throw err;
        }
        if (!amount || Number(amount) <= 0) {
            throw new Error('Invalid checkout amount');
        }
        if (idempotencyKey) {
            const { data: existingRows } = await supabase_1.supabase
                .from('transactions_log')
                .select('*')
                .eq('tenant_id', tenantId)
                .contains('metadata', { idempotency_key: idempotencyKey })
                .limit(1);
            if (existingRows?.[0]) {
                return {
                    reference: existingRows[0].reference,
                    checkoutUrl: existingRows[0].metadata?.checkout_url,
                    providerRef: existingRows[0].metadata?.provider_ref,
                    simulated: true,
                    idempotentReplay: true,
                };
            }
        }
        const txRef = `TX-${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
        console.log(`[GatewayConvergence] SIMULATED ${gateway.toUpperCase()} checkout for tenant ${tenantId}. Ref: ${txRef}`);
        // No mock production secrets. Simulation uses opaque placeholders only.
        let checkoutUrl = "";
        let providerRef = "";
        if (gateway === "paystack") {
            if (!process.env.PAYSTACK_SECRET_KEY && !variant.isLocal()) {
                const err = new Error('PAYSTACK_SECRET_KEY is not configured');
                err.status = 503;
                throw err;
            }
            providerRef = `pstk_sim_${crypto_1.default.randomBytes(8).toString("hex")}`;
            checkoutUrl = `https://checkout.paystack.com/${providerRef}`;
        }
        else if (gateway === "flutterwave") {
            if (!process.env.FLW_SECRET_KEY && !variant.isLocal()) {
                const err = new Error('FLW_SECRET_KEY is not configured');
                err.status = 503;
                throw err;
            }
            providerRef = `flw_sim_${crypto_1.default.randomBytes(8).toString("hex")}`;
            checkoutUrl = `https://checkout.flutterwave.com/pay/${providerRef}`;
        }
        else if (gateway === "stripe") {
            if (!process.env.STRIPE_SECRET_KEY && !variant.isLocal()) {
                const err = new Error('STRIPE_SECRET_KEY is not configured');
                err.status = 503;
                throw err;
            }
            providerRef = `pi_sim_${crypto_1.default.randomBytes(12).toString("hex")}`;
            checkoutUrl = `https://checkout.stripe.com/pay/${providerRef}`;
        }
        else {
            throw new Error(`Unsupported gateway: ${gateway}`);
        }
        // Persist as SIMULATED / PENDING only — never SUCCESS from this path
        const { error: dbError } = await supabase_1.supabase
            .from("transactions_log")
            .insert({
            reference: txRef,
            tenant_id: tenantId,
            amount: Math.round(amount),
            provider: gateway,
            status: "PENDING",
            type: "gateway_checkout",
            metadata: {
                ...metadata,
                simulated: true,
                customerEmail,
                currency,
                checkout_url: checkoutUrl,
                provider_ref: providerRef,
                ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
            },
        });
        if (dbError) {
            console.error("[GatewayConvergence] DB write failed:", dbError.message);
        }
        await audit_service_1.AuditService.log({
            eventType: "payment.gateway.simulated",
            reference: txRef,
            tenantId,
            payload: { gateway, amount, currency, customerEmail, simulated: true },
        });
        return {
            reference: txRef,
            checkoutUrl,
            providerRef,
            simulated: true,
            warning: "Simulated checkout only — not a live payment authorization",
        };
    }
    /**
     * HMAC SHA-256 Webhook validation layer.
     */
    static verifyWebhookHMAC(payload, signature, secret, gateway) {
        if (!signature || !secret)
            return false;
        try {
            if (gateway === "paystack" || gateway === "stripe") {
                const computed = crypto_1.default
                    .createHmac("sha256", secret)
                    .update(payload)
                    .digest("hex");
                if (computed.length !== signature.length)
                    return false;
                return crypto_1.default.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
            }
            else if (gateway === "flutterwave") {
                return signature === secret;
            }
            return false;
        }
        catch (err) {
            console.error("[GatewayConvergence] Webhook HMAC Verification Failure:", err);
            return false;
        }
    }
    /**
     * Replay-safe settlement clearing processing.
     */
    static async processSettlementWebhook(gateway, signature, payload) {
        const { LedgerService } = await Promise.resolve().then(() => __importStar(require("./ledger.service")));
        const { reference, status, amount, metadata } = payload.data || {};
        const tenantId = metadata?.tenantId || "default-tenant";
        console.log(`[GatewayConvergence] Processing ${gateway.toUpperCase()} webhook callback for ${reference}. Status: ${status}`);
        const idempotencyKey = `quasar:gateway:${gateway}:${reference}:settle`;
        if (await LedgerService.exists(idempotencyKey)) {
            console.warn(`[GatewayConvergence] Duplicate callback captured for reference: ${reference}. Suppressing replay.`);
            return { status: "already_processed" };
        }
        if (status === "success") {
            await LedgerService.createDoubleEntry({
                idempotencyKey,
                tenantId,
                reference,
                entries: [
                    { account: "QUASAR_CLEARING", type: "DEBIT", amount },
                    { account: "USER_WALLET", type: "CREDIT", amount }
                ],
                metadata: { source: "gateway_webhook", gateway }
            });
            await supabase_1.supabase
                .from("transactions_log")
                .update({ status: "SUCCESS", processed_at: new Date().toISOString() })
                .eq("reference", reference);
            await audit_service_1.AuditService.log({
                eventType: "payment.success",
                reference,
                tenantId,
                payload: { amount, gateway }
            });
        }
        return { status: "processed" };
    }
}
exports.PaymentGatewayConvergenceService = PaymentGatewayConvergenceService;
//# sourceMappingURL=gateway.service.js.map