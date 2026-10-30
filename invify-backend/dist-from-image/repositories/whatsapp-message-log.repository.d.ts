import { WhatsAppMessageLogRecord, WhatsAppMessageStatus, WhatsAppMessageType, WhatsAppWebhookEventRecord } from '../integrations/whatsapp/types';
export interface CreateWhatsAppLogInput {
    tenantId?: string | null;
    customerId?: string | null;
    invoiceId?: string | null;
    receiptId?: string | null;
    messageType: WhatsAppMessageType;
    recipientPhone: string;
    phoneNumberId?: string | null;
    templateName?: string | null;
    metaMessageId?: string | null;
    status?: WhatsAppMessageStatus;
    metaStatus?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    idempotencyKey?: string | null;
    payload?: Record<string, unknown> | null;
    sentAt?: string | null;
    deliveredAt?: string | null;
    readAt?: string | null;
    failedAt?: string | null;
}
export declare class WhatsAppMessageLogRepository {
    static create(input: CreateWhatsAppLogInput): Promise<WhatsAppMessageLogRecord | null>;
    static findByMetaMessageId(metaMessageId: string): Promise<WhatsAppMessageLogRecord | null>;
    static findByIdempotencyKey(key: string): Promise<WhatsAppMessageLogRecord | null>;
    static updateByMetaMessageId(metaMessageId: string, patch: Partial<{
        status: WhatsAppMessageStatus;
        metaStatus: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        readAt: string | null;
        failedAt: string | null;
    }>): Promise<WhatsAppMessageLogRecord | null>;
    static mapMetaStatus(status: string): WhatsAppMessageStatus;
    /**
     * Claim a webhook event for processing. Returns false if already processed (idempotent).
     */
    static claimWebhookEvent(input: {
        eventId: string;
        eventType: string;
        metaMessageId?: string | null;
        phoneNumberId?: string | null;
        payload: Record<string, unknown>;
    }): Promise<{
        claimed: boolean;
        record?: WhatsAppWebhookEventRecord;
    }>;
}
