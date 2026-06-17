import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export class WhatsAppService {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly accessToken = process.env.META_ACCESS_TOKEN;

  public async sendOtpTemplate(to: string, otp: string): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('[WhatsAppService] Missing META_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
      // For local development, pretend it sent
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[WhatsAppService] (Dev) OTP ${otp} would be sent to ${to}`);
        return true;
      }
      throw new Error('WhatsApp configuration missing');
    }

    try {
      // Normalize phone number: remove any '+' and leading zeros if needed
      const normalizedPhone = to.replace(/\+/g, '');

      const payload = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: 'invify_auth_otp', // Assuming a registered template name
          language: {
            code: 'en'
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: otp }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: otp }
              ]
            }
          ]
        }
      };

      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[WhatsAppService] Successfully sent OTP template to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`[WhatsAppService] Failed to send OTP to ${to}:`, error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }
}

export const whatsappService = new WhatsAppService();
