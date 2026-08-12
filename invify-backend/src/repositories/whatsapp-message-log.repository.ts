import { supabaseAdmin } from '../db/supabase';
import {
  MetaWebhookStatus,
  WhatsAppMessageLogRecord,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
  WhatsAppWebhookEventRecord,
} from '../integrations/whatsapp/types';

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

function mapRow(row: any): WhatsAppMessageLogRecord {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    invoice_id: row.invoice_id,
    receipt_id: row.receipt_id,
    message_type: row.message_type,
    recipient_phone: row.recipient_phone,
    phone_number_id: row.phone_number_id,
    template_name: row.template_name,
    meta_message_id: row.meta_message_id,
    status: row.status,
    meta_status: row.meta_status,
    error_code: row.error_code,
    error_message: row.error_message,
    idempotency_key: row.idempotency_key,
    payload: row.payload,
    sent_at: row.sent_at,
    delivered_at: row.delivered_at,
    read_at: row.read_at,
    failed_at: row.failed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class WhatsAppMessageLogRepository {
  static async create(input: CreateWhatsAppLogInput): Promise<WhatsAppMessageLogRecord | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_message_log')
        .insert({
          tenant_id: input.tenantId || null,
          customer_id: input.customerId || null,
          invoice_id: input.invoiceId || null,
          receipt_id: input.receiptId || null,
          message_type: input.messageType,
          recipient_phone: input.recipientPhone,
          phone_number_id: input.phoneNumberId || null,
          template_name: input.templateName || null,
          meta_message_id: input.metaMessageId || null,
          status: input.status || 'pending',
          meta_status: input.metaStatus || null,
          error_code: input.errorCode || null,
          error_message: input.errorMessage || null,
          idempotency_key: input.idempotencyKey || null,
          payload: input.payload || {},
          sent_at: input.sentAt || null,
          delivered_at: input.deliveredAt || null,
          read_at: input.readAt || null,
          failed_at: input.failedAt || null,
        })
        .select('*')
        .maybeSingle();

      if (error) {
        // Unique idempotency / meta id — treat as already logged
        if (error.code === '23505') {
          if (input.idempotencyKey) {
            return this.findByIdempotencyKey(input.idempotencyKey);
          }
          if (input.metaMessageId) {
            return this.findByMetaMessageId(input.metaMessageId);
          }
        }
        console.error('[WhatsAppMessageLog] insert failed:', error.message);
        return null;
      }
      return data ? mapRow(data) : null;
    } catch (e: any) {
      console.error('[WhatsAppMessageLog] create error:', e?.message || e);
      return null;
    }
  }

  static async findByMetaMessageId(metaMessageId: string): Promise<WhatsAppMessageLogRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_message_log')
      .select('*')
      .eq('meta_message_id', metaMessageId)
      .maybeSingle();
    if (error) {
      console.error('[WhatsAppMessageLog] findByMetaMessageId:', error.message);
      return null;
    }
    return data ? mapRow(data) : null;
  }

  static async findByIdempotencyKey(key: string): Promise<WhatsAppMessageLogRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_message_log')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();
    if (error) {
      console.error('[WhatsAppMessageLog] findByIdempotencyKey:', error.message);
      return null;
    }
    return data ? mapRow(data) : null;
  }

  static async updateByMetaMessageId(
    metaMessageId: string,
    patch: Partial<{
      status: WhatsAppMessageStatus;
      metaStatus: string | null;
      errorCode: string | null;
      errorMessage: string | null;
      sentAt: string | null;
      deliveredAt: string | null;
      readAt: string | null;
      failedAt: string | null;
    }>
  ): Promise<WhatsAppMessageLogRecord | null> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.metaStatus !== undefined) update.meta_status = patch.metaStatus;
    if (patch.errorCode !== undefined) update.error_code = patch.errorCode;
    if (patch.errorMessage !== undefined) update.error_message = patch.errorMessage;
    if (patch.sentAt !== undefined) update.sent_at = patch.sentAt;
    if (patch.deliveredAt !== undefined) update.delivered_at = patch.deliveredAt;
    if (patch.readAt !== undefined) update.read_at = patch.readAt;
    if (patch.failedAt !== undefined) update.failed_at = patch.failedAt;

    const { data, error } = await supabaseAdmin
      .from('whatsapp_message_log')
      .update(update)
      .eq('meta_message_id', metaMessageId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[WhatsAppMessageLog] updateByMetaMessageId:', error.message);
      return null;
    }
    return data ? mapRow(data) : null;
  }

  static mapMetaStatus(status: string): WhatsAppMessageStatus {
    const s = String(status || '').toLowerCase() as MetaWebhookStatus | string;
    if (s === 'sent' || s === 'delivered' || s === 'read' || s === 'failed') {
      return s;
    }
    return 'failed';
  }

  /**
   * Claim a webhook event for processing. Returns false if already processed (idempotent).
   */
  static async claimWebhookEvent(input: {
    eventId: string;
    eventType: string;
    metaMessageId?: string | null;
    phoneNumberId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{ claimed: boolean; record?: WhatsAppWebhookEventRecord }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_webhook_events')
        .insert({
          event_id: input.eventId,
          event_type: input.eventType,
          meta_message_id: input.metaMessageId || null,
          phone_number_id: input.phoneNumberId || null,
          payload: input.payload,
        })
        .select('*')
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          return { claimed: false };
        }
        console.error('[WhatsAppWebhookEvents] claim failed:', error.message);
        // Fail open for observability gaps — still process once per process memory if needed
        return { claimed: true };
      }

      return {
        claimed: true,
        record: data
          ? {
              id: data.id,
              event_id: data.event_id,
              event_type: data.event_type,
              meta_message_id: data.meta_message_id,
              phone_number_id: data.phone_number_id,
              payload: data.payload,
              processed_at: data.processed_at,
              created_at: data.created_at,
            }
          : undefined,
      };
    } catch (e: any) {
      console.error('[WhatsAppWebhookEvents] claim error:', e?.message || e);
      return { claimed: true };
    }
  }
}
