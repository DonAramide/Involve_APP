"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalAuditService = void 0;
const supabase_1 = require("../db/supabase");
class TerminalAuditService {
    static async log(entry) {
        const record = {
            action_type: entry.actionType,
            terminal_id: entry.terminalId || null,
            mpos_terminal_id: entry.mposTerminalId || null,
            old_device_id: entry.oldDeviceId || null,
            new_device_id: entry.newDeviceId || null,
            admin_id: entry.adminId,
            reason: entry.reason || null,
            ip_address: entry.ipAddress || null,
            metadata: entry.metadata || {},
            created_at: new Date().toISOString(),
        };
        const { data, error } = await supabase_1.supabaseAdmin
            .from('terminal_audit_log')
            .insert(record)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async getAuditLog(filters = {}) {
        let query = supabase_1.supabase.from('terminal_audit_log').select('*', { count: 'exact' });
        if (filters.terminalId)
            query = query.eq('terminal_id', filters.terminalId);
        if (filters.actionType)
            query = query.eq('action_type', filters.actionType);
        const page = parseInt(filters.page || '1');
        const limit = parseInt(filters.limit || '50');
        const start = (page - 1) * limit;
        query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
        const { data, error, count } = await query;
        if (error)
            throw error;
        return { data: data || [], total: count || 0 };
    }
}
exports.TerminalAuditService = TerminalAuditService;
//# sourceMappingURL=terminal-audit.service.js.map