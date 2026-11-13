"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityController = void 0;
const otplib_1 = require("otplib");
const supabase_1 = require("../../../db/supabase");
const profile_service_1 = require("../services/profile.service");
function verifyTotp(token, secret) {
    const previous = otplib_1.authenticator.options.window;
    otplib_1.authenticator.options.window = 1;
    try {
        return otplib_1.authenticator.verify({
            token: String(token || '').replace(/\D/g, ''),
            secret,
        });
    }
    finally {
        otplib_1.authenticator.options.window = previous;
    }
}
async function resolveAgent(req) {
    const user = req.user || {};
    return profile_service_1.profileService.findAgent(user.id, user.email);
}
async function audit(agentId, eventType, req) {
    try {
        await supabase_1.supabaseAdmin.from('agent_security_events').insert({
            agent_id: agentId,
            event_type: eventType,
            ip_address: req.ip || '',
            browser: req.headers['user-agent'] || '',
        });
    }
    catch {
        /* optional table */
    }
}
async function loadProfile(agentId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('agent_profiles')
        .select('agent_id, mfa_enabled, mfa_secret')
        .eq('agent_id', agentId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
}
async function saveProfile(agentId, patch) {
    const existing = await loadProfile(agentId);
    const next = { ...patch, updated_at: new Date().toISOString() };
    if (existing) {
        const { error } = await supabase_1.supabaseAdmin.from('agent_profiles').update(next).eq('agent_id', agentId);
        if (error)
            throw new Error(error.message);
        return;
    }
    const { error } = await supabase_1.supabaseAdmin.from('agent_profiles').insert({
        agent_id: agentId,
        ...next,
    });
    if (error)
        throw new Error(error.message);
}
class SecurityController {
    static async changePassword(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { new_password } = req.body;
            const { error } = await supabase_1.supabase.auth.admin.updateUserById(authUserId, { password: new_password });
            if (error)
                throw error;
            res.status(200).json({ success: true, message: 'Password updated successfully' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async enableMfa(req, res) {
        try {
            const agent = await resolveAgent(req);
            const secret = otplib_1.authenticator.generateSecret();
            await saveProfile(agent.id, { mfa_secret: secret, mfa_enabled: false });
            const label = agent.email || agent.agent_code || 'institute';
            const otpauthUrl = otplib_1.authenticator.keyuri(String(label), 'Invify Institute', secret);
            await audit(agent.id, 'MFA_SETUP_STARTED', req);
            res.status(200).json({
                success: true,
                message: 'Scan the QR code, then enter the 6-digit authenticator code.',
                secret,
                qrCodeUri: otpauthUrl,
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message || 'Failed to start 2FA setup' });
        }
    }
    static async verifyMfa(req, res) {
        try {
            const agent = await resolveAgent(req);
            const profile = await loadProfile(agent.id);
            const code = String(req.body?.code || '').replace(/\D/g, '');
            if (!profile?.mfa_secret) {
                return res.status(400).json({ success: false, message: 'Start 2FA setup before verifying.' });
            }
            if (!verifyTotp(code, profile.mfa_secret)) {
                return res.status(400).json({ success: false, message: 'Invalid 2FA code. Use the live 6-digit code from your authenticator app.' });
            }
            await saveProfile(agent.id, { mfa_enabled: true });
            await audit(agent.id, 'MFA_VERIFIED', req);
            res.status(200).json({ success: true, message: '2FA enabled' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message || 'Failed to verify 2FA' });
        }
    }
    static async confirmLoginMfa(req, res) {
        try {
            const agent = await resolveAgent(req);
            const profile = await loadProfile(agent.id);
            if (!profile?.mfa_enabled || !profile.mfa_secret) {
                return res.status(400).json({ success: false, message: '2FA is not enabled on this Institute account.' });
            }
            const code = String(req.body?.code || '').replace(/\D/g, '');
            if (!verifyTotp(code, profile.mfa_secret)) {
                return res.status(401).json({ success: false, message: 'Invalid 2FA code.' });
            }
            await audit(agent.id, 'MFA_LOGIN_VERIFIED', req);
            res.status(200).json({ success: true, message: '2FA verified' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message || 'Failed to verify 2FA login' });
        }
    }
    static async disableMfa(req, res) {
        try {
            const agent = await resolveAgent(req);
            const profile = await loadProfile(agent.id);
            const code = String(req.body?.code || '').replace(/\D/g, '');
            if (profile?.mfa_enabled && profile.mfa_secret) {
                if (!verifyTotp(code, profile.mfa_secret)) {
                    return res.status(400).json({ success: false, message: 'Enter a valid authenticator code to disable 2FA.' });
                }
            }
            await saveProfile(agent.id, { mfa_enabled: false, mfa_secret: null });
            await audit(agent.id, 'MFA_DISABLED', req);
            res.status(200).json({ success: true, message: '2FA disabled' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message || 'Failed to disable 2FA' });
        }
    }
    static async getSessions(req, res) {
        try {
            const agent = await resolveAgent(req);
            const { data, error } = await supabase_1.supabaseAdmin.from('agent_sessions').select('*').eq('agent_id', agent.id);
            if (error)
                throw error;
            const { data: history } = await supabase_1.supabaseAdmin
                .from('agent_security_events')
                .select('*')
                .eq('agent_id', agent.id)
                .order('created_at', { ascending: false })
                .limit(10);
            res.status(200).json({ success: true, data: { sessions: data || [], history: history || [] } });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async revokeSession(req, res) {
        try {
            const agent = await resolveAgent(req);
            const { id } = req.params;
            await supabase_1.supabaseAdmin.from('agent_sessions').update({ status: 'REVOKED' }).eq('id', id).eq('agent_id', agent.id);
            res.status(200).json({ success: true, message: 'Session revoked' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.SecurityController = SecurityController;
//# sourceMappingURL=security.controller.js.map