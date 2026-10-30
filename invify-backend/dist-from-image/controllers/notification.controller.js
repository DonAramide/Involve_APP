"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const supabase_1 = require("../db/supabase");
const tenant_alert_service_1 = require("../services/tenant-alert.service");
const finance_tenant_1 = require("../utils/finance-tenant");
class NotificationController {
    /**
     * GET /api/notifications
     * Fetches latest notifications for the user.
     */
    static async getNotifications(req, res) {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            const { data, error } = await supabase_1.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) {
                console.warn('[NotificationController] Fetch Error:', error.message);
                return res.status(200).json([]);
            }
            return res.status(200).json(data || []);
        }
        catch (error) {
            console.warn('[NotificationController] Fetch Error:', error?.message || error);
            return res.status(200).json([]);
        }
    }
    /**
     * POST /api/notifications/:id/read
     * Marks a notification as read.
     */
    static async markAsRead(req, res) {
        const { id } = req.params;
        const userId = req.user?.id;
        try {
            await supabase_1.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
                .eq('user_id', userId);
            return res.status(200).json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to update notification' });
        }
    }
    /**
     * POST /api/notifications/read-all
     * Marks all notifications as read for the user.
     */
    static async markAllAsRead(req, res) {
        const userId = req.user?.id;
        try {
            await supabase_1.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            return res.status(200).json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to update notifications' });
        }
    }
    static async getPreferences(req, res) {
        try {
            const tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            const prefs = await tenant_alert_service_1.TenantAlertService.getPrefs(tenantId);
            return res.status(200).json({ success: true, prefs });
        }
        catch (err) {
            return res.status(err?.status || 500).json({ error: err?.message || 'Failed to load preferences' });
        }
    }
    static async savePreferences(req, res) {
        try {
            const tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            const prefs = await tenant_alert_service_1.TenantAlertService.savePrefs(tenantId, req.body?.prefs || req.body || {});
            const userEmail = String(req.user?.email || '').trim();
            if (userEmail.includes('@')) {
                const { emailService } = require('../services/email.service');
                void emailService.sendTenantAlertEmail(userEmail, {
                    name: req.user?.name || userEmail.split('@')[0],
                    title: 'Notification preferences saved',
                    body: 'Your tenant alert preferences were saved. You will get email for the events you enabled (sales, withdrawals, low balance, and security).',
                });
            }
            return res.status(200).json({ success: true, prefs });
        }
        catch (err) {
            return res.status(err?.status || 500).json({ error: err?.message || 'Failed to save preferences' });
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map