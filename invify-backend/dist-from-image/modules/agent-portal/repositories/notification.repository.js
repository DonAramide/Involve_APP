"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = exports.NotificationRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class NotificationRepository {
    async list(agentId, unreadOnly) {
        let q = supabase_1.supabase.from('agent_notifications').select('*').eq('agent_id', agentId);
        if (unreadOnly)
            q = q.eq('is_read', false);
        const { data, error } = await q;
        if (error)
            throw error;
        return data;
    }
    async markRead(id) {
        const { data, error } = await supabase_1.supabase.from('agent_notifications').update({ is_read: true, read_at: new Date() }).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    }
}
exports.NotificationRepository = NotificationRepository;
exports.notificationRepository = new NotificationRepository();
//# sourceMappingURL=notification.repository.js.map