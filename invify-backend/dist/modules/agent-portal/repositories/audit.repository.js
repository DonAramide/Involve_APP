"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogRepository = exports.AuditLogRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class AuditLogRepository {
    async listLogs(filters) {
        let query = supabase_1.supabase.from('agent_audit_logs').select('*').order('created_at', { ascending: false });
        if (filters?.entity_type)
            query = query.eq('entity_type', filters.entity_type);
        if (filters?.actor_id)
            query = query.eq('actor_id', filters.actor_id);
        const { data, error } = await query;
        if (error)
            throw error;
        return data;
    }
}
exports.AuditLogRepository = AuditLogRepository;
exports.auditLogRepository = new AuditLogRepository();
//# sourceMappingURL=audit.repository.js.map