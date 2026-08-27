// src/services/otp.service.ts
import { supabase } from '../db/supabase';

export class OTPService {
  /**
   * Generates a 6-digit OTP and stores it in the database with an expiry.
   */
  static async generateOTP(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const { error } = await supabase
      .from('verification_codes')
      .upsert({ 
        phone, 
        code, 
        expires_at: expiresAt.toISOString(),
        used: false
      }, { onConflict: 'phone' });

    if (error) throw error;

    // Placeholder for WhatsApp API integration
    await this.sendWhatsAppOTP(phone, code);

    return code;
  }

  /**
   * Verifies the OTP provided by the user.
   */
  static async verifyOTP(phone: string, code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .single();

    if (error || !data) return false;

    const isExpired = new Date(data.expires_at) < new Date();
    if (isExpired) return false;

    // Mark as used
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', data.id);

    return true;
  }

  /**
   * Placeholder for sending WhatsApp message via a provider like Twilio or Termii.
   */
  private static async sendWhatsAppOTP(phone: string, code: string) {
    const variant = require('../config/build-variant').BuildVariantService.getInstance();

    if (variant.isProd() || process.env.NODE_ENV === 'production') {
      // Production must use a real provider — fail closed if not configured
      if (!process.env.TERMII_API_KEY && !process.env.WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp/SMS OTP provider is not configured for production');
      }
    }

    if (variant.isLocal() && process.env.MOCK_WHATSAPP_OTP !== 'false') {
      if (process.env.LOG_OTP_IN_LOCAL === 'true') {
        console.log('[LOCAL] WhatsApp OTP mock delivery (OTP value logged only because LOG_OTP_IN_LOCAL=true)');
        console.log(`[LOCAL] To=${phone} Code=${code}`);
      } else {
        console.log(`[LOCAL] WhatsApp OTP mock delivery queued for ${phone} (code not logged)`);
      }
      return true;
    }

    // Staging/prod: prefer configured Meta/Termii paths via whatsapp service when available
    try {
      const { whatsappService } = require('./whatsapp.service');
      if (whatsappService?.sendText) {
        await whatsappService.sendText(phone, `Your Invify verification code is: ${code}. Valid for 10 mins.`);
        return true;
      }
    } catch (err: any) {
      console.error('[OTPService] Provider send failed:', err?.message || err);
      if (variant.isStaging() || variant.isProd()) {
        throw err;
      }
    }

    if (variant.isLocal()) {
      return true;
    }
    throw new Error('OTP delivery provider unavailable');
  }
}
