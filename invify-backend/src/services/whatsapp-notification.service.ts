import { createHash } from 'crypto';
import {
  MetaWhatsAppProvider,
  WhatsAppConfig,
  WhatsAppMessageType,
  WhatsAppProvider,
  WhatsAppSendResult,
  metaWhatsAppProvider,
} from '../integrations/whatsapp';
import { WhatsAppMessageLogRepository } from '../repositories/whatsapp-message-log.repository';
import { GovAuditService } from './gov-audit.service';
import { QueueEngine } from './queue/QueueEngine';
import { randomUUID } from 'crypto';

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

type QueuedWhatsAppJob =
  | { channel: 'whatsapp'; action: 'invoice'; params: NotifyInvoiceParams }
  | { channel: 'whatsapp'; action: 'receipt'; params: NotifyReceiptParams }
  | { channel: 'whatsapp'; action: 'payment_reminder'; params: NotifyPaymentReminderParams }
  | { channel: 'whatsapp'; action: 'general'; params: NotifyGeneralParams };

let handlerRegistered = false;

/**
 * High-level WhatsApp notification orchestration.
 * Additive to FCM NotificationService and EmailService — never rolls back financial ops.
 */
export class WhatsAppNotificationService {
  private static provider: WhatsAppProvider = metaWhatsAppProvider;

  /** Test seam */
  static setProvider(provider: WhatsAppProvider) {
    this.provider = provider;
  }

  static resetProvider() {
    this.provider = metaWhatsAppProvider;
  }

  static ensureQueueHandler() {
    if (handlerRegistered) return;
    handlerRegistered = true;
    const previous = QueueEngine.getHandler('NOTIFICATION');
    QueueEngine.registerHandler('NOTIFICATION', async (payload) => {
      if (payload?.channel === 'whatsapp') {
        await this.processQueuedJob(payload as QueuedWhatsAppJob);
        return;
      }
      if (previous) await previous(payload);
    });
  }

  static async processQueuedJob(job: QueuedWhatsAppJob): Promise<void> {
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
  static notifySafely(task: () => Promise<unknown>, label: string): void {
    void Promise.resolve()
      .then(task)
      .catch((err: any) => {
        console.error(`[WhatsAppNotification] ${label} failed (non-fatal):`, err?.message || err);
      });
  }

  static notifyInvoiceCreated(params: NotifyInvoiceParams): void {
    this.notifySafely(() => this.enqueueOrSend({ channel: 'whatsapp', action: 'invoice', params }), 'invoice');
  }

  static notifyReceipt(params: NotifyReceiptParams): void {
    this.notifySafely(() => this.enqueueOrSend({ channel: 'whatsapp', action: 'receipt', params }), 'receipt');
  }

  static notifyPaymentReminder(params: NotifyPaymentReminderParams): void {
    this.notifySafely(
      () => this.enqueueOrSend({ channel: 'whatsapp', action: 'payment_reminder', params }),
      'payment_reminder'
    );
  }

  private static async enqueueOrSend(job: QueuedWhatsAppJob): Promise<void> {
    this.ensureQueueHandler();
    const useQueue = process.env.WHATSAPP_USE_QUEUE !== 'false';

    if (useQueue) {
      try {
        const msgId = await QueueEngine.enqueue('NOTIFICATION', job, 3);
        // Best-effort immediate processing; retries remain via QueueEngine backoff
        await QueueEngine.processMessage(msgId);
        return;
      } catch (err: any) {
        console.warn(
          `[WhatsAppNotification] Queue unavailable, sending directly: ${err?.message || err}`
        );
      }
    }

    await this.processQueuedJob(job);
  }

  static async sendOtp(params: NotifyOtpParams): Promise<WhatsAppSendResult> {
    const templateName = WhatsAppConfig.templateName('otp');
    const phone = WhatsAppConfig.normalizePhone(params.recipientPhone);
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

  static async sendInvoiceMessage(params: NotifyInvoiceParams): Promise<WhatsAppSendResult | null> {
    const phone = WhatsAppConfig.normalizePhone(params.recipientPhone || '');
    if (!phone) {
      console.warn(
        `[WhatsAppNotification] Skipping invoice WhatsApp — no phone tenant=${params.tenantId} invoice=${params.invoiceId}`
      );
      return null;
    }

    const templateName = WhatsAppConfig.templateName('invoice');
    const amountStr = String(params.amount ?? '');
    const invoiceNumber = params.invoiceNumber || params.invoiceId;
    const idempotencyKey = `invoice:${params.tenantId}:${params.invoiceId}`;

    const existing = await WhatsAppMessageLogRepository.findByIdempotencyKey(idempotencyKey);
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

  static async sendReceiptMessage(params: NotifyReceiptParams): Promise<WhatsAppSendResult | null> {
    const phone = WhatsAppConfig.normalizePhone(params.recipientPhone || '');
    if (!phone) {
      console.warn(
        `[WhatsAppNotification] Skipping receipt WhatsApp — no phone tenant=${params.tenantId} receipt=${params.receiptId}`
      );
      return null;
    }

    const templateName = WhatsAppConfig.templateName('receipt');
    const amountStr = String(params.amount ?? '');
    const idempotencyKey = `receipt:${params.tenantId}:${params.receiptId}`;

    const existing = await WhatsAppMessageLogRepository.findByIdempotencyKey(idempotencyKey);
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

  static async sendPaymentReminder(params: NotifyPaymentReminderParams): Promise<WhatsAppSendResult | null> {
    const phone = WhatsAppConfig.normalizePhone(params.recipientPhone || '');
    if (!phone) return null;

    const templateName = WhatsAppConfig.templateName('payment_reminder');
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

  static async sendGeneralNotification(params: NotifyGeneralParams): Promise<WhatsAppSendResult | null> {
    const phone = WhatsAppConfig.normalizePhone(params.recipientPhone);
    if (!phone) return null;

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
      idempotencyKey: `general:${createHash('sha256').update(`${phone}:${params.body}`).digest('hex').slice(0, 24)}`,
    });

    return result;
  }

  private static async persistSendResult(input: {
    tenantId?: string | null;
    customerId?: string | null;
    invoiceId?: string | null;
    receiptId?: string | null;
    messageType: WhatsAppMessageType;
    recipientPhone: string;
    templateName?: string;
    result: WhatsAppSendResult;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date().toISOString();
    const status = input.result.success ? 'sent' : 'failed';

    await WhatsAppMessageLogRepository.create({
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

    console.log(
      `[WhatsAppNotification] type=${input.messageType} tenant=${input.tenantId || '-'} phone=${WhatsAppConfig.maskPhone(input.recipientPhone)} metaMessageId=${input.result.metaMessageId || '-'} status=${status}${input.result.errorCode ? ` errorCode=${input.result.errorCode}` : ''}`
    );

    try {
      await GovAuditService.logAction({
        id: `wa-${Date.now()}-${randomUUID().slice(0, 6)}`,
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
          recipient_masked: WhatsAppConfig.maskPhone(input.recipientPhone),
          meta_message_id: input.result.metaMessageId,
          error_code: input.result.errorCode,
        },
      });
    } catch {
      // audit must never break send path
    }
  }
}

// Register queue handler at module load (safe if QueueEngine already has another NOTIFICATION handler from tests)
WhatsAppNotificationService.ensureQueueHandler();
