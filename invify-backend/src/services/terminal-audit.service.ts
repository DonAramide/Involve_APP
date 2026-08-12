import { supabase, supabaseAdmin } from '../db/supabase';

export class TerminalAuditService {

  static async log(entry: {
    actionType: string;
    terminalId?: string;
    mposTerminalId?: string;
    oldDeviceId?: string | null;
    newDeviceId?: string | null;
    adminId: string;
    adminName?: string;
    tenantId?: string | null;
    reason?: string;
    ipAddress?: string;
    metadata?: any;
  }) {
    const record = {
      action_type: entry.actionType,
      terminal_id: entry.terminalId || null,
      mpos_terminal_id: entry.mposTerminalId || null,
      old_device_id: entry.oldDeviceId || null,
      new_device_id: entry.newDeviceId || null,
      admin_id: entry.adminId,
      admin_name: entry.adminName || null,
      tenant_id: entry.tenantId || null,
      reason: entry.reason || null,
      ip_address: entry.ipAddress || null,
      metadata: {
        ...(entry.metadata || {}),
        ...(entry.tenantId ? { tenant_id: entry.tenantId } : {}),
        ...(entry.adminName ? { admin_name: entry.adminName } : {})
      },
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('terminal_audit_log')
      .insert(record)
      .select()
      .single();

    // If schema lacks tenant_id / admin_name columns, retry without them
    if (error && /tenant_id|admin_name/i.test(error.message || '')) {
      const { tenant_id, admin_name, ...legacy } = record as any;
      const retry = await supabaseAdmin
        .from('terminal_audit_log')
        .insert(legacy)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return retry.data;
    }

    if (error) throw error;
    return data;
  }

  static async getAuditLog(filters: any = {}) {
    let query = supabase.from('terminal_audit_log').select('*', { count: 'exact' });
    if (filters.terminalId) query = query.eq('terminal_id', filters.terminalId);
    if (filters.actionType) query = query.eq('action_type', filters.actionType);
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '50');
    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }
}
