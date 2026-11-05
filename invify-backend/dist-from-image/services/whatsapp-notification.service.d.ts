import { WhatsAppMessageType, WhatsAppProvider, WhatsAppSendResult } from '../integrations/whatsapp';
export interface NotifyInvoiceParams {
    tenantId: string;
    customerId?: string | null;
    invoiceId: string;
    invoiceNumber?: string;
    amount?: number | string;
    currency?: string;
    recipientPhone?: string | null;
    customerName?: string;
    dueDate?: string;
}
export interface NotifyReceiptParams {
    tenantId: string;
    customerId?: string | null;
    invoiceId?: string | null;
    receiptId: string;
    amount?: number | string;
    currency?: string;
    recipientPhone?: string | null;
    customerName?: string;
    reference?: string;
}
export interface NotifyPaymentReminderParams {
    tenantId: string;
    customerId?: string | null;
    invoiceId: string;
    invoiceNumber?: string;
    amount?: number | string;
    currency?: string;
    recipientPhone?: string | null;
    customerName?: string;
    dueDate?: string;
}
export interface NotifyOtpParams {
    recipientPhone: string;
    otp: string;
    tenantId?: string | null;
}
export interface NotifyGeneralParams {
    tenantId?: string | null;
    customerId?: string | null;
    recipientPhone: string;
    body: string;
    messageType?: WhatsAppMessageType;
}
type QueuedWhatsAppJob = {
    channel: 'whatsapp';
    action: 'invoice';
    params: NotifyInvoiceParams;
} | {
    channel: 'whatsapp';
    action: 'receipt';
    params: NotifyReceiptParams;
} | {
    channel: 'whatsapp';
    action: 'payment_reminder';
    params: NotifyPaymentReminderParams;
} | {
    channel: 'whatsapp';
    action: 'general';
    params: NotifyGeneralParams;
};
/**
 * High-level WhatsApp notification orchestration.
 * Additive to FCM NotificationService and EmailService — never rolls back financial ops.
 */
export declare class WhatsAppNotificationService {
    private static provider;
    /** Test seam */
    static setProvider(provider: WhatsAppProvider): void;
    static resetProvider(): void;
    static ensureQueueHandler(): void;
    static processQueuedJob(job: QueuedWhatsAppJob): Promise<void>;
    /**
     * Fire-and-forget wrapper — never throws to callers (invoice/payment safe).
     */
    static notifySafely(task: () => Promise<unknown>, label: string): void;
    static notifyInvoiceCreated(params: NotifyInvoiceParams): void;
    static notifyReceipt(params: NotifyReceiptParams): void;
    static notifyPaymentReminder(params: NotifyPaymentReminderParams): void;
    private static enqueueOrSend;
    static sendOtp(params: NotifyOtpParams): Promise<WhatsAppSendResult>;
    static sendInvoiceMessage(params: NotifyInvoiceParams): Promise<WhatsAppSendResult | null>;
    static sendReceiptMessage(params: NotifyReceiptParams): Promise<WhatsAppSendResult | null>;
    static sendPaymentReminder(params: NotifyPaymentReminderParams): Promise<WhatsAppSendResult | null>;
    static sendGeneralNotification(params: NotifyGeneralParams): Promise<WhatsAppSendResult | null>;
    private static persistSendResult;
}
export {};
