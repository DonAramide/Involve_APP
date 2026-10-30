"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppNotificationService = void 0;
const crypto_1 = require("crypto");
const whatsapp_1 = require("../integrations/whatsapp");
const whatsapp_message_log_repository_1 = require("../repositories/whatsapp-message-log.repository");
const gov_audit_service_1 = require("./gov-audit.service");
const QueueEngine_1 = require("./queue/QueueEngine");
const crypto_2 = require("crypto");
let handlerRegistered = false;
/**
 * High-level WhatsApp notification orchestration.
 * Additive to FCM NotificationService and EmailService — never rolls back financial ops.
 */
class WhatsAppNotificationService {
    static provider = whatsapp_1.metaWhatsAppProvider;
    /** Test seam */
    static setProvider(provider) {
        this.provider = provider;
    }
    static resetProvider() {
        this.provider = whatsapp_1.metaWhatsAppProvider;
    }
    static ensureQueueHandler() {
        if (handlerRegistered)
            return;
        handlerRegistered = true;
        const previous = QueueEngine_1.QueueEngine.getHandler('NOTIFICATION');
        QueueEngine_1.QueueEngine.registerHandler('NOTIFICATION', async (payload) => {
            if (payload?.channel === 'whatsapp') {
                await this.processQueuedJob(payload);
                return;
            }
            if (previous)
                await previous(payload);
        });
    }
    static async processQueuedJob(job) {
        switch (job.action) {
            case 'invoice':
                await this.sendInvoiceMessage(job.params);
                return;
            case 'receipt':
                await this.sendReceiptMessage(job.params);
                return;
            case 'payment_reminder':
                await this.sendPaymentReminder(job.params);
                return;
            case 'general':
                await this.sendGeneralNotification(job.params);
                return;
            default:
                return;
        }
    }
    /**
     * Fire-and-forget wrapper — never throws to callers (invoice/payment safe).
     */
    static notifySafely(task, label) {
        void Promise.resolve()
            .then(task)
            .catch((err) => {
            console.error(`[WhatsAppNotification] ${label} failed (non-fatal):`, err?.message || err);
        });
    }
    static notifyInvoiceCreated(params) {
        this.notifySafely(() => this.enqueueOrSend({ channel: 'whatsapp', action: 'invoice', params }), 'invoice');
    }
    static notifyReceipt(params) {
        this.notifySafely(() => this.enqueueOrSend({ channel: 'whatsapp', action: 'receipt', params }), 'receipt');
    }
    static notifyPaymentReminder(params) {
        this.notifySafely(() => this.enqueueOrSend({ channel: 'whatsapp', action: 'payment_reminder', params }), 'payment_reminder');
    }
    static async enqueueOrSend(job) {
        this.ensureQueueHandler();
        const useQueue = process.env.WHATSAPP_USE_QUEUE !== 'false';
        if (useQueue) {
            try {
                const msgId = await QueueEngine_1.QueueEngine.enqueue('NOTIFICATION', job, 3);
                // Best-effort immediate processing; retries remain via QueueEngine backoff
                await QueueEngine_1.QueueEngine.processMessage(msgId);
                return;
            }
            catch (err) {
                console.warn(`[WhatsAppNotification] Queue unavailable, sending directly: ${err?.message || err}`);
            }
        }
        await this.processQueuedJob(job);
    }
    static async sendOtp(params) {
        const templateName = whatsapp_1.WhatsAppConfig.templateName('otp');
        const phone = whatsapp_1.WhatsAppConfig.normalizePhone(params.recipientPhone);
        const idempotencyKey = `otp:${phone}:${params.otp.slice(0, 2)}:${Math.floor(Date.now() / 60000)}`;
        const result = await this.provider.sendTemplateMessage({
            to: phone,
            templateName,
            languageCode: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [{ type: 'text', text: params.otp }],
                },
                {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: params.otp }],
                },
            ],
            context: {
                tenantId: params.tenantId,
                messageType: 'OTP',
                recipientPhone: phone,
                templateName,
            },
        });
        await this.persistSendResult({
            tenantId: params.tenantId,
            messageType: 'OTP',
            recipientPhone: phone,
            templateName,
            result,
            idempotencyKey,
        });
        return result;
    }
    static async sendInvoiceMessage(params) {
        const phone = whatsapp_1.WhatsAppConfig.normalizePhone(params.recipientPhone || '');
        if (!phone) {
            console.warn(`[WhatsAppNotification] Skipping invoice WhatsApp — no phone tenant=${params.tenantId} invoice=${params.invoiceId}`);
            return null;
        }
        const templateName = whatsapp_1.WhatsAppConfig.templateName('invoice');
        const amountStr = String(params.amount ?? '');
        const invoiceNumber = params.invoiceNumber || params.invoiceId;
        const idempotencyKey = `invoice:${params.tenantId}:${params.invoiceId}`;
        const existing = await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.findByIdempotencyKey(idempotencyKey);
        if (existing && existing.status !== 'failed') {
            return {
                success: true,
                metaMessageId: existing.meta_message_id || undefined,
                phoneNumberId: existing.phone_number_id || undefined,
            };
        }
        const result = await this.provider.sendTemplateMessage({
            to: phone,
            templateName,
            languageCode: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: params.customerName || 'Customer' },
                        { type: 'text', text: invoiceNumber },
                        { type: 'text', text: amountStr },
                        { type: 'text', text: params.currency || 'NGN' },
                        { type: 'text', text: params.dueDate || '' },
                    ],
                },
            ],
            context: {
                tenantId: params.tenantId,
                customerId: params.customerId,
                invoiceId: params.invoiceId,
                messageType: 'INVOICE',
                recipientPhone: phone,
                templateName,
            },
        });
        await this.persistSendResult({
            tenantId: params.tenantId,
            customerId: params.customerId,
            invoiceId: params.invoiceId,
            messageType: 'INVOICE',
            recipientPhone: phone,
            templateName,
            result,
            idempotencyKey,
            payload: { invoiceNumber, amount: amountStr },
        });
        return result;
    }
    static async sendReceiptMessage(params) {
        const phone = whatsapp_1.WhatsAppConfig.normalizePhone(params.recipientPhone || '');
        if (!phone) {
            console.warn(`[WhatsAppNotification] Skipping receipt WhatsApp — no phone tenant=${params.tenantId} receipt=${params.receiptId}`);
            return null;
        }
        const templateName = whatsapp_1.WhatsAppConfig.templateName('receipt');
        const amountStr = String(params.amount ?? '');
        const idempotencyKey = `receipt:${params.tenantId}:${params.receiptId}`;
        const existing = await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.findByIdempotencyKey(idempotencyKey);
        if (existing && existing.status !== 'failed') {
            return {
                success: true,
                metaMessageId: existing.meta_message_id || undefined,
                phoneNumberId: existing.phone_number_id || undefined,
            };
        }
        const result = await this.provider.sendTemplateMessage({
            to: phone,
            templateName,
            languageCode: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: params.customerName || 'Customer' },
                        { type: 'text', text: amountStr },
                        { type: 'text', text: params.currency || 'NGN' },
                        { type: 'text', text: params.reference || params.receiptId },
                    ],
                },
            ],
            context: {
                tenantId: params.tenantId,
                customerId: params.customerId,
                invoiceId: params.invoiceId,
                receiptId: params.receiptId,
                messageType: 'RECEIPT',
                recipientPhone: phone,
                templateName,
            },
        });
        await this.persistSendResult({
            tenantId: params.tenantId,
            customerId: params.customerId,
            invoiceId: params.invoiceId,
            receiptId: params.receiptId,
            messageType: 'RECEIPT',
            recipientPhone: phone,
            templateName,
            result,
            idempotencyKey,
            payload: { amount: amountStr, reference: params.reference },
        });
        return result;
    }
    static async sendPaymentReminder(params) {
        const phone = whatsapp_1.WhatsAppConfig.normalizePhone(params.recipientPhone || '');
        if (!phone)
            return null;
        const templateName = whatsapp_1.WhatsAppConfig.templateName('payment_reminder');
        const amountStr = String(params.amount ?? '');
        const invoiceNumber = params.invoiceNumber || params.invoiceId;
        const dayBucket = new Date().toISOString().slice(0, 10);
        const idempotencyKey = `reminder:${params.tenantId}:${params.invoiceId}:${dayBucket}`;
        const result = await this.provider.sendTemplateMessage({
            to: phone,
            templateName,
            languageCode: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: params.customerName || 'Customer' },
                        { type: 'text', text: invoiceNumber },
                        { type: 'text', text: amountStr },
                        { type: 'text', text: params.currency || 'NGN' },
                        { type: 'text', text: params.dueDate || '' },
                    ],
                },
            ],
            context: {
                tenantId: params.tenantId,
                customerId: params.customerId,
                invoiceId: params.invoiceId,
                messageType: 'PAYMENT_REMINDER',
                recipientPhone: phone,
                templateName,
            },
        });
        await this.persistSendResult({
            tenantId: params.tenantId,
            customerId: params.customerId,
            invoiceId: params.invoiceId,
            messageType: 'PAYMENT_REMINDER',
            recipientPhone: phone,
            templateName,
            result,
            idempotencyKey,
        });
        return result;
    }
    static async sendGeneralNotification(params) {
        const phone = whatsapp_1.WhatsAppConfig.normalizePhone(params.recipientPhone);
        if (!phone)
            return null;
        const messageType = params.messageType || 'GENERAL_NOTIFICATION';
        const result = await this.provider.sendTextMessage({
            to: phone,
            body: params.body,
            context: {
                tenantId: params.tenantId,
                customerId: params.customerId,
                messageType,
                recipientPhone: phone,
            },
        });
        await this.persistSendResult({
            tenantId: params.tenantId,
            customerId: params.customerId,
            messageType,
            recipientPhone: phone,
            result,
            idempotencyKey: `general:${(0, crypto_1.createHash)('sha256').update(`${phone}:${params.body}`).digest('hex').slice(0, 24)}`,
        });
        return result;
    }
    static async persistSendResult(input) {
        const now = new Date().toISOString();
        const status = input.result.success ? 'sent' : 'failed';
        await whatsapp_message_log_repository_1.WhatsAppMessageLogRepository.create({
            tenantId: input.tenantId,
            customerId: input.customerId,
            invoiceId: input.invoiceId,
            receiptId: input.receiptId,
            messageType: input.messageType,
            recipientPhone: input.recipientPhone,
            phoneNumberId: input.result.phoneNumberId,
            templateName: input.templateName,
            metaMessageId: input.result.metaMessageId,
            status,
            metaStatus: status,
            errorCode: input.result.errorCode,
            errorMessage: input.result.errorMessage,
            idempotencyKey: input.idempotencyKey,
            payload: {
                ...(input.payload || {}),
                mocked: !!input.result.mocked,
            },
            sentAt: input.result.success ? now : null,
            failedAt: input.result.success ? null : now,
        });
        console.log(`[WhatsAppNotification] type=${input.messageType} tenant=${input.tenantId || '-'} phone=${whatsapp_1.WhatsAppConfig.maskPhone(input.recipientPhone)} metaMessageId=${input.result.metaMessageId || '-'} status=${status}${input.result.errorCode ? ` errorCode=${input.result.errorCode}` : ''}`);
        try {
            await gov_audit_service_1.GovAuditService.logAction({
                id: `wa-${Date.now()}-${(0, crypto_2.randomUUID)().slice(0, 6)}`,
                timestamp: now,
                module: 'SYSTEM',
                action: `WHATSAPP_${input.messageType}_${status.toUpperCase()}`,
                user_email: 'system@invify',
                user_name: 'WhatsAppNotificationService',
                ip_address: '127.0.0.1',
                target: input.result.metaMessageId || input.idempotencyKey || input.messageType,
                status: input.result.success ? 'success' : 'failed',
                metadata: {
                    tenant_id: input.tenantId,
                    message_type: input.messageType,
                    recipient_masked: whatsapp_1.WhatsAppConfig.maskPhone(input.recipientPhone),
                    meta_message_id: input.result.metaMessageId,
                    error_code: input.result.errorCode,
                },
            });
        }
        catch {
            // audit must never break send path
        }
    }
}
exports.WhatsAppNotificationService = WhatsAppNotificationService;
// Register queue handler at module load (safe if QueueEngine already has another NOTIFICATION handler from tests)
WhatsAppNotificationService.ensureQueueHandler();
//# sourceMappingURL=whatsapp-notification.service.js.map