"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
// src/services/audit.service.ts
const supabase_1 = require("../db/supabase");
/**
 * AuditService provides an immutable trail of financial events.
 * Rule: Logs are append-only. No updates or deletions allowed.
 */
class AuditService {
    /**
     * Records a financial event in the audit log.
     */
    static async log(params) {
        try {
            const { error } = await supabase_1.supabase
                .from('financial_audit_logs')
                .insert({
                event_type: params.eventType,
                reference: params.reference,
                tenant_id: params.tenantId,
                payload: params.payload
            });
            if (error) {
                console.error('[AuditService] Failed to record log:', error.message);
            }
        }
        catch (error) {
            console.error('[AuditService] Error:', error);
        }
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=audit.service.js.map