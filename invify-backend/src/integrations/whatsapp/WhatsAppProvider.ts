import {
  SendDocumentParams,
  SendImageParams,
  SendTemplateParams,
  SendTextParams,
  WhatsAppSendResult,
} from './types';

/**
 * Channel-agnostic WhatsApp provider contract.
 * MetaWhatsAppProvider is the Phase-1 implementation; tenant WABAs can plug in later.
 */
export interface WhatsAppProvider {
  sendTextMessage(params: SendTextParams): Promise<WhatsAppSendResult>;
  sendTemplateMessage(params: SendTemplateParams): Promise<WhatsAppSendResult>;
  sendDocumentMessage(params: SendDocumentParams): Promise<WhatsAppSendResult>;
  sendImageMessage(params: SendImageParams): Promise<WhatsAppSendResult>;
}
