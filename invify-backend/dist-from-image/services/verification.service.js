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
exports.verificationService = exports.VerificationService = void 0;
const bcrypt = __importStar(require("bcrypt"));
const supabase_1 = require("../db/supabase");
const email_service_1 = require("./email.service");
const whatsapp_service_1 = require("./whatsapp.service");
class VerificationService {
    OTP_LENGTH = 6;
    OTP_EXPIRY_MINUTES = 10;
    MAX_RETRIES = 5;
    generateOTP() {
        const min = Math.pow(10, this.OTP_LENGTH - 1);
        const max = Math.pow(10, this.OTP_LENGTH) - 1;
        return Math.floor(min + Math.random() * (max - min + 1)).toString();
    }
    static normalizePurpose(purpose) {
        if (!purpose)
            return 'SIGNUP';
        const upper = String(purpose).trim().toUpperCase();
        if (upper === 'ONBOARDING' || upper === 'SIGNUP')
            return 'SIGNUP';
        if (['PASSWORD_RESET', 'LOGIN', 'PHONE_CHANGE', 'EMAIL_CHANGE'].includes(upper)) {
            return upper;
        }
        return 'SIGNUP';
    }
    async sendOTP(identifier, // Email or Phone
    channel, purpose, tenantId, options) {
        const safePurpose = VerificationService.normalizePurpose(purpose);
        const normalized = channel === 'EMAIL' ? identifier.trim().toLowerCase() : identifier.trim();
        const email = channel === 'EMAIL' ? normalized : null;
        const phone = channel === 'WHATSAPP' ? normalized : null;
        const { data: existingRows } = await supabase_1.supabaseAdmin
            .from('verification_codes')
            .select('id, expires_at, code')
            .eq(channel === 'EMAIL' ? 'email' : 'phone', normalized)
            .eq('channel', channel)
            .eq('purpose', safePurpose)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1);
        const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;
        if (options?.reuseIfPending &&
            existing &&
            existing.expires_at &&
            new Date(existing.expires_at) > new Date()) {
            return true;
        }
        const rawOtp = this.generateOTP();
        const variant = require('../config/build-variant').BuildVariantService.getInstance();
        if (variant.isLocal() && process.env.LOG_OTP_IN_LOCAL === 'true') {
            console.log(`[LOCAL OTP] Generated OTP for ${identifier} (value redacted unless LOG_OTP_IN_LOCAL explicitly used)`);
            console.log(`[LOCAL OTP] code=${rawOtp}`);
        }
        const saltRounds = 10;
        const hashedOtp = await bcrypt.hash(rawOtp, saltRounds);
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
        const payload = {
            tenant_id: tenantId || null,
            email,
            phone,
            code: hashedOtp,
            // Support-only plaintext for Verification Log (cleared on verify/expire/cancel).
            plain_code: rawOtp,
            channel,
            purpose: safePurpose,
            status: 'PENDING',
            attempt_count: 0,
            expires_at: expiresAt,
        };
        const { data: inserted, error: insertError } = await supabase_1.supabaseAdmin
            .from('verification_codes')
            .insert(payload)
            .select('id')
            .maybeSingle();
        if (insertError || !inserted?.id) {
            console.error('[VerificationService] Database error saving OTP:', insertError);
            throw new Error('Failed to save verification code');
        }
        let sent = false;
        try {
            if (channel === 'EMAIL') {
                if (safePurpose === 'PASSWORD_RESET') {
                    sent = await email_service_1.emailService.sendPasswordResetCode(normalized, rawOtp);
                }
                else {
                    sent = await email_service_1.emailService.sendVerificationCode(normalized, rawOtp);
                }
            }
            else if (channel === 'WHATSAPP') {
                sent = await whatsapp_service_1.whatsappService.sendOtpTemplate(normalized, rawOtp);
            }
        }
        catch (sendErr) {
            console.error('[VerificationService] OTP delivery failed:', sendErr?.message || sendErr);
            sent = false;
        }
        if (!sent) {
            await supabase_1.supabaseAdmin
                .from('verification_codes')
                .update({ status: 'CANCELLED', plain_code: null })
                .eq('id', inserted.id);
            throw new Error(channel === 'EMAIL'
                ? 'Could not send the verification email. Please try again.'
                : 'Could not send the WhatsApp verification code. Please try again.');
        }
        await supabase_1.supabaseAdmin
            .from('verification_codes')
            .update({ status: 'CANCELLED', plain_code: null })
            .match({
            channel,
            purpose: safePurpose,
            status: 'PENDING',
        })
            .eq(channel === 'EMAIL' ? 'email' : 'phone', normalized)
            .neq('id', inserted.id);
        return true;
    }
    async verifyOTP(identifier, code, channel, purpose) {
        const result = await this.verifyOTPDetailed(identifier, code, channel, purpose);
        return result.ok;
    }
    async verifyOTPDetailed(identifier, code, channel, purpose) {
        const safePurpose = VerificationService.normalizePurpose(purpose);
        const normalized = channel === 'EMAIL' ? identifier.trim().toLowerCase() : identifier.trim();
        const { data: pendingRows, error } = await supabase_1.supabaseAdmin
            .from('verification_codes')
            .select('*')
            .eq(channel === 'EMAIL' ? 'email' : 'phone', normalized)
            .eq('channel', channel)
            .eq('purpose', safePurpose)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) {
            console.warn(`[VerificationService] Lookup error for ${normalized}:`, error.message);
            return { ok: false, error: 'Unable to verify code right now. Please try again.' };
        }
        const record = Array.isArray(pendingRows) ? pendingRows[0] : pendingRows;
        if (!record) {
            const recentVerified = await this.findRecentVerified(normalized, channel, safePurpose);
            if (recentVerified) {
                return { ok: true };
            }
            console.warn(`[VerificationService] No pending OTP found for ${normalized}`);
            return {
                ok: false,
                error: 'No pending code found. Tap Resend OTP, then enter the newest code.',
            };
        }
        // Check expiry
        const now = new Date();
        if (new Date(record.expires_at) < now) {
            await supabase_1.supabaseAdmin
                .from('verification_codes')
                .update({ status: 'EXPIRED', plain_code: null })
                .eq('id', record.id);
            return { ok: false, error: 'Code expired. Tap Resend OTP for a new one.' };
        }
        // Check attempt limit
        if (record.attempt_count >= this.MAX_RETRIES) {
            await supabase_1.supabaseAdmin
                .from('verification_codes')
                .update({ status: 'CANCELLED', plain_code: null })
                .eq('id', record.id);
            return { ok: false, error: 'Too many attempts. Tap Resend OTP for a new code.' };
        }
        // Increment attempt count
        await supabase_1.supabaseAdmin
            .from('verification_codes')
            .update({ attempt_count: (record.attempt_count || 0) + 1 })
            .eq('id', record.id);
        // Verify bcrypt hash (and plaintext fallback for legacy rows)
        let isValid = false;
        try {
            isValid = await bcrypt.compare(code, record.code);
        }
        catch (_) {
            isValid = false;
        }
        if (!isValid && record.code === code) {
            isValid = true;
        }
        if (isValid) {
            const { error: verifyUpdateError } = await supabase_1.supabaseAdmin
                .from('verification_codes')
                .update({
                status: 'VERIFIED',
                verified_at: new Date().toISOString(),
                plain_code: null,
            })
                .eq('id', record.id);
            // If verified_at column is missing, still mark VERIFIED so reset can proceed
            if (verifyUpdateError) {
                console.warn('[VerificationService] VERIFIED update with verified_at failed:', verifyUpdateError.message);
                const { error: fallbackError } = await supabase_1.supabaseAdmin
                    .from('verification_codes')
                    .update({ status: 'VERIFIED', plain_code: null })
                    .eq('id', record.id);
                if (fallbackError) {
                    console.warn('[VerificationService] VERIFIED fallback update failed:', fallbackError.message);
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
    async findRecentVerified(normalized, channel, purpose) {
        const { data: rows, error } = await supabase_1.supabaseAdmin
            .from('verification_codes')
            .select('verified_at, created_at, expires_at')
            .eq(channel === 'EMAIL' ? 'email' : 'phone', normalized)
            .eq('channel', channel)
            .eq('purpose', purpose)
            .eq('status', 'VERIFIED')
            .order('created_at', { ascending: false })
            .limit(1);
        if (error)
            return false;
        const record = Array.isArray(rows) ? rows[0] : rows;
        if (!record)
            return false;
        const now = Date.now();
        const verifiedAt = record.verified_at ? new Date(record.verified_at).getTime() : 0;
        const createdAt = record.created_at ? new Date(record.created_at).getTime() : 0;
        const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0;
        const anchor = verifiedAt || createdAt;
        const withinVerifyWindow = anchor > 0 && now - anchor < 15 * 60 * 1000;
        const notPastOriginalExpiry = !expiresAt || now <= expiresAt + 5 * 60 * 1000;
        return withinVerifyWindow && notPastOriginalExpiry;
    }
    /**
     * True if this email just completed PASSWORD_RESET OTP verification
     * (within expiry window). Used so UI can verify first, then set password.
     */
    async hasFreshPasswordResetVerification(email) {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized)
            return false;
        const { data: record, error } = await supabase_1.supabaseAdmin
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
        if (!record)
            return false;
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
exports.VerificationService = VerificationService;
exports.verificationService = new VerificationService();
//# sourceMappingURL=verification.service.js.map