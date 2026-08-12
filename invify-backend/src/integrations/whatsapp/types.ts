/** WhatsApp Cloud API integration types (additive; does not replace FCM/email). */

export type WhatsAppMessageType =
  | 'OTP'
  | 'INVOICE'
  | 'RECEIPT'
  | 'PAYMENT_REMINDER'
  | 'GENERAL_NOTIFICATION';

export type WhatsAppMessageStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type MetaWebhookStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppAccountConfig {
  graphApiVersion: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  /** Reserved for Phase 2 tenant-owned WABAs */
  tenantId?: string;
}

export interface WhatsAppSendContext {
  tenantId?: string | null;
  customerId?: string | null;
  invoiceId?: string | null;
  receiptId?: string | null;
  messageType: WhatsAppMessageType;
  recipientPhone: string;
  templateName?: string;
  /** Override phone number id for future tenant WABAs */
  whatsappPhoneNumberId?: string;
}

export interface SendTextParams {
  to: string;
  body: string;
  context?: Partial<WhatsAppSendContext>;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
  context?: Partial<WhatsAppSendContext>;
}

export interface SendDocumentParams {
  to: string;
  link: string;
  filename?: string;
  caption?: string;
  context?: Partial<WhatsAppSendContext>;
}

export interface SendImageParams {
  to: string;
  link: string;
  caption?: string;
  context?: Partial<WhatsAppSendContext>;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: string;
  index?: string;
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
    image?: { link: string };
    document?: { link: string; filename?: string };
  }>;
}

export interface WhatsAppSendResult {
  success: boolean;
  metaMessageId?: string;
  phoneNumberId?: string;
  errorCode?: string;
  errorMessage?: string;
  mocked?: boolean;
}

export interface WhatsAppMessageLogRecord {
  id: string;
  tenant_id: string | null;
  customer_id: string | null;
  invoice_id: string | null;
  receipt_id: string | null;
  message_type: WhatsAppMessageType;
  recipient_phone: string;
  phone_number_id: string | null;
  template_name: string | null;
  meta_message_id: string | null;
  status: WhatsAppMessageStatus;
  meta_status: string | null;
  error_code: string | null;
  error_message: string | null;
  idempotency_key: string | null;
  payload: Record<string, unknown> | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppWebhookEventRecord {
  id: string;
  event_id: string;
  event_type: string;
  meta_message_id: string | null;
  phone_number_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string;
  created_at: string;
}
