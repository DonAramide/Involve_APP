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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomingWebhookHandlers = void 0;
const supabase_1 = require("../db/supabase");
const quasar_event_gateway_service_1 = require("./quasar-event-gateway.service");
const crypto = __importStar(require("crypto"));
const FinancialVerificationEngine_1 = require("./financial-verification/FinancialVerificationEngine");
const VerificationContext_1 = require("./financial-verification/shared/VerificationContext");
class IncomingWebhookHandlers {
    static verificationEngine = new FinancialVerificationEngine_1.FinancialVerificationEngine();
    static async handleWebhook(params) {
        const payloadStr = JSON.stringify(params.payload);
        const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
        // 1. Replay Attack protection: check if hash already exists in incoming_webhook_logs
        const { data: existing } = await supabase_1.supabaseAdmin
            .from('incoming_webhook_logs')
            .select('id')
            .eq('payload_hash', payloadHash)
            .eq('status', 'VERIFIED')
            .limit(1)
            .maybeSingle();
        if (existing) {
            throw new Error(`Duplicate webhook payload detected (Replay Attack blocked)`);
        }
        // 2. Signature Validation
        const isValidSignature = params.signature === `${params.provider.toLowerCase()}_signature_token`;
        if (!isValidSignature) {
            throw new Error('Invalid webhook signature');
        }
        const providerEventId = params.payload.reference || params.payload.providerReference || crypto.randomUUID();
        // 3. Log to incoming_webhook_logs
        const { data: log, error: logErr } = await supabase_1.supabaseAdmin.from('incoming_webhook_logs').insert({
            provider: params.provider,
            event_type: params.payload.event || 'charge.success',
            payload: params.payload,
            signature_header: params.signature,
            status: 'VERIFIED',
            provider_event_id: providerEventId,
            payload_hash: payloadHash
        }).select().single();
        if (logErr) {
            throw new Error(`Failed to log webhook: ${logErr.message}`);
        }
        try {
            const { tenantId, amount, reference, providerReference, accountNumber } = params.payload;
            const verificationContext = new VerificationContext_1.VerificationContext({
                tenantId,
                amount,
                currency: 'NGN',
                provider: params.provider,
                providerReference,
                metadata: {
                    rawPayload: params.payload,
                    signature: params.signature
                }
            });
            const { verdict } = await IncomingWebhookHandlers.verificationEngine.execute(verificationContext, 'Banking', 'INBOUND');
            if (!verdict.passed || verdict.decision !== 'ALLOW') {
                throw new Error(`Invify Webhook Verification Rejected: ${verdict.errors.join(', ')}`);
            }
            await quasar_event_gateway_service_1.QuasarEventGatewayService.publishInboundCredit({
                tenantId,
                amount,
                reference,
                provider: params.provider,
                providerReference,
                accountNumber,
                rawPayload: params.payload
            });
            // Update log to record processing completion
            await supabase_1.supabaseAdmin.from('incoming_webhook_logs').update({
                processed_at: new Date().toISOString()
            }).eq('id', log.id);
            return { status: 'SUCCESS' };
        }
        catch (err) {
            await supabase_1.supabaseAdmin.from('incoming_webhook_logs').update({
                status: 'FAILED',
                verification_result: err.message
            }).eq('id', log.id);
            throw err;
        }
    }
}
exports.IncomingWebhookHandlers = IncomingWebhookHandlers;
//# sourceMappingURL=webhook-handlers.js.map