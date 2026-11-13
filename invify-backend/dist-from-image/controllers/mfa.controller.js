"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaController = void 0;
const supabase_1 = require("../db/supabase");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
class MfaController {
    static async generate(req, res) {
        try {
            const user = req.user;
            if (!user || !user.email) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Generate a new TOTP secret
            const secret = otplib_1.authenticator.generateSecret();
            // Generate OTP Auth URL
            const otpAuthUrl = otplib_1.authenticator.keyuri(user.email, 'Invify POS', secret);
            // Generate QR Code image data URL
            const qrCodeUrl = await qrcode_1.default.toDataURL(otpAuthUrl);
            // Save secret to database, but keep mfa_enabled as false until verified
            const { error } = await supabase_1.supabaseAdmin.from('users').update({
                mfa_secret: secret,
            }).eq('id', user.id);
            if (error) {
                console.error('[MFA Generate] DB Error:', error);
                return res.status(500).json({ error: 'Failed to prepare MFA setup' });
            }
            return res.status(200).json({ secret, qrCodeUrl });
        }
        catch (error) {
            console.error('[MFA Generate] Error:', error.message);
            return res.status(500).json({ error: 'Failed to generate MFA' });
        }
    }
    static async enable(req, res) {
        try {
            const user = req.user;
            const { code } = req.body;
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!code) {
                return res.status(400).json({ error: 'Code is required' });
            }
            const { data: dbUser, error: fetchError } = await supabase_1.supabaseAdmin
                .from('users')
                .select('mfa_secret')
                .eq('id', user.id)
                .single();
            if (fetchError || !dbUser || !dbUser.mfa_secret) {
                return res.status(400).json({ error: 'MFA setup not initialized' });
            }
            // Verify token
            const isValid = otplib_1.authenticator.verify({ token: code, secret: dbUser.mfa_secret });
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid authentication code' });
            }
            // Save as enabled
            const { error: updateError } = await supabase_1.supabaseAdmin.from('users').update({
                mfa_enabled: true
            }).eq('id', user.id);
            if (updateError) {
                console.error('[MFA Enable] DB Error:', updateError);
                return res.status(500).json({ error: 'Failed to enable MFA' });
            }
            return res.status(200).json({ success: true, message: 'MFA enabled successfully' });
        }
        catch (error) {
            console.error('[MFA Enable] Error:', error.message);
            return res.status(500).json({ error: 'Failed to enable MFA' });
        }
    }
}
exports.MfaController = MfaController;
//# sourceMappingURL=mfa.controller.js.map