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

  public async sendOTP(
    identifier: string, // Email or Phone
    channel: ChannelType,
    purpose: PurposeType,
    tenantId?: string
  ): Promise<boolean> {
    const rawOtp = this.generateOTP();
    console.log(`[DEV OTP BYPASS] Generated OTP for ${identifier}: ${rawOtp}`);
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(rawOtp, saltRounds);
    
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const email = channel === 'EMAIL' ? identifier : null;
    const phone = channel === 'WHATSAPP' ? identifier : null;

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
         purpose, 
         status: 'PENDING' 
      })
      .eq(channel === 'EMAIL' ? 'email' : 'phone', identifier);

    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        tenant_id: tenantId || null,
        email,
        phone,
        code: hashedOtp,
        channel,
        purpose,
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
      if (purpose === 'PASSWORD_RESET') {
        sent = await emailService.sendPasswordResetCode(identifier, rawOtp);
      } else {
        sent = await emailService.sendVerificationCode(identifier, rawOtp);
      }
    } else if (channel === 'WHATSAPP') {
      sent = await whatsappService.sendOtpTemplate(identifier, rawOtp);
    }

    return sent;
  }

  public async verifyOTP(
    identifier: string,
    code: string,
    channel: ChannelType,
    purpose: PurposeType
  ): Promise<boolean> {
    // Find the pending OTP
    const { data: record, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq(channel === 'EMAIL' ? 'email' : 'phone', identifier)
      .eq('channel', channel)
      .eq('purpose', purpose)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !record) {
      console.warn(`[VerificationService] No pending OTP found for ${identifier}`);
      return false;
    }

    // Check expiry
    const now = new Date();
    if (new Date(record.expires_at) < now) {
      await supabase.from('verification_codes').update({ status: 'EXPIRED' }).eq('id', record.id);
      return false;
    }

    // Check attempt limit
    if (record.attempt_count >= this.MAX_RETRIES) {
      await supabase.from('verification_codes').update({ status: 'CANCELLED' }).eq('id', record.id);
      return false;
    }

    // Increment attempt count
    await supabase
      .from('verification_codes')
      .update({ attempt_count: record.attempt_count + 1 })
      .eq('id', record.id);

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(code, record.code);
    
    if (isValid) {
      await supabase
        .from('verification_codes')
        .update({ 
          status: 'VERIFIED',
          verified_at: new Date().toISOString()
        })
        .eq('id', record.id);
      return true;
    }

    return false;
  }
}

export const verificationService = new VerificationService();
