"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const supabase_1 = require("../db/supabase");
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
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[NotificationController] Fetch Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
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
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map