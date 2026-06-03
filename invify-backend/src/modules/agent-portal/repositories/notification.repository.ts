import { supabase } from '../../../db/supabase';
export class NotificationRepository {
  async list(agentId: string, unreadOnly: boolean) {
    let q = supabase.from('agent_notifications').select('*').eq('agent_id', agentId);
    if (unreadOnly) q = q.eq('is_read', false);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }
  async markRead(id: string) {
    const { data, error } = await supabase.from('agent_notifications').update({ is_read: true, read_at: new Date() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
export const notificationRepository = new NotificationRepository();