import { supabase } from '../../../db/supabase';

export class AuditLogRepository {
  async listLogs(filters?: { entity_type?: string; actor_id?: string }) {
    let query = supabase.from('agent_audit_logs').select('*').order('created_at', { ascending: false });
    
    if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type);
    if (filters?.actor_id) query = query.eq('actor_id', filters.actor_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
export const auditLogRepository = new AuditLogRepository();
