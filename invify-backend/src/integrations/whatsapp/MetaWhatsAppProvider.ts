import { EnterpriseHttpClient } from '../../utils/http-client';
import { WhatsAppConfig } from './WhatsAppConfig';
import { WhatsAppProvider } from './WhatsAppProvider';
import {
  SendDocumentParams,
  SendImageParams,
  SendTemplateParams,
  SendTextParams,
  WhatsAppAccountConfig,
  WhatsAppSendResult,
} from './types';

/**
 * Meta WhatsApp Cloud API provider (Graph API).
 * Does not replace NotificationService (FCM) or EmailService.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private httpClient = new EnterpriseHttpClient({
    providerName: 'MetaWhatsApp',
    timeout: parseInt(process.env.WHATSAPP_TIMEOUT_MS || '10000', 10),
    maxRetries: 2,
  });

  constructor(private readonly configOverride?: WhatsAppAccountConfig) {}

  private async getConfig(tenantId?: string | null): Promise<WhatsAppAccountConfig> {
    if (this.configOverride) return this.configOverride;
    return WhatsAppConfig.resolve(tenantId);
  }

  private baseUrl(version: string): string {
    const v = version.startsWith('v') ? version : `v${version}`;
    return `https://graph.facebook.com/${v}`;
  }

  private async postMessage(
    cfg: WhatsAppAccountConfig,
    phoneNumberId: string,
    payload: Record<string, unknown>
  ): Promise<WhatsAppSendResult> {
    if (!cfg.accessToken || !phoneNumberId) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[MetaWhatsAppProvider] Missing credentials — mocking send to ${WhatsAppConfig.maskPhone(String(payload.to || ''))}`
        );
        return {
          success: true,
          metaMessageId: `mock_wamid_${Date.now()}`,
          phoneNumberId,
          mocked: true,
        };
      }
      return {
        success: false,
        phoneNumberId,
        errorCode: 'CONFIG_MISSING',
        errorMessage: 'WhatsApp configuration missing',
      };
    }

    try {
      const url = `${this.baseUrl(cfg.graphApiVersion)}/${phoneNumberId}/messages`;
      const response = await this.httpClient.post(url, payload, {
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const metaMessageId =
        response.data?.messages?.[0]?.id ||
        response.data?.messages?.[0]?.message_id ||
        undefined;

      return {
        success: true,
        metaMessageId,
        phoneNumberId,
      };
    } catch (error: any) {
      const errData = error?.response?.data?.error;
      const errorCode = String(errData?.code || error?.response?.status || 'SEND_FAILED');
      const errorMessage = String(errData?.message || error?.message || 'Failed to send WhatsApp message');
      console.error(
        `[MetaWhatsAppProvider] Send failed phone=${WhatsAppConfig.maskPhone(String(payload.to || ''))} code=${errorCode}`
      );
      return {
        success: false,
        phoneNumberId,
        errorCode,
        errorMessage,
      };
    }
  }

  async sendTextMessage(params: SendTextParams): Promise<WhatsAppSendResult> {
    const cfg = await this.getConfig(params.context?.tenantId);
    const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
    const to = WhatsAppConfig.normalizePhone(params.to);

    return this.postMessage(cfg, phoneNumberId, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: params.body },
    });
  }

  async sendTemplateMessage(params: SendTemplateParams): Promise<WhatsAppSendResult> {
    const cfg = await this.getConfig(params.context?.tenantId);
    const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
    const to = WhatsAppConfig.normalizePhone(params.to);

    return this.postMessage(cfg, phoneNumberId, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode || 'en' },
        components: params.components || [],
      },
    });
  }

  async sendDocumentMessage(params: SendDocumentParams): Promise<WhatsAppSendResult> {
    const cfg = await this.getConfig(params.context?.tenantId);
    const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
    const to = WhatsAppConfig.normalizePhone(params.to);

    return this.postMessage(cfg, phoneNumberId, {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: params.link,
        filename: params.filename,
        caption: params.caption,
      },
    });
  }

  async sendImageMessage(params: SendImageParams): Promise<WhatsAppSendResult> {
    const cfg = await this.getConfig(params.context?.tenantId);
    const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
    const to = WhatsAppConfig.normalizePhone(params.to);

    return this.postMessage(cfg, phoneNumberId, {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: params.link,
        caption: params.caption,
      },
    });
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();
