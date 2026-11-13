"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.OTPService = void 0;
// src/services/otp.service.ts
const bcrypt = __importStar(require("bcrypt"));
const supabase_1 = require("../db/supabase");
const MAX_OTP_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 10;
class OTPService {
    /**
     * Generates a 6-digit OTP, hashes it with bcrypt, and stores it in the database.
     */
    static async generateOTP(phone) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); // 10 minutes expiry
        const hashedCode = await bcrypt.hash(code, 10);
        const payload = {
            phone,
            code: hashedCode,
            plain_code: code,
            expires_at: expiresAt.toISOString(),
            used: false,
            attempt_count: 0,
            status: 'PENDING',
            channel: 'WHATSAPP',
            purpose: 'LOGIN',
        };
        const { error } = await supabase_1.supabase
            .from('verification_codes')
            .upsert(payload, { onConflict: 'phone' });
        if (error) {
            // If table lacks unique on phone, fall back to insert
            const { error: insertErr } = await supabase_1.supabase
                .from('verification_codes')
                .insert(payload);
            if (insertErr)
                throw insertErr;
        }
        // Deliver via WhatsApp provider
        await this.sendWhatsAppOTP(phone, code);
        return code;
    }
    /**
     * Verifies the OTP provided by the user with lockout after 5 failed attempts.
     */
    static async verifyOTPDetailed(phone, code) {
        const cleanPhone = (phone || '').trim();
        const cleanCode = (code || '').trim();
        if (!cleanPhone || !cleanCode) {
            return { ok: false, error: 'Phone and code are required' };
        }
        const { data, error } = await supabase_1.supabase
            .from('verification_codes')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error || !data) {
            return { ok: false, error: 'Invalid or expired verification code' };
        }
        const isExpired = new Date(data.expires_at) < new Date();
        if (isExpired) {
            await supabase_1.supabase
                .from('verification_codes')
                .update({ used: true, status: 'EXPIRED', plain_code: null })
                .eq('id', data.id);
            return { ok: false, error: 'Verification code has expired' };
        }
        const currentAttempts = data.attempt_count || 0;
        if (currentAttempts >= MAX_OTP_ATTEMPTS) {
            await supabase_1.supabase
                .from('verification_codes')
                .update({ used: true, status: 'CANCELLED', plain_code: null })
                .eq('id', data.id);
            return {
                ok: false,
                locked: true,
                error: 'Too many failed attempts. Please request a new verification code.',
            };
        }
        // Increment attempt count
        const newAttempts = currentAttempts + 1;
        await supabase_1.supabase
            .from('verification_codes')
            .update({ attempt_count: newAttempts })
            .eq('id', data.id);
        let isValid = false;
        try {
            isValid = await bcrypt.compare(cleanCode, data.code);
        }
        catch (_) {
            isValid = false;
        }
        // Legacy plaintext fallback
        if (!isValid && data.code === cleanCode) {
            isValid = true;
        }
        if (!isValid) {
            if (newAttempts >= MAX_OTP_ATTEMPTS) {
                await supabase_1.supabase
                    .from('verification_codes')
                    .update({ used: true, status: 'CANCELLED', plain_code: null })
                    .eq('id', data.id);
                return {
                    ok: false,
                    locked: true,
                    error: 'Too many failed attempts. Please request a new verification code.',
                };
            }
            return { ok: false, error: 'Invalid verification code' };
        }
        // Mark as used & verified
        await supabase_1.supabase
            .from('verification_codes')
            .update({
            used: true,
            status: 'VERIFIED',
            verified_at: new Date().toISOString(),
            plain_code: null,
        })
            .eq('id', data.id);
        return { ok: true };
    }
    /**
     * Verifies the OTP provided by the user.
     */
    static async verifyOTP(phone, code) {
        const result = await this.verifyOTPDetailed(phone, code);
        return result.ok;
    }
    /**
     * Placeholder for sending WhatsApp message via a provider like Twilio or Termii.
     */
    static async sendWhatsAppOTP(phone, code) {
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
            }
            else {
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
        }
        catch (err) {
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
exports.OTPService = OTPService;
exports.otpService = OTPService;
//# sourceMappingURL=otp.service.js.map