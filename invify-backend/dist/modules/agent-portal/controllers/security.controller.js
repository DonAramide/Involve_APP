"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityController = void 0;
const supabase_1 = require("../../../db/supabase");
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
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { data: agent } = await supabase_1.supabase.from('agents').select('id, email').eq('auth_user_id', authUserId).single();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let secret = '';
            for (let i = 0; i < 32; i++) {
                secret += chars[Math.floor(Math.random() * chars.length)];
            }
            await supabase_1.supabase.from('agent_profiles').update({ mfa_secret: secret }).eq('agent_id', agent.id);
            const otpauthUrl = `otpauth://totp/Invify:${agent.email || 'agent'}?secret=${secret}&issuer=Invify`;
            await supabase_1.supabase.from('agent_security_events').insert({
                agent_id: agent.id,
                event_type: 'MFA_SETUP_STARTED',
                ip_address: req.ip || '',
                browser: req.headers['user-agent'] || ''
            });
            res.status(200).json({ success: true, message: 'MFA secret generated', secret, qrCodeUri: otpauthUrl });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async verifyMfa(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const { code } = req.body;
            if (!code || code.length < 6)
                return res.status(400).json({ success: false, message: 'Invalid MFA code' });
            await supabase_1.supabase.from('agent_profiles').update({ mfa_enabled: true }).eq('agent_id', agent.id);
            await supabase_1.supabase.from('agent_security_events').insert({
                agent_id: agent.id,
                event_type: 'MFA_VERIFIED',
                ip_address: req.ip || '',
                browser: req.headers['user-agent'] || ''
            });
            res.status(200).json({ success: true, message: 'MFA verified and enabled successfully' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async disableMfa(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            await supabase_1.supabase.from('agent_profiles').update({ mfa_enabled: false, mfa_secret: null }).eq('agent_id', agent.id);
            await supabase_1.supabase.from('agent_security_events').insert({
                agent_id: agent.id,
                event_type: 'MFA_DISABLED',
                ip_address: req.ip || '',
                browser: req.headers['user-agent'] || ''
            });
            res.status(200).json({ success: true, message: 'MFA disabled' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getSessions(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const { data, error } = await supabase_1.supabase.from('agent_sessions').select('*').eq('agent_id', agent.id);
            // Also grab login history
            const { data: history } = await supabase_1.supabase.from('agent_security_events').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(10);
            res.status(200).json({ success: true, data: { sessions: data || [], history: history || [] } });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async revokeSession(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { id } = req.params;
            await supabase_1.supabase.from('agent_sessions').update({ status: 'REVOKED' }).eq('id', id);
            res.status(200).json({ success: true, message: 'Session revoked' });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.SecurityController = SecurityController;
//# sourceMappingURL=security.controller.js.map