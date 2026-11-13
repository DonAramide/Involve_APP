"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyTransferAuthController = void 0;
const otplib_1 = require("otplib");
const supabase_1 = require("../db/supabase");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
const ADMIN_ROLES = new Set([
    'owner',
    'tenant_admin',
    'admin',
    'school_admin',
    'administrator',
    'admin_finance',
    'admin_treasury',
]);
function verifyTotp(token, secret) {
    const previous = otplib_1.authenticator.options.window;
    otplib_1.authenticator.options.window = 1;
    try {
        return otplib_1.authenticator.verify({ token, secret });
    }
    finally {
        otplib_1.authenticator.options.window = previous;
    }
}
/**
 * Staff confirm a company-bank payment only after an admin reads the
 * current authenticator code and gives it to them.
 */
class CompanyTransferAuthController {
    static async authorize(req, res) {
        try {
            const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
            if (!tenantId) {
                return res.status(400).json({ error: 'School not found for this device.' });
            }
            const otp = String(req.body?.otp || '').replace(/\D/g, '');
            if (otp.length !== 6) {
                return res.status(403).json({
                    code: 'MFA_REQUIRED',
                    error: 'Ask the school admin for the current 6-digit authenticator code.',
                });
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('users')
                .select('role, mfa_enabled, mfa_secret')
                .eq('tenant_id', tenantId)
                .eq('mfa_enabled', true);
            if (error) {
                console.error('[CompanyTransferAuth] lookup failed:', error.message);
                return res.status(500).json({ error: 'Could not check admin 2FA.' });
            }
            const admins = (data || []).filter((row) => {
                const role = String(row.role || '').trim().toLowerCase();
                return ADMIN_ROLES.has(role) && row.mfa_secret;
            });
            if (admins.length === 0) {
                return res.status(403).json({
                    code: 'MFA_NOT_ENABLED',
                    error: 'The school admin must turn on 2FA in System Setup, Security, 2FA Settings before a company-account payment can be confirmed.',
                });
            }
            const matched = admins.some((row) => verifyTotp(otp, String(row.mfa_secret)));
            if (!matched) {
                return res.status(403).json({
                    code: 'INVALID_MFA',
                    error: 'That code is not valid. Ask the admin for the live 6-digit code from their authenticator app.',
                });
            }
            return res.status(200).json({ authorized: true });
        }
        catch (err) {
            console.error('[CompanyTransferAuth] Error:', err?.message || err);
            return res.status(500).json({ error: 'Admin 2FA check failed.' });
        }
    }
}
exports.CompanyTransferAuthController = CompanyTransferAuthController;
//# sourceMappingURL=company-transfer-auth.controller.js.map