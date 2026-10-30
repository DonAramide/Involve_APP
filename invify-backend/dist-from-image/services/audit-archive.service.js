"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditArchiveService = void 0;
// src/services/audit-archive.service.ts
const supabase_1 = require("../db/supabase");
async function getGlobalSettings() {
    try {
        const { data, error } = await supabase_1.supabaseAdmin.from('system_configurations')
            .select('config_value')
            .eq('config_key', 'audit_retention_hours')
            .single();
        if (!error && data) {
            return { audit_retention_hours: parseInt(data.config_value, 10) };
        }
    }
    catch (dbErr) { }
    return { audit_retention_hours: 72 };
}
class AuditArchiveService {
    /**
     * Run the archival process. Logs older than configured X hours are shifted
     * to the database-backed audit_log_archive table and pruned from active databases.
     */
    static async runArchiving() {
        const settings = await getGlobalSettings();
        const retentionHours = settings.audit_retention_hours || 72;
        const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
        const cutoffIso = cutoffTime.toISOString();
        let archivedCount = 0;
        console.log(`[AuditArchive] Starting archival run. Cutoff time: ${cutoffIso} (Retention: ${retentionHours} hours)`);
        // 1. Archive online Supabase terminal logs if available
        try {
            const { data: onlineTermLogs, error: fetchErr } = await supabase_1.supabaseAdmin
                .from('terminal_audit_log')
                .select('*')
                .lt('created_at', cutoffIso);
            if (!fetchErr && onlineTermLogs && onlineTermLogs.length > 0) {
                // Map to archive format
                const archiveRows = onlineTermLogs.map(l => ({
                    original_log_id: l.id,
                    timestamp: l.created_at,
                    module: 'TERMINAL',
                    action: l.action_type,
                    user_email: l.admin_id || 'system',
                    user_name: null,
                    ip_address: l.ip_address || null,
                    location: null,
                    target: l.terminal_id || null,
                    status: 'SUCCESS',
                    metadata: {
                        mpos_terminal_id: l.mpos_terminal_id,
                        old_device_id: l.old_device_id,
                        new_device_id: l.new_device_id,
                        reason: l.reason,
                        ...(l.metadata || {})
                    },
                    tenant_id: null,
                    tenant_code: null,
                    source_origin: 'TERMINAL_AUDIT'
                }));
                // Insert into archive table
                const { error: insErr } = await supabase_1.supabaseAdmin.from('audit_log_archive').insert(archiveRows);
                if (insErr)
                    throw insErr;
                // Delete from active database
                const ids = onlineTermLogs.map(l => l.id);
                const { error: delErr } = await supabase_1.supabaseAdmin.from('terminal_audit_log').delete().in('id', ids);
                if (!delErr) {
                    archivedCount += onlineTermLogs.length;
                    console.log(`[AuditArchive] Archived ${onlineTermLogs.length} online terminal audit records.`);
                }
                else {
                    throw delErr;
                }
            }
        }
        catch (err) {
            console.error('[AuditArchive] Supabase terminal logs archival failed:', err.message);
        }
        // 2. Archive online Supabase general audit logs if available
        try {
            const { data: onlineGeneralLogs, error: fetchErr } = await supabase_1.supabaseAdmin
                .from('audit_logs')
                .select('*')
                .lt('timestamp', cutoffIso);
            if (!fetchErr && onlineGeneralLogs && onlineGeneralLogs.length > 0) {
                // Map to archive format
                const archiveRows = onlineGeneralLogs.map(l => ({
                    original_log_id: l.id,
                    timestamp: l.timestamp,
                    module: l.module,
                    action: l.action,
                    user_email: l.user_email,
                    user_name: l.user_name || null,
                    ip_address: l.ip_address || null,
                    location: l.location || null,
                    target: l.target || null,
                    status: l.status,
                    metadata: l.metadata || {},
                    tenant_id: l.tenant_id || null,
                    tenant_code: l.tenant_code || null,
                    source_origin: 'AUDIT_LOG'
                }));
                // Insert into archive table
                const { error: insErr } = await supabase_1.supabaseAdmin.from('audit_log_archive').insert(archiveRows);
                if (insErr)
                    throw insErr;
                const ids = onlineGeneralLogs.map(l => l.id);
                const { error: delErr } = await supabase_1.supabaseAdmin.from('audit_logs').delete().in('id', ids);
                if (!delErr) {
                    archivedCount += onlineGeneralLogs.length;
                    console.log(`[AuditArchive] Archived ${onlineGeneralLogs.length} online general audit records.`);
                }
                else {
                    throw delErr;
                }
            }
        }
        catch (err) {
            console.error('[AuditArchive] Supabase general logs archival failed:', err.message);
        }
        console.log(`[AuditArchive] Archival run complete. Shifted ${archivedCount} total entries to audit_log_archive table.`);
        return { archivedCount };
    }
}
exports.AuditArchiveService = AuditArchiveService;
//# sourceMappingURL=audit-archive.service.js.map