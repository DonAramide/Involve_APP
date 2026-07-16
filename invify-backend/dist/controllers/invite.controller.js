"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteController = void 0;
const invite_service_1 = require("../services/invite.service");
const supabase_1 = require("../db/supabase");
class InviteController {
    /**
     * POST /admin/invites
     * Sends a teacher invitation (Tenant Admin only).
     */
    static async sendInvite(req, res) {
        try {
            const { email } = req.body;
            const { tenantId } = req.user;
            if (!email)
                return res.status(400).json({ error: 'Email is required' });
            // 1. Create Invite record (Role is now internally enforced as 'staff')
            const { invite, rawToken, isNew } = await invite_service_1.InviteService.createInvite(tenantId, email);
            // 2. Fetch School Name for email
            const { data: tenant } = await supabase_1.supabase.from('tenants').select('name').eq('id', tenantId).single();
            // 3. Generate Link & Send Notification
            const appUrl = process.env.APP_URL || 'http://localhost:9000';
            const inviteLink = `${appUrl}/#/invite/accept?token=${rawToken || 'ALREADY_SENT'}`;
            if (isNew && rawToken) {
                await invite_service_1.NotificationService.sendInviteEmail(email, tenant?.name || 'Invify School', inviteLink);
            }
            const variantService = require('../config/build-variant').BuildVariantService.getInstance();
            return res.status(201).json({
                message: isNew ? 'Invite sent successfully' : 'Active invite already exists',
                inviteLink: variantService.isLocal() ? inviteLink : undefined // Dev-only leak
            });
        }
        catch (error) {
            console.error('[InviteController] sendInvite Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /public/invites/validate/:token
     * Validates invitation for the landing page.
     */
    static async validateInvite(req, res) {
        try {
            const { token } = req.params;
            const invite = await invite_service_1.InviteService.validateToken(token);
            return res.status(200).json({
                email: invite.email,
                schoolName: invite.tenants.name,
                role: invite.role
            });
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    /**
     * POST /public/invites/accept
     * Finalizes user activation after successfull Supabase signup.
     */
    static async acceptInvite(req, res) {
        try {
            const { token, userId, password } = req.body;
            // 1. Validate Token
            const invite = await invite_service_1.InviteService.validateToken(token);
            // 2. Atomically Create User record and consume invite
            const { error: userError } = await supabase_1.supabase
                .from('users')
                .insert({
                id: userId,
                tenant_id: invite.tenant_id,
                name: invite.email.split('@')[0], // Default name from email
                email: invite.email,
                role: invite.role
            });
            if (userError)
                throw userError;
            // 3. Mark Invite as Accepted
            await supabase_1.supabase
                .from('invites')
                .update({ status: 'accepted' })
                .eq('id', invite.id);
            return res.status(200).json({ message: 'Account activated successfully' });
        }
        catch (error) {
            console.error('[InviteController] acceptInvite Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.InviteController = InviteController;
//# sourceMappingURL=invite.controller.js.map