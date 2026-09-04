import * as bcrypt from 'bcrypt';
import { supabaseAdmin as supabase } from '../db/supabase';
import { emailService } from './email.service';
import { whatsappService } from './whatsapp.service';

export type ChannelType = 'EMAIL' | 'WHATSAPP';
export type PurposeType = 'SIGNUP' | 'PASSWORD_RESET' | 'LOGIN' | 'PHONE_CHANGE' | 'EMAIL_CHANGE';

export class VerificationService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_RETRIES = 5;

  private generateOTP(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  public static normalizePurpose(purpose?: string): PurposeType {
    if (!purpose) return 'SIGNUP';
    const upper = String(purpose).trim().toUpperCase();
    if (upper === 'ONBOARDING' || upper === 'SIGNUP') return 'SIGNUP';
    if (['PASSWORD_RESET', 'LOGIN', 'PHONE_CHANGE', 'EMAIL_CHANGE'].includes(upper)) {
      return upper as PurposeType;
    }
    return 'SIGNUP';
  }

  public async sendOTP(
    identifier: string, // Email or Phone
    channel: ChannelType,
    purpose: PurposeType | string,
    tenantId?: string
  ): Promise<boolean> {
    const safePurpose = VerificationService.normalizePurpose(purpose);
    const rawOtp = this.generateOTP();
    const variant = require('../config/build-variant').BuildVariantService.getInstance();
    if (variant.isLocal() && process.env.LOG_OTP_IN_LOCAL === 'true') {
      console.log(`[LOCAL OTP] Generated OTP for ${identifier} (value redacted unless LOG_OTP_IN_LOCAL explicitly used)`);
      console.log(`[LOCAL OTP] code=${rawOtp}`);
    }
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(rawOtp, saltRounds);
    
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const normalized =
      channel === 'EMAIL' ? identifier.trim().toLowerCase() : identifier.trim();
    const email = channel === 'EMAIL' ? normalized : null;
    const phone = channel === 'WHATSAPP' ? normalized : null;

    // Check if there's a recent PENDING OTP for the same channel & identifier to handle Resend Cooldown
    // Rate limiting (60s cooldown, 5/hr max sends) can be done via DB queries here or via express-rate-limit 
    // we use express-rate-limit for basic stuff, but checking DB is safer.

    // Upsert or insert into verification_codes
    // If an active one exists, we could just invalidate it or overwrite.
    // We will cancel old pending requests for this channel/identifier/purpose
    const { error: cancelError } = await supabase
      .from('verification_codes')
      .update({ status: 'CANCELLED' })
      .match({ 
         channel, 
         purpose: safePurpose, 
         status: 'PENDING' 
      })
      .eq(channel === 'EMAIL' ? 'email' : 'phone', normalized);

    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        tenant_id: tenantId || null,
        email,
        phone,
        code: hashedOtp,
        channel,
        purpose: safePurpose,
        status: 'PENDING',
        attempt_count: 0,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error('[VerificationService] Database error saving OTP:', insertError);
      throw new Error('Failed to save verification code');
    }

    // Delegate to actual sender
    let sent = false;
    if (channel === 'EMAIL') {
      if (safePurpose === 'PASSWORD_RESET') {
        sent = await emailService.sendPasswordResetCode(normalized, rawOtp);
      } else {
        sent = await emailService.sendVerificationCode(normalized, rawOtp);
      }
    } else if (channel === 'WHATSAPP') {
      sent = await whatsappService.sendOtpTemplate(normalized, rawOtp);
    }

    return sent;
  }

  public async verifyOTP(
    identifier: string,
    code: string,
    channel: ChannelType,
    purpose: PurposeType | string
  ): Promise<boolean> {
    const result = await this.verifyOTPDetailed(identifier, code, channel, purpose);
    return result.ok;
  }

  public async verifyOTPDetailed(
    identifier: string,
    code: string,
    channel: ChannelType,
    purpose: PurposeType | string
  ): Promise<{ ok: boolean; error?: string }> {
    const safePurpose = VerificationService.normalizePurpose(purpose);
    const normalized =
      channel === 'EMAIL' ? identifier.trim().toLowerCase() : identifier.trim();

    // Find the pending OTP
    const { data: record, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq(channel === 'EMAIL' ? 'email' : 'phone', normalized)
      .eq('channel', channel)
      .eq('purpose', safePurpose)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[VerificationService] Lookup error for ${normalized}:`, error.message);
      return { ok: false, error: 'Unable to verify code right now. Please try again.' };
    }

    if (!record) {
      console.warn(`[VerificationService] No pending OTP found for ${normalized}`);
      return {
        ok: false,
        error: 'No pending code found. Tap Resend OTP, then enter the newest code.',
      };
    }

    // Check expiry
    const now = new Date();
    if (new Date(record.expires_at) < now) {
      await supabase.from('verification_codes').update({ status: 'EXPIRED' }).eq('id', record.id);
      return { ok: false, error: 'Code expired. Tap Resend OTP for a new one.' };
    }

    // Check attempt limit
    if (record.attempt_count >= this.MAX_RETRIES) {
      await supabase.from('verification_codes').update({ status: 'CANCELLED' }).eq('id', record.id);
      return { ok: false, error: 'Too many attempts. Tap Resend OTP for a new code.' };
    }

    // Increment attempt count
    await supabase
      .from('verification_codes')
      .update({ attempt_count: (record.attempt_count || 0) + 1 })
      .eq('id', record.id);

    // Verify bcrypt hash (and plaintext fallback for legacy rows)
    let isValid = false;
    try {
      isValid = await bcrypt.compare(code, record.code);
    } catch (_) {
      isValid = false;
    }
    if (!isValid && record.code === code) {
      isValid = true;
    }

    if (isValid) {
      const { error: verifyUpdateError } = await supabase
        .from('verification_codes')
        .update({
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      // If verified_at column is missing, still mark VERIFIED so reset can proceed
      if (verifyUpdateError) {
        console.warn(
          '[VerificationService] VERIFIED update with verified_at failed:',
          verifyUpdateError.message,
        );
        const { error: fallbackError } = await supabase
          .from('verification_codes')
          .update({ status: 'VERIFIED' })
          .eq('id', record.id);
        if (fallbackError) {
          console.warn(
            '[VerificationService] VERIFIED fallback update failed:',
            fallbackError.message,
          );
          return {
            ok: false,
            error: 'Unable to complete verification. Please request a new OTP.',
          };
        }
      }
      return { ok: true };
    }

    return { ok: false, error: 'Incorrect code. Check the latest email and try again.' };
  }

  /**
   * True if this email just completed PASSWORD_RESET OTP verification
   * (within expiry window). Used so UI can verify first, then set password.
   */
  public async hasFreshPasswordResetVerification(email: string): Promise<boolean> {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return false;

    const { data: record, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', normalized)
      .eq('channel', 'EMAIL')
      .eq('purpose', 'PASSWORD_RESET')
      .eq('status', 'VERIFIED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[VerificationService] hasFreshPasswordResetVerification:', error.message);
      return false;
    }
    if (!record) return false;

    const now = Date.now();
    const verifiedAt = record.verified_at
      ? new Date(record.verified_at).getTime()
      : 0;
    const createdAt = record.created_at ? new Date(record.created_at).getTime() : 0;
    const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0;
    // Prefer verified_at; fall back to created_at if column missing/null
    const anchor = verifiedAt || createdAt;
    const withinVerifyWindow = anchor > 0 && now - anchor < 15 * 60 * 1000;
    const notPastOriginalExpiry = !expiresAt || now <= expiresAt + 5 * 60 * 1000;
    return withinVerifyWindow && notPastOriginalExpiry;
  }
}

export const verificationService = new VerificationService();
