import { MetaWhatsAppProvider, WhatsAppConfig, metaWhatsAppProvider } from '../integrations/whatsapp';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

/**
 * Legacy WhatsAppService façade kept for VerificationService / OTP routes.
 * Delegates to MetaWhatsAppProvider + WhatsAppNotificationService.
 * Do not remove — preserves existing auth WhatsApp OTP behaviour.
 */
export class WhatsAppService {
  private provider: MetaWhatsAppProvider = metaWhatsAppProvider;

  public async sendOtpTemplate(to: string, otp: string, tenantId?: string): Promise<boolean> {
    const result = await WhatsAppNotificationService.sendOtp({
      recipientPhone: to,
      otp,
      tenantId,
    });

    if (!result.success && process.env.NODE_ENV === 'production') {
      throw new Error(result.errorMessage || 'Failed to send WhatsApp message');
    }

    if (!result.success) {
      console.warn(
        `[WhatsAppService] OTP send failed (non-prod soft-fail) phone=${WhatsAppConfig.maskPhone(to)} code=${result.errorCode || '-'}`
      );
      return process.env.NODE_ENV !== 'production';
    }

    return true;
  }

  public async sendTextMessage(to: string, body: string, tenantId?: string) {
    return this.provider.sendTextMessage({
      to,
      body,
      context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to },
    });
  }

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    components: any[] = [],
    tenantId?: string
  ) {
    return this.provider.sendTemplateMessage({
      to,
      templateName,
      components,
      context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to, templateName },
    });
  }

  public async sendDocumentMessage(to: string, link: string, filename?: string, caption?: string, tenantId?: string) {
    return this.provider.sendDocumentMessage({
      to,
      link,
      filename,
      caption,
      context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to },
    });
  }

  public async sendImageMessage(to: string, link: string, caption?: string, tenantId?: string) {
    return this.provider.sendImageMessage({
      to,
      link,
      caption,
      context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to },
    });
  }
}

export const whatsappService = new WhatsAppService();
