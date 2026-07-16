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
    async sendOTP(identifier, // Email or Phone
    channel, purpose, tenantId) {
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
        const { error: cancelError } = await supabase_1.supabaseAdmin
            .from('verification_codes')
            .update({ status: 'CANCELLED' })
            .match({
            channel,
            purpose,
            status: 'PENDING'
        })
            .eq(channel === 'EMAIL' ? 'email' : 'phone', identifier);
        const { error: insertError } = await supabase_1.supabaseAdmin
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
                sent = await email_service_1.emailService.sendPasswordResetCode(identifier, rawOtp);
            }
            else {
                sent = await email_service_1.emailService.sendVerificationCode(identifier, rawOtp);
            }
        }
        else if (channel === 'WHATSAPP') {
            sent = await whatsapp_service_1.whatsappService.sendOtpTemplate(identifier, rawOtp);
        }
        return sent;
    }
    async verifyOTP(identifier, code, channel, purpose) {
        // Find the pending OTP
        const { data: record, error } = await supabase_1.supabaseAdmin
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
            await supabase_1.supabaseAdmin.from('verification_codes').update({ status: 'EXPIRED' }).eq('id', record.id);
            return false;
        }
        // Check attempt limit
        if (record.attempt_count >= this.MAX_RETRIES) {
            await supabase_1.supabaseAdmin.from('verification_codes').update({ status: 'CANCELLED' }).eq('id', record.id);
            return false;
        }
        // Increment attempt count
        await supabase_1.supabaseAdmin
            .from('verification_codes')
            .update({ attempt_count: record.attempt_count + 1 })
            .eq('id', record.id);
        // Verify bcrypt hash
        const isValid = await bcrypt.compare(code, record.code);
        if (isValid) {
            await supabase_1.supabaseAdmin
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
exports.VerificationService = VerificationService;
exports.verificationService = new VerificationService();
//# sourceMappingURL=verification.service.js.map