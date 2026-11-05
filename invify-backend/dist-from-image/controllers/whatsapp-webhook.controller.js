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
exports.WhatsAppWebhookController = void 0;
const crypto = __importStar(require("crypto"));
const WhatsAppConfig_1 = require("../integrations/whatsapp/WhatsAppConfig");
const whatsapp_message_log_repository_1 = require("../repositories/whatsapp-message-log.repository");
const gov_audit_service_1 = require("../services/gov-audit.service");
const crypto_1 = require("crypto");
/**
 * Meta WhatsApp Cloud API webhooks.
 * GET  /webhooks/whatsapp — subscription verification
 * POST /webhooks/whatsapp — inbound messages + status callbacks
 */
class WhatsAppWebhookController {
    /**
     * Meta webhook verification handshake.
     * Query: hub.mode, hub.verify_token, hub.challenge
     */
    static async verify(req, res) {
        const mode = String(req.query['hub.mode'] || '');
        const token = String(req.query['hub.verify_token'] || '');
        const challenge = String(req.query['hub.challenge'] || '');
        const expected = await WhatsAppConfig_1.WhatsAppConfig.getWebhookVerifyToken();
        if (mode === 'subscribe' && expected && token === expected) {
            console.log('[WhatsAppWebhook] Verification succeeded');
            return res.status(200).send(challenge);
        }
        console.warn('[WhatsAppWebhook] Verification failed');
        return res.status(403).send('Forbidden');
    }
    /**
     * Process inbound webhook events. Always ACK quickly with 200 for valid signed payloads.
     */
    static async handle(req, res) {
        try {
            const signatureValid = await WhatsAppWebhookController.verifySignature(req);
            if (!signatureValid) {
                console.warn('[WhatsAppWebhook] Invalid signature');
                return res.status(403).json({ error: 'Invalid signature' });
            }
            const body = req.body || {};
            if (body.object !== 'whatsapp_business_account') {
                // Acknowledge unknown objects without leaking details
                return res.status(200).json({ received: true });
            }
            // ACK immediately pattern: process synchronously but keep lightweight + idempotent
            await WhatsAppWebhookController.processPayload(body);
            return res.status(200).json({ received: true });
        }
        catch (err) {
            console.error('[WhatsAppWebhook] Handler error:', err?.message || err);
            // Still 200 to avoid Meta retry storms for poison payloads we already logged
            return res.status(200).json({ received: true, warning: 'processed_with_errors' });
        }
    }
    static async verifySignature(req) {
        const appSecret = await WhatsAppConfig_1.WhatsAppConfig.getAppSecret();
        // Allow unsigned in non-production when secret not configured (local/dev)
        if (!appSecret) {
            if (process.env.NODE_ENV === 'production') {
                console.error('[WhatsAppWebhook] WHATSAPP_APP_SECRET not configured');
                return false;
            }
            return true;
        }
        const header = String(req.headers['x-hub-signature-256'] || '');
        if (!header.startsWith('sha256='))
            return false;
        const rawBody = req.rawBody;
        const payload = rawBody || Buffer.from(JSON.stringify(req.body || {}));
        const expected = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
        const provided = header.slice('sha256='.length);
        try {
            const a = Buffer.from(expected, 'hex');
            const b = Buffer.from(provided, 'hex');
            if (a.length !== b.length)
                return false;
            return crypto.timingSafeEqual(a, b);
        }
        catch {
            return false;
        }
    }
    static async processPayload(body) {
        const entries = Array.isArray(body.entry) ? body.entry : [];
        for (const entry of entries) {
            const changes = Array.isArray(entry?.changes) ? entry.changes : [];
            for (const change of changes) {
                if (change?.field !== 'messages')
                    continue;
                const value = change.value || {};
                const phoneNumberId = value?.metadata?.phone_number_id || null;
                await this.processStatuses(value, phoneNumberId, entry?.id);
                await this.processIncomingMessages(value, phoneNumberId, entry?.id);
                await this.processErrors(value, phoneNumberId, entry?.id);
            }
        }
    }
    static async processStatuses(value, phoneNumberId, entryId) {
        const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const statusEvent of statuses) {
            const metaMessageId = statusEvent.id || statusEvent.message_id;
            const metaStatus = String(statusEvent.status || '').toLowerCase();
            const eventId = statusEvent.id && statusEvent.status && statusEvent.timestamp
                ? `status:${statusEvent.id}:${statusEvent.status}:${statusEvent.timestamp}`
                : `status:${entryId || 'e'}:${metaMessageId || 'm'}:${metaStatus}:${statusEvent.timestamp || Date.now()}`;
            const claim = await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.claimWebhookEvent({
                eventId,
                eventType: 'status',
                metaMessageId,
                phoneNumberId,
                payload: statusEvent,
            });
            if (!claim.claimed)
                continue;
            if (!metaMessageId)
                continue;
            const mapped = whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.mapMetaStatus(metaStatus);
            const now = new Date().toISOString();
            const patch = {
                status: mapped,
                metaStatus,
            };
            if (mapped === 'sent')
                patch.sentAt = now;
            if (mapped === 'delivered')
                patch.deliveredAt = now;
            if (mapped === 'read')
                patch.readAt = now;
            if (mapped === 'failed') {
                patch.failedAt = now;
                const err = statusEvent.errors?.[0];
                patch.errorCode = err?.code != null ? String(err.code) : null;
                patch.errorMessage = err?.title || err?.message || null;
            }
            const updated = await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.updateByMetaMessageId(metaMessageId, patch);
            if (!updated) {
                // Status for a message we didn't originate — still log a stub for audit trail
                await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.create({
                    messageType: 'GENERAL_NOTIFICATION',
                    recipientPhone: statusEvent.recipient_id || 'unknown',
                    phoneNumberId,
                    metaMessageId,
                    status: mapped,
                    metaStatus,
                    errorCode: patch.errorCode,
                    errorMessage: patch.errorMessage,
                    sentAt: mapped === 'sent' ? now : null,
                    deliveredAt: mapped === 'delivered' ? now : null,
                    readAt: mapped === 'read' ? now : null,
                    failedAt: mapped === 'failed' ? now : null,
                    payload: { source: 'webhook_status_orphan', statusEvent },
                });
            }
            console.log(`[WhatsAppWebhook] status metaMessageId=${metaMessageId} status=${mapped}${patch.errorCode ? ` errorCode=${patch.errorCode}` : ''}`);
            try {
                await gov_audit_service_1.GovAuditService.logAction({
                    id: `wa-wh-${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 6)}`,
                    timestamp: now,
                    module: 'SYSTEM',
                    action: `WHATSAPP_STATUS_${mapped.toUpperCase()}`,
                    user_email: 'system@invify',
                    user_name: 'WhatsAppWebhook',
                    ip_address: '127.0.0.1',
                    target: metaMessageId,
                    status: mapped === 'failed' ? 'failed' : 'success',
                    metadata: {
                        meta_message_id: metaMessageId,
                        status: mapped,
                        error_code: patch.errorCode,
                        phone_number_id: phoneNumberId,
                    },
                });
            }
            catch {
                /* ignore */
            }
        }
    }
    static async processIncomingMessages(value, phoneNumberId, entryId) {
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const message of messages) {
            const metaMessageId = message.id;
            const eventId = metaMessageId
                ? `inbound:${metaMessageId}`
                : `inbound:${entryId || 'e'}:${message.timestamp || Date.now()}:${message.from || ''}`;
            const claim = await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.claimWebhookEvent({
                eventId,
                eventType: 'inbound_message',
                metaMessageId,
                phoneNumberId,
                payload: {
                    from: message.from,
                    type: message.type,
                    timestamp: message.timestamp,
                    // Do not store full free-text body long-term beyond webhook_events; keep minimal
                    textPreview: message.text?.body ? String(message.text.body).slice(0, 120) : undefined,
                },
            });
            if (!claim.claimed)
                continue;
            console.log(`[WhatsAppWebhook] inbound type=${message.type || 'unknown'} from=${WhatsAppConfig_1.WhatsAppConfig.maskPhone(message.from || '')} metaMessageId=${metaMessageId || '-'}`);
            try {
                await gov_audit_service_1.GovAuditService.logAction({
                    id: `wa-in-${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 6)}`,
                    timestamp: new Date().toISOString(),
                    module: 'SYSTEM',
                    action: 'WHATSAPP_INBOUND_MESSAGE',
                    user_email: 'system@invify',
                    user_name: 'WhatsAppWebhook',
                    ip_address: '127.0.0.1',
                    target: metaMessageId || eventId,
                    status: 'success',
                    metadata: {
                        meta_message_id: metaMessageId,
                        message_type: message.type,
                        from_masked: WhatsAppConfig_1.WhatsAppConfig.maskPhone(message.from || ''),
                        phone_number_id: phoneNumberId,
                    },
                });
            }
            catch {
                /* ignore */
            }
        }
    }
    static async processErrors(value, phoneNumberId, entryId) {
        const errors = Array.isArray(value?.errors) ? value.errors : [];
        for (const err of errors) {
            const eventId = `error:${entryId || 'e'}:${err.code || 'x'}:${err.href || err.title || Date.now()}`;
            const claim = await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.claimWebhookEvent({
                eventId,
                eventType: 'error',
                metaMessageId: null,
                phoneNumberId,
                payload: { code: err.code, title: err.title, message: err.message },
            });
            if (!claim.claimed)
                continue;
            console.error(`[WhatsAppWebhook] error code=${err.code || '-'} title=${err.title || err.message || 'unknown'}`);
        }
    }
}
exports.WhatsAppWebhookController = WhatsAppWebhookController;
//# sourceMappingURL=whatsapp-webhook.controller.js.map