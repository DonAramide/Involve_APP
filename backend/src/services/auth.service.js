// backend/src/services/auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'invify-fintech-fallback-secret-2026';
const MASTER_MODE_SECRET = process.env.MASTER_MODE_SECRET || 'invify-master-elevation-key';

class AuthService {
    /**
     * Authenticate user and return tokens
     */
    static async login(email, password) {
        const { data: user, error } = await supabase
            .from('invify_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) throw new Error('Invalid credentials');

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Invalid credentials');

        // Check if 2FA is required
        if (user.role === 'SUPER_ADMIN' && user.is_2fa_enabled) {
            return { requires2FA: true, userId: user.id };
        }

        const token = this.generateToken(user);
        const refreshToken = this.generateRefreshToken(user);

        return { token, refreshToken, user: this.sanitizeUser(user) };
    }

    /**
     * Generate standard JWT
     */
    static generateToken(user, isMasterMode = false) {
        return jwt.sign(
            {
                userId: user.id,
                tenantId: user.tenant_id,
                role: user.role,
                isMasterMode
            },
            isMasterMode ? MASTER_MODE_SECRET : JWT_SECRET,
            { expiresIn: isMasterMode ? '15m' : '2h' }
        );
    }

    static generateRefreshToken(user) {
        return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    }

    /**
     * Elevate to Master Mode
     */
    static async enterMasterMode(userId, password, otp = null) {
        const { data: user, error } = await supabase
            .from('invify_users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) throw new Error('User not found');

        // 1. Password Verification
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Incorrect password for elevation');

        // 2. OTP Verification (if enabled)
        if (user.is_2fa_enabled && otp) {
            const verified = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: 'base32',
                token: otp
            });
            if (!verified) throw new Error('Invalid 2FA code');
        }

        // Return elevated token
        return this.generateToken(user, true);
    }

    /**
     * Setup TOTP for user
     */
    static async generateTOTPSetup(userId) {
        const secret = speakeasy.generateSecret({ name: `Invify:${userId}` });
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        
        await supabase
            .from('invify_users')
            .update({ totp_secret: secret.base32 })
            .eq('id', userId);

        return { qrCodeUrl, secret: secret.base32 };
    }

    static sanitizeUser(user) {
        const { password_hash, totp_secret, ...safeUser } = user;
        return safeUser;
    }
}

module.exports = AuthService;
